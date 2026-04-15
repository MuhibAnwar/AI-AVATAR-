import { useState, useRef, useEffect, useCallback } from 'react';
import { UserButton, SignUpButton } from '@clerk/clerk-react';
import ChatPanel from './ChatPanel.jsx';
import MicVisualizer from './MicVisualizer.jsx';
import { useAudioRecorder } from '../hooks/useAudioRecorder.js';
import { useConversation } from '../hooks/useConversation.js';

const AVA_AVATAR = 'https://pub-1407f82391df4ab1951418d04be76914.r2.dev/uploads/a4d19b4b-1581-4959-8022-7f74727174c9.png';

// Status config
const STATUS_CONFIG = {
  idle:      { label: 'Ready',        color: '#6366f1', ring: 'rgba(99,102,241,0.4)',   bg: 'rgba(99,102,241,0.08)' },
  listening: { label: 'Listening…',   color: '#22c55e', ring: 'rgba(34,197,94,0.4)',    bg: 'rgba(34,197,94,0.06)'  },
  thinking:  { label: 'Thinking…',    color: '#eab308', ring: 'rgba(234,179,8,0.4)',    bg: 'rgba(234,179,8,0.06)'  },
  speaking:  { label: 'Speaking…',    color: '#a855f7', ring: 'rgba(168,85,247,0.45)',  bg: 'rgba(168,85,247,0.08)' },
  error:     { label: 'Try again',    color: '#ef4444', ring: 'rgba(239,68,68,0.4)',    bg: 'rgba(239,68,68,0.06)'  },
};

