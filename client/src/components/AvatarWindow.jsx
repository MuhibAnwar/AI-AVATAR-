import { forwardRef, useImperativeHandle, useRef, useState, useEffect, useCallback } from 'react';

/**
 * AvatarWindow — manages the D-ID WebRTC stream and avatar display.
 *
 * Exposes via ref:
 *   initStream()  → creates D-ID stream, negotiates WebRTC
 *   sendTalk(audioUrl) → sends lip-sync talk to D-ID
 *   closeStream() → tears down the session
 */
const AvatarWindow = forwardRef(function AvatarWindow({ status, onStreamReady, onTalkEnd }, ref) {
  const videoRef = useRef(null);
  const peerRef = useRef(null);
  const streamInfoRef = useRef(null); // { streamId, sessionId }
  const [streamState, setStreamState] = useState('idle'); // idle | connecting | ready | error
  const [fallbackMode, setFallbackMode] = useState(false);
  const fallbackAudioRef = useRef(null);

  // ── Public API exposed to parent via ref ──────────────────────────────────
  useImperativeHandle(ref, () => ({
    initStream,
    sendTalk,
    closeStream,
    playFallbackAudio,
  }));

  // ── Init D-ID WebRTC stream ───────────────────────────────────────────────
  const initStream = useCallback(async () => {
    try {
      setStreamState('connecting');

      // 1. Ask backend to create D-ID stream
      const createRes = await fetch('/api/animate/stream', { method: 'POST' });
      if (!createRes.ok) throw new Error(`Stream create failed: ${createRes.status}`);
      const { streamId, sessionId, offer, iceServers } = await createRes.json();

      streamInfoRef.current = { streamId, sessionId };

      // 2. Set up WebRTC peer connection
      const pc = new RTCPeerConnection({ iceServers: iceServers || [{ urls: 'stun:stun.l.google.com:19302' }] });
      peerRef.current = pc;

      // When D-ID sends video track → attach to video element
      pc.ontrack = (event) => {
        if (event.track.kind === 'video' && videoRef.current) {
          videoRef.current.srcObject = event.streams[0];
          setStreamState('ready');
          onStreamReady?.();
        }
      };

      // ICE candidate handler → relay to D-ID via backend
      pc.onicecandidate = async ({ candidate }) => {
        if (candidate && streamInfoRef.current) {
          try {
            await fetch('/api/animate/ice', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ streamId, sessionId, candidate }),
            });
          } catch (_) { /* non-fatal */ }
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          console.warn('[AvatarWindow] WebRTC connection dropped, switching to fallback');
          setFallbackMode(true);
          setStreamState('error');
        }
      };

      // 3. Set D-ID's offer as remote description
      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      // 4. Create SDP answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // 5. Send answer to D-ID via backend
      const sdpRes = await fetch('/api/animate/sdp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ streamId, sessionId, answer }),
      });
      if (!sdpRes.ok) throw new Error(`SDP exchange failed: ${sdpRes.status}`);

      console.log('[AvatarWindow] D-ID stream initialized');
    } catch (err) {
      console.error('[AvatarWindow] initStream error:', err.message);
      setFallbackMode(true);
      setStreamState('error');
      onStreamReady?.(); // proceed anyway (fallback)
    }
  }, [onStreamReady]);

  // ── Send talk task ────────────────────────────────────────────────────────
  const sendTalk = useCallback(async (text) => {
    // Always use browser speechSynthesis for audio — instant, no autoplay issues
    // Trigger D-ID in parallel for lip-sync visuals (best effort, muted video)
    if (!fallbackMode && streamInfoRef.current) {
      const { streamId, sessionId } = streamInfoRef.current;
      fetch('/api/animate/talk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ streamId, sessionId, text }),
      }).catch(() => {});
    }

    // Audio always via browser speech synthesis
    await speakWithBrowser(text, onTalkEnd);
  }, [fallbackMode, onTalkEnd]);

  // ── Fallback: browser Web Speech Synthesis ────────────────────────────────
  const playFallbackAudio = useCallback((text) => {
    return speakWithBrowser(text, onTalkEnd);
  }, [onTalkEnd]);

  // ── Close stream ──────────────────────────────────────────────────────────
  const closeStream = useCallback(async () => {
    peerRef.current?.close();
    peerRef.current = null;

    if (streamInfoRef.current) {
      const { streamId, sessionId } = streamInfoRef.current;
      streamInfoRef.current = null;
      try {
        await fetch('/api/animate/stream', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ streamId, sessionId }),
        });
      } catch (_) {}
    }

    if (videoRef.current) videoRef.current.srcObject = null;
    fallbackAudioRef.current?.pause();
    setStreamState('idle');
  }, []);

  useEffect(() => () => { closeStream(); }, [closeStream]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const isSpeaking = status === 'speaking';
  const isThinking = status === 'thinking';

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Outer gradient ring */}
      <div
        className={`relative rounded-[1.2rem] p-[2px] transition-all duration-500 ${
          isSpeaking
            ? 'avatar-ring avatar-ring-speaking'
            : isThinking
            ? 'avatar-ring opacity-70'
            : 'avatar-ring opacity-50'
        }`}
        style={{ width: '100%', height: '100%', maxWidth: '100%', maxHeight: '100%' }}
      >
        <div className="w-full h-full rounded-[1.1rem] overflow-hidden bg-dark-800 relative">
          {/* Always show CSS avatar as base layer */}
          <IdleAvatar
            state={streamState}
            isSpeaking={isSpeaking}
            isThinking={isThinking}
          />

          {/* D-ID WebRTC video on top when ready */}
          {!fallbackMode && (
            <video
              ref={videoRef}
              className="avatar-video absolute inset-0"
              autoPlay
              playsInline
              muted
              style={{ display: streamState === 'ready' ? 'block' : 'none' }}
            />
          )}

          {/* Speaking waveform overlay */}
          {isSpeaking && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-end gap-1 pointer-events-none">
              {[...Array(9)].map((_, i) => (
                <div
                  key={i}
                  className="wave-bar animate-wave"
                  style={{
                    height: `${Math.random() * 20 + 10}px`,
                    animationDelay: `${i * 0.07}s`,
                    animationDuration: `${0.8 + Math.random() * 0.5}s`,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

// Full-screen avatar with face image + speaking/idle animations
function IdleAvatar({ state, isSpeaking, isThinking }) {
  const avatarUrl = 'https://pub-1407f82391df4ab1951418d04be76914.r2.dev/uploads/a4d19b4b-1581-4959-8022-7f74727174c9.png';

  return (
    <div
      className="w-full h-full relative overflow-hidden flex flex-col items-center justify-end pb-8"
      style={{ background: 'linear-gradient(180deg, #0f0f1a 0%, #1a1040 50%, #0f1a2e 100%)' }}
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isSpeaking
            ? 'radial-gradient(ellipse at 50% 60%, rgba(99,102,241,0.25) 0%, transparent 70%)'
            : 'radial-gradient(ellipse at 50% 60%, rgba(99,102,241,0.1) 0%, transparent 70%)',
          transition: 'background 0.5s ease',
        }}
      />

      {/* Avatar image — fills most of the frame */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ paddingBottom: '60px' }}
      >
        <div
          className={`relative transition-transform duration-300 ${isSpeaking ? 'scale-[1.02]' : 'scale-100'}`}
          style={{ width: '72%', maxWidth: '320px' }}
        >
          {/* Glow ring behind avatar when speaking */}
          {isSpeaking && (
            <div
              className="absolute inset-0 rounded-full animate-ring-pulse"
              style={{
                background: 'radial-gradient(circle, rgba(99,102,241,0.4) 0%, transparent 70%)',
                transform: 'scale(1.3)',
              }}
            />
          )}

          {/* The face */}
          <img
            src={avatarUrl}
            alt="Ava"
            className={`w-full h-auto select-none ${isSpeaking ? 'animate-breathe' : ''}`}
            style={{ filter: 'drop-shadow(0 20px 60px rgba(99,102,241,0.4))' }}
            draggable={false}
          />

          {/* Mouth / speaking animation bars overlay at chin level */}
          {isSpeaking && (
            <div
              className="absolute flex items-end justify-center gap-[3px]"
              style={{ bottom: '18%', left: '50%', transform: 'translateX(-50%)' }}
            >
              {[...Array(7)].map((_, i) => (
                <div
                  key={i}
                  className="rounded-full animate-wave"
                  style={{
                    width: '4px',
                    height: `${10 + Math.sin(i) * 6}px`,
                    background: 'rgba(255,255,255,0.85)',
                    animationDelay: `${i * 0.08}s`,
                    animationDuration: `${0.5 + (i % 3) * 0.15}s`,
                  }}
                />
              ))}
            </div>
          )}

          {/* Thinking dots overlay */}
          {isThinking && (
            <div
              className="absolute flex gap-2"
              style={{ bottom: '22%', left: '50%', transform: 'translateX(-50%)' }}
            >
              <span className="dot-flashing" />
              <span className="dot-flashing" />
              <span className="dot-flashing" />
            </div>
          )}
        </div>
      </div>

      {/* Name + status at bottom */}
      <div className="relative z-10 flex flex-col items-center gap-1">
        <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm px-4 py-1.5 rounded-full">
          <span
            className={`w-2 h-2 rounded-full ${
              isSpeaking ? 'bg-purple-400 animate-pulse' :
              isThinking ? 'bg-yellow-400 animate-pulse' :
              'bg-green-400'
            }`}
          />
          <span className="text-white text-sm font-semibold tracking-wide">Ava</span>
        </div>
        {state === 'connecting' && (
          <p className="text-gray-400 text-xs animate-pulse">Connecting...</p>
        )}
      </div>
    </div>
  );
}

// Browser Web Speech Synthesis — prefers female voice, always falls back
function speakWithBrowser(text, onTalkEnd) {
  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    const done = () => { onTalkEnd?.(); resolve(); };
    if (!synth) { done(); return; }

    const doSpeak = () => {
      synth.cancel();
      // Chrome bug: speak() called immediately after cancel() is silently dropped
      setTimeout(() => {
        const utt = new SpeechSynthesisUtterance(text);
        utt.rate = 1.05; utt.pitch = 1.1; utt.lang = 'en-US';
        const voices = synth.getVoices();
        const female = voices.find(v => /samantha|karen|zira|jenny|aria|victoria|moira/i.test(v.name));
        if (female) utt.voice = female;

        // Chrome silently cuts off utterances > ~15s — keep synthesis alive
        const keepAlive = setInterval(() => {
          if (!synth.speaking) { clearInterval(keepAlive); return; }
          synth.pause();
          synth.resume();
        }, 10_000);
        utt.onend = () => { clearInterval(keepAlive); done(); };
        utt.onerror = () => { clearInterval(keepAlive); done(); };

        synth.speak(utt);
      }, 50);
    };

    if (synth.getVoices().length > 0) {
      doSpeak();
    } else {
      // Guard against both voiceschanged and setTimeout firing doSpeak
      let called = false;
      const once = () => { if (!called) { called = true; doSpeak(); } };
      synth.addEventListener('voiceschanged', once, { once: true });
      setTimeout(once, 500);
    }
  });
}

export default AvatarWindow;
