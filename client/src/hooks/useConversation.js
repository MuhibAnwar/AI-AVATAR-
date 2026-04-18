import { useState, useCallback, useRef } from 'react';

/**
 * useConversation
 *
 * Orchestrates the full AI voice conversation pipeline:
 * audio blob → transcribe → Claude chat → ElevenLabs TTS → D-ID animate
 *
 * Returns:
 *   status      — 'idle' | 'listening' | 'thinking' | 'speaking' | 'error'
 *   messages    — { role, content }[]
 *   sessionId   — string (stable for session lifetime)
 *   processAudio(blob, mimeType) — triggers the full pipeline
 *   setStatus   — allow parent to switch to 'listening' etc.
 *   clearHistory()
 */
export function useConversation({ avatarRef, userId }) {
  const [status, setStatus] = useState('idle');
  const [messages, setMessages] = useState([]);
  const sessionIdRef = useRef(generateSessionId());

  const addMessage = useCallback((role, content) => {
    setMessages((prev) => [...prev, { role, content }]);
  }, []);

  // ── Main pipeline ──────────────────────────────────────────────────────────
  const processAudio = useCallback(async (audioBlob, mimeType) => {
    // Ignore if already processing
    if (status === 'thinking' || status === 'speaking') return;

    try {
      setStatus('thinking');

      // ── Step 1: Transcribe audio via Whisper ────────────────────────────
      const formData = new FormData();
      formData.append('audio', audioBlob, `audio.${mimeTypeToExt(mimeType)}`);

      const transcribeRes = await apiFetch('/api/transcribe', { method: 'POST', body: formData });
      const { text } = transcribeRes;

      if (!text?.trim()) {
        console.log('[Conversation] No speech detected, returning to listening');
        setStatus('listening');
        return;
      }

      console.log(`[Conversation] Transcribed: "${text}"`);
      addMessage('user', text.trim());

      // ── Step 2: Claude AI response ──────────────────────────────────────
      const chatRes = await apiFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim(), sessionId: sessionIdRef.current, userId: userId || null }),
      });
      const { response: aiText } = chatRes;

      console.log(`[Conversation] Ava: "${aiText.substring(0, 80)}..."`);
      addMessage('assistant', aiText);

      // ── Step 3: D-ID animation with built-in TTS (no ElevenLabs needed) ─
      setStatus('speaking');

      if (avatarRef?.current) {
        await avatarRef.current.sendTalk(aiText);
      } else {
        await speakWithBrowser(aiText);
      }

      setStatus('listening');
    } catch (err) {
      console.error('[Conversation] Pipeline error:', err.message);
      setStatus('listening');
    }
  }, [status, addMessage, avatarRef]);

  const endCall = useCallback(async () => {
    try {
      await fetch(`/api/history/${sessionIdRef.current}/end`, { method: 'PATCH' });
    } catch (_) {}
  }, []);

  const clearHistory = useCallback(async () => {
    const sid = sessionIdRef.current;
    setMessages([]);
    try {
      await fetch(`/api/chat/${sid}`, { method: 'DELETE' });
    } catch (_) {}
    sessionIdRef.current = generateSessionId();
  }, []);

  return {
    status,
    setStatus,
    messages,
    sessionId: sessionIdRef.current,
    processAudio,
    clearHistory,
    endCall,
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

// Browser Web Speech Synthesis — free, no API key
function speakWithBrowser(text) {
  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    if (!synth) { resolve(); return; }

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
        utt.onend = () => { clearInterval(keepAlive); resolve(); };
        utt.onerror = () => { clearInterval(keepAlive); resolve(); };

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

async function apiFetch(url, options = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(tid);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    return res.json();
  } catch (err) {
    clearTimeout(tid);
    if (err.name === 'AbortError') throw new Error('Request timed out — Ava is waking up, please try again.');
    throw err;
  }
}


function mimeTypeToExt(mimeType = '') {
  if (mimeType.includes('webm')) return 'webm';
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('mp4')) return 'mp4';
  if (mimeType.includes('wav')) return 'wav';
  return 'webm';
}

function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