export default function CallScreen({ onEndCall, userId, user }) {
  const avatarSpeakRef = useRef(null);

  const [callState, setCallState]   = useState('connecting');
  const [isMuted, setIsMuted]       = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [permissionModal, setPermissionModal] = useState(null);
  const [autoMode, setAutoMode]     = useState(false);
  const [isOffline, setIsOffline]   = useState(!navigator.onLine);

  const { status, setStatus, messages, processAudio, endCall } = useConversation({ avatarRef: avatarSpeakRef, userId });

  // Cooldown: reject any audio that arrives within 2s of Ava finishing speech
  // (prevents mic from capturing Ava's own voice echo)
  const speakEndTimeRef = useRef(0);
  const prevStatusRef   = useRef(status);
  useEffect(() => {
    if (prevStatusRef.current === 'speaking' && status === 'listening') {
      speakEndTimeRef.current = Date.now();
    }
    prevStatusRef.current = status;
  }, [status]);

  const handleAudioReady = useCallback((blob, mime) => {
    if (Date.now() - speakEndTimeRef.current < 2000) return;
    processAudio(blob, mime);
  }, [processAudio]);

  // VAD auto-listen is active only when Ava is in 'listening' state and not muted
  const autoListenActive = autoMode && callState === 'active' && !isMuted && status === 'listening';

  const { isRecording, micStream, permissionError, startRecording, stopRecording } =
    useAudioRecorder({
      enabled:     callState === 'active' && !isMuted && status !== 'thinking' && status !== 'speaking',
      onAudioReady: handleAudioReady,
      autoListen:  autoListenActive,
    });

  useEffect(() => {
    avatarSpeakRef.current = {
      sendTalk:    (text) => speakWithBrowser(text, () => setStatus('listening')),
      closeStream: () => Promise.resolve(),
    };
    const t = setTimeout(() => {
      setCallState('active');
      setStatus('listening');
      playConnectChime();
    }, 900);
    return () => clearTimeout(t);
  }, [setStatus]);

  useEffect(() => { if (permissionError) setPermissionModal(permissionError); }, [permissionError]);

  // Network connectivity detection
  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline  = () => setIsOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online',  goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online',  goOnline);
    };
  }, []);

  const handleToggleMute = useCallback(() => {
    setIsMuted(m => !m);
    if (isRecording) stopRecording();
  }, [isRecording, stopRecording]);

  const handleEndCall = useCallback(() => {
    window.speechSynthesis?.cancel();
    endCall();
    onEndCall();
  }, [onEndCall, endCall]);

  const cfg        = STATUS_CONFIG[status] || STATUS_CONFIG.idle;
  const isActive   = callState === 'active';
  const isSpeaking = status === 'speaking';
  const isThinking = status === 'thinking';

  return (
    <div className="w-full h-full flex relative overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #150a30 0%, #04040f 65%)' }}>

      {/* ── Blobs ── */}
      <div className="bg-blobs">
        <div className="blob blob-1" style={{ opacity: 0.12 }} />
        <div className="blob blob-2" style={{ opacity: 0.1 }} />
      </div>

      {/* ── Grid ── */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)',
          backgroundSize: '72px 72px',
          maskImage: 'radial-gradient(ellipse at center,black 10%,transparent 70%)',
        }} />

      {/* ── Offline banner ── */}
      {isOffline && (
        <div className="absolute top-0 inset-x-0 z-50 flex items-center justify-center gap-2.5 px-4 py-2.5 anim-fade-in"
          style={{
            background: 'linear-gradient(90deg, rgba(239,68,68,0.18), rgba(239,68,68,0.12))',
            borderBottom: '1px solid rgba(239,68,68,0.3)',
            backdropFilter: 'blur(16px)',
          }}>
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0"
            style={{ boxShadow: '0 0 8px rgba(239,68,68,0.8)' }} />
          <span style={{ color: '#fca5a5', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.01em' }}>
            Ava is facing a connection problem — check your internet
          </span>
        </div>
      )}

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col relative z-10">

        {/* Top bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 pt-5 pb-3 shrink-0">
          <div className="flex items-center gap-2.5 select-none">
            <img src="/logo.png" alt="MeetAva" className="w-8 h-8 rounded-xl object-cover" draggable={false} />
            <span className="font-black text-sm tracking-wider" style={{ letterSpacing: '0.05em' }}>
              <span className="text-white">MEET</span>
              <span style={{ background: 'linear-gradient(135deg,#818cf8,#c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AVA</span>
            </span>
          </div>

          <CallTimer active={isActive} />

          <div className="flex items-center gap-2">
            {user ? (
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: 'w-8 h-8 ring-2 ring-indigo-500/40 ring-offset-2 ring-offset-transparent',
                  },
                }}
              />
            ) : (
              <SignUpButton mode="modal">
                <button
                  className="hidden sm:block px-2.5 py-1 rounded-full select-none active:scale-95 transition-transform"
                  style={{
                    background: 'linear-gradient(135deg,#6d28d9,#7c3aed)',
                    border: '1px solid rgba(124,58,237,0.4)',
                    color: '#fff',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    boxShadow: '0 0 12px rgba(124,58,237,0.3)',
                  }}
                >
                  Sign Up
                </button>
              </SignUpButton>
            )}
          <button onClick={() => setIsChatOpen(o => !o)}
            className="relative flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200"
            style={{
              background: isChatOpen ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.04)',
              border: isChatOpen ? '1px solid rgba(124,58,237,0.4)' : '1px solid rgba(255,255,255,0.07)',
              color: isChatOpen ? '#a78bfa' : '#64748b',
              fontSize: '0.75rem', fontWeight: 600,
            }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            {messages.length > 0 && (
              <span className="w-4 h-4 rounded-full text-white flex items-center justify-center font-bold"
                style={{ background: 'linear-gradient(135deg,#6d28d9,#a855f7)', fontSize: 9 }}>
                {messages.length}
              </span>
            )}
            <span className="hidden sm:inline">Chat</span>
          </button>
          </div>
        </div>

        {/* ── Center: Avatar + status ── */}
        <div className="flex-1 flex flex-col items-center justify-center gap-4 sm:gap-6 px-4 sm:px-6 min-h-0">

          {/* Avatar */}
          <div className="relative flex items-center justify-center"
            style={{ opacity: isActive ? 1 : 0, transition: 'opacity 1s ease' }}>

            {/* Large ambient glow */}
            <div className="absolute rounded-full transition-all duration-700"
              style={{
                width: 'clamp(220px, 80vw, 380px)', height: 'clamp(220px, 80vw, 380px)',
                background: `radial-gradient(circle, ${cfg.ring} 0%, transparent 65%)`,
                filter: 'blur(50px)',
              }} />

            {/* Pulse rings */}
            {(isSpeaking || status === 'listening') && (
              <>
                <div className="pulse-ring" style={{ inset: -36, border: `1.5px solid ${cfg.ring}`, animationDuration: '2.5s' }} />
                <div className="pulse-ring" style={{ inset: -36, border: `1px solid ${cfg.ring}`, animationDuration: '2.5s', animationDelay: '1.2s' }} />
              </>
            )}

            {/* Avatar ring */}
            <div
              className={`relative rounded-full transition-all duration-500 ${isSpeaking ? 'grad-ring grad-ring-fast' : 'grad-ring'}`}
              style={{ width: 'clamp(150px, 42vw, 220px)', height: 'clamp(150px, 42vw, 220px)', transform: isSpeaking ? 'scale(1.05)' : 'scale(1)' }}>
              <div className="w-full h-full rounded-full overflow-hidden"
                style={{ background: 'linear-gradient(135deg,#0d0720,#160d35)' }}>
                {callState === 'connecting' ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin"
                      style={{ borderColor: `${cfg.color} transparent transparent transparent` }} />
                  </div>
                ) : (
                  <img src={AVA_AVATAR} alt="Ava"
                    className={`w-full h-full object-cover select-none ${isSpeaking ? 'anim-breathe' : ''}`}
                    draggable={false} />
                )}
              </div>
            </div>
          </div>

          {/* Name + status */}
          <div className="flex flex-col items-center gap-3">
            <h2 className="text-white font-black select-none"
              style={{ fontSize: '2.2rem', letterSpacing: '-0.02em' }}>AVA</h2>

            <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-full transition-all duration-500"
              style={{
                background: cfg.bg,
                border: `1px solid ${cfg.ring}`,
                boxShadow: `0 0 20px ${cfg.ring}`,
              }}>
              {isThinking ? (
                <div className="flex gap-1.5 items-center">
                  <span className="dot" /><span className="dot" /><span className="dot" />
                </div>
              ) : (
                <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: cfg.color, boxShadow: `0 0 8px ${cfg.color}` }} />
              )}
              <span className="font-bold text-sm tracking-wide" style={{ color: cfg.color }}>{cfg.label}</span>
            </div>
          </div>

          {/* Speaking waveform */}
          {isSpeaking && (
            <div className="flex items-end justify-center gap-1.5 h-12 anim-fade-in">
              {[...Array(17)].map((_, i) => (
                <div key={i} className="wave-bar"
                  style={{
                    width: 3.5,
                    height: `${14 + Math.sin(i * 0.6) * 14}px`,
                    background: `linear-gradient(to top,#6d28d9,#a855f7,#ec4899)`,
                    animationDelay: `${i * 0.05}s`,
                    animationDuration: `${0.45 + (i % 5) * 0.12}s`,
                  }} />
              ))}
            </div>
          )}

          {/* Mic recording indicator */}
          {isRecording && !isMuted && (
            <div className="flex flex-col items-center gap-2 anim-fade-in">
              <MicVisualizer isRecording stream={micStream} />
              <span className="font-bold text-xs tracking-widest uppercase"
                style={{ color: '#4ade80', letterSpacing: '0.1em' }}>● Recording</span>
            </div>
          )}
        </div>

        {/* Hint text */}
        {isActive && !isRecording && status === 'listening' && (
          <div className="text-center pb-2 shrink-0">
            {autoMode
              ? <span className="font-semibold text-xs tracking-widest uppercase animate-pulse"
                  style={{ color: '#818cf8', letterSpacing: '0.1em' }}>● Auto Listening</span>
              : <span style={{ color: '#334155', fontSize: '0.75rem', fontWeight: 500 }}>
                  <span className="hidden sm:inline">Hold{' '}
                    <kbd style={{ padding: '2px 7px', borderRadius: 5, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#475569', fontFamily: 'monospace', fontSize: '0.7rem' }}>Space</kbd>
                    {' '}or tap mic to speak
                  </span>
                  <span className="sm:hidden">Tap &amp; hold mic to speak</span>
                </span>
            }
          </div>
        )}

        {/* ── Control dock ── */}
        <div className="shrink-0 px-4 sm:px-6 pb-8 pb-safe">
          <div className="mx-auto flex items-center justify-center gap-4 rounded-3xl px-7 py-5"
            style={{
              maxWidth: 400,
              background: 'rgba(255,255,255,0.035)',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(32px)',
              boxShadow: '0 32px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.07)',
            }}>

            {/* Mute */}
            <button onClick={handleToggleMute} title={isMuted ? 'Unmute' : 'Mute'} className="ctrl"
              style={{
                width: 54, height: 54,
                background: isMuted ? 'rgba(239,68,68,0.18)' : 'rgba(255,255,255,0.05)',
                border: isMuted ? '1.5px solid rgba(239,68,68,0.55)' : '1.5px solid rgba(255,255,255,0.09)',
                color: isMuted ? '#f87171' : '#64748b',
                boxShadow: isMuted ? '0 0 20px rgba(239,68,68,0.2)' : 'none',
              }}>
              {isMuted
                ? <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                : <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
              }
            </button>

            {/* Auto toggle */}
            <button onClick={() => setAutoMode(m => !m)} className="ctrl flex flex-col items-center gap-1"
              style={{
                width: 54, height: 54,
                background: autoMode ? 'rgba(124,58,237,0.18)' : 'rgba(255,255,255,0.05)',
                border: autoMode ? '1.5px solid rgba(124,58,237,0.55)' : '1.5px solid rgba(255,255,255,0.09)',
                color: autoMode ? '#a78bfa' : '#64748b',
                boxShadow: autoMode ? '0 0 20px rgba(124,58,237,0.25)' : 'none',
              }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
              <span style={{ fontSize: 7, fontWeight: 800, letterSpacing: '0.08em' }}>AUTO</span>
            </button>

            {/* Hold-to-talk (main) */}
            <button
              onPointerDown={startRecording} onPointerUp={stopRecording} onPointerLeave={stopRecording}
              disabled={isMuted || status === 'thinking' || status === 'speaking'}
              className="ctrl select-none disabled:opacity-35 disabled:cursor-not-allowed"
              style={{
                width: 82, height: 82,
                background: isRecording
                  ? 'linear-gradient(135deg,#16a34a,#22c55e)'
                  : 'linear-gradient(135deg,#6d28d9,#7c3aed,#9333ea)',
                boxShadow: isRecording
                  ? '0 0 40px rgba(34,197,94,0.55), 0 12px 30px rgba(0,0,0,0.4)'
                  : '0 0 40px rgba(124,58,237,0.55), 0 12px 30px rgba(0,0,0,0.4)',
                transform: isRecording ? 'scale(1.1)' : 'scale(1)',
                transition: 'transform 0.12s cubic-bezier(.22,.68,0,1.4), box-shadow 0.2s ease',
              }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            </button>

            {/* End call */}
            <button onClick={handleEndCall} className="ctrl"
              style={{
                width: 54, height: 54,
                background: 'rgba(239,68,68,0.12)',
                border: '1.5px solid rgba(239,68,68,0.35)',
                color: '#f87171',
              }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── Chat panel ── */}
      <div className="absolute inset-y-0 right-0 z-20">
        <ChatPanel messages={messages} isOpen={isChatOpen} onToggle={() => setIsChatOpen(o => !o)} />
      </div>

      {/* ── Permission modal ── */}
      {permissionModal && (
        <PermissionModal message={permissionModal} onClose={() => setPermissionModal(null)} />
      )}
    </div>
  );
}

/* ── Sub-components ── */
function CallTimer({ active }) {
  const [sec, setSec] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setSec(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [active]);
  const mm = String(Math.floor(sec / 60)).padStart(2, '0');
  const ss = String(sec % 60).padStart(2, '0');
  return (
    <div className="flex items-center gap-2 px-4 py-1.5 rounded-full"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"
        style={{ boxShadow: '0 0 6px rgba(239,68,68,0.6)' }} />
      <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.05em' }}>
        {mm}:{ss}
      </span>
    </div>
  );
}

function PermissionModal({ message, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(4,4,15,0.85)', backdropFilter: 'blur(16px)' }}>
      <div className="w-full max-w-sm rounded-3xl p-8 anim-scale-in"
        style={{
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(239,68,68,0.25)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 40px rgba(239,68,68,0.1)',
        }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-5"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>🎙</div>
        <h3 className="text-white font-black text-xl text-center mb-2" style={{ letterSpacing: '-0.01em' }}>Microphone Needed</h3>
        <p className="text-center leading-relaxed mb-7" style={{ color: '#64748b', fontSize: '0.9rem' }}>{message}</p>
        <button onClick={onClose}
          className="w-full py-3.5 rounded-2xl text-white font-bold transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(135deg,#6d28d9,#9333ea)', fontSize: '0.95rem' }}>Got it</button>
      </div>
    </div>
  );
}

function speakWithBrowser(text, onEnd) {
  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    if (!synth) { onEnd?.(); resolve(); return; }
    const done = () => { onEnd?.(); resolve(); };
    const doSpeak = () => {
      synth.cancel();
      const utt = new SpeechSynthesisUtterance(text);
      utt.rate = 1.05; utt.pitch = 1.1; utt.lang = 'en-US';
      const voices = synth.getVoices();
      const female = voices.find(v => /samantha|karen|zira|jenny|aria|victoria|moira/i.test(v.name));
      if (female) utt.voice = female;
      utt.onend = done; utt.onerror = done;
      synth.speak(utt);
    };
    synth.getVoices().length > 0 ? doSpeak() : (synth.addEventListener('voiceschanged', doSpeak, { once: true }), setTimeout(doSpeak, 500));
  });
}

function playConnectChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq; osc.type = 'sine';
      const t = ctx.currentTime + i * 0.13;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.1, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.start(t); osc.stop(t + 0.4);
    });
  } catch (_) {}
}
