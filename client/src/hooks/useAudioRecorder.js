import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * useAudioRecorder
 *
 * Two modes:
 *   Push-to-talk (autoListen=false): hold Space / tap mic button → record → release → send
 *   Auto-listen  (autoListen=true):  VAD loop — waits for voice, records until silence, sends, repeats
 *
 * Returns: isRecording, micStream, permissionError, startRecording, stopRecording
 */
export function useAudioRecorder({ onAudioReady, enabled = true, autoListen = false }) {
  const [isRecording, setIsRecording] = useState(false);
  const [micStream, setMicStream]     = useState(null);
  const [permissionError, setPermissionError] = useState(null);

  const mediaRecorderRef    = useRef(null);
  const chunksRef           = useRef([]);
  const streamRef           = useRef(null);
  const isRecordingRef      = useRef(false);
  const audioCtxRef         = useRef(null);
  const vadActiveRef        = useRef(false);

  // ── Acquire mic stream (cached) ────────────────────────────────────────────
  const ensureStream = useCallback(async () => {
    if (streamRef.current) return streamRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      setMicStream(stream);
      setPermissionError(null);
      return stream;
    } catch (err) {
      const msg = err.name === 'NotAllowedError'
        ? 'Microphone permission denied. Please allow mic access and refresh.'
        : `Could not access microphone: ${err.message}`;
      setPermissionError(msg);
      throw new Error(msg);
    }
  }, []);

  // ── Internal: start MediaRecorder on an already-open stream ───────────────
  const startMediaRecorder = useCallback((stream) => {
    if (isRecordingRef.current) return;
    chunksRef.current = [];
    const mimeType = getSupportedMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});

    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
      chunksRef.current = [];
      if (blob.size > 6000) onAudioReady?.(blob, mimeType || 'audio/webm');
    };

    recorder.start(100);
    mediaRecorderRef.current = recorder;
    isRecordingRef.current   = true;
    setIsRecording(true);
  }, [onAudioReady]);

  // ── Internal: stop MediaRecorder ──────────────────────────────────────────
  const stopMediaRecorder = useCallback(() => {
    if (!isRecordingRef.current) return;
    isRecordingRef.current = false;
    setIsRecording(false);
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== 'inactive') rec.stop();
  }, []);

  // ── Public stopRecording (used by push-to-talk + mute button) ─────────────
  const stopRecording = useCallback(() => {
    stopMediaRecorder();
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
  }, [stopMediaRecorder]);

  // ── Public startRecording (push-to-talk only) ─────────────────────────────
  const startRecording = useCallback(async () => {
    if (isRecordingRef.current || !enabled || autoListen) return;
    try {
      const stream = await ensureStream();
      startMediaRecorder(stream);
    } catch (err) {
      console.error('[Recorder] Start error:', err.message);
    }
  }, [enabled, autoListen, ensureStream, startMediaRecorder]);

  // ── VAD auto-listen loop ───────────────────────────────────────────────────
  useEffect(() => {
    if (!autoListen || !enabled) {
      vadActiveRef.current = false;
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
      stopMediaRecorder();
      return;
    }

    vadActiveRef.current = true;
    let cancelled = false;

    async function runVAD() {
      let stream;
      try { stream = await ensureStream(); } catch { return; }
      if (cancelled) return;

      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;

      const source  = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);

      const dataArray = new Float32Array(analyser.fftSize);

      // Tuned thresholds
      const SPEECH_THRESHOLD  = 0.045; // RMS to start detecting speech
      const SILENCE_THRESHOLD = 0.012; // RMS below which = silence
      const SPEECH_CONFIRM_MS = 200;   // speech must persist this long before recording starts
      const SILENCE_MS        = 2500;  // silence this long after speech = done talking

      // States: 'waiting' → 'confirming' → 'recording'
      let phase       = 'waiting';
      let phaseStart  = null;
      let silenceStart = null;

      const loop = () => {
        if (cancelled || !vadActiveRef.current) {
          if (isRecordingRef.current) stopMediaRecorder();
          return;
        }

        analyser.getFloatTimeDomainData(dataArray);
        const rms = Math.sqrt(dataArray.reduce((s, v) => s + v * v, 0) / dataArray.length);

        if (phase === 'waiting') {
          // Wait for voice energy to appear
          if (rms >= SPEECH_THRESHOLD) {
            phase = 'confirming';
            phaseStart = Date.now();
          }

        } else if (phase === 'confirming') {
          // Require sustained speech (filters noise spikes)
          if (rms >= SPEECH_THRESHOLD) {
            if (Date.now() - phaseStart >= SPEECH_CONFIRM_MS) {
              phase = 'recording';
              silenceStart = null;
              startMediaRecorder(stream);
            }
          } else {
            // Dropped out — was just a noise spike
            phase = 'waiting';
            phaseStart = null;
          }

        } else if (phase === 'recording') {
          // Keep recording until sustained silence
          if (rms < SILENCE_THRESHOLD) {
            if (!silenceStart) silenceStart = Date.now();
            else if (Date.now() - silenceStart >= SILENCE_MS) {
              stopMediaRecorder();
              phase = 'waiting';
              silenceStart = null;
              phaseStart = null;
            }
          } else {
            silenceStart = null; // user still talking
          }
        }

        requestAnimationFrame(loop);
      };

      requestAnimationFrame(loop);
    }

    runVAD().catch(console.error);

    return () => {
      cancelled = true;
      vadActiveRef.current = false;
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
      if (isRecordingRef.current) stopMediaRecorder();
    };
  }, [autoListen, enabled, ensureStream, startMediaRecorder, stopMediaRecorder]);

  // ── Spacebar push-to-talk (disabled in auto-listen mode) ──────────────────
  useEffect(() => {
    if (!enabled || autoListen) return;

    const onKeyDown = (e) => {
      if (e.code === 'Space' && !e.repeat && !isRecordingRef.current) {
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
        e.preventDefault();
        startRecording();
      }
    };
    const onKeyUp = (e) => {
      if (e.code === 'Space') { e.preventDefault(); stopRecording(); }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [enabled, autoListen, startRecording, stopRecording]);

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => { streamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, []);

  return { isRecording, micStream, permissionError, startRecording, stopRecording };
}

function getSupportedMimeType() {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) || '';
}
