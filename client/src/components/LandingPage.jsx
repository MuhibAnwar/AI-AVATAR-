import { useEffect, useState } from 'react';

const AVA_AVATAR = 'https://pub-1407f82391df4ab1951418d04be76914.r2.dev/uploads/a4d19b4b-1581-4959-8022-7f74727174c9.png';

export default function LandingPage({ onStartCall, onOpenHistory, userName }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 80); return () => clearTimeout(t); }, []);

  return (
    <div className="w-full h-full relative flex flex-col items-center justify-center"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #1a0a3e 0%, #04040f 60%)', overflowY: 'auto', overflowX: 'hidden' }}>

      {/* ── Blobs ── */}
      <div className="bg-blobs">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
      </div>

      {/* ── Grid lines ── */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.04) 1px,transparent 1px)',
          backgroundSize: '72px 72px',
          maskImage: 'radial-gradient(ellipse at center,black 20%,transparent 75%)',
        }} />

      {/* ── Content ── */}
      <div className={`relative z-10 flex flex-col items-center text-center px-6 py-8 transition-all duration-700 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>

        {/* Status badge */}
        <div className="flex items-center gap-2 mb-5 px-4 py-1.5 rounded-full text-xs font-semibold"
          style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.3)', color: '#a78bfa', letterSpacing: '0.1em' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live · AI Voice Companion
        </div>

        {/* Avatar */}
        <div className="relative mb-7">
          {/* Ambient glow */}
          <div className="absolute inset-0 rounded-full"
            style={{ background: 'radial-gradient(circle,rgba(124,58,237,0.5) 0%,transparent 65%)', transform: 'scale(2)', filter: 'blur(40px)' }} />

          {/* Outer spin ring */}
          <div className="absolute rounded-full"
            style={{ inset: -14, background: 'conic-gradient(from 0deg,transparent 60%,#6366f1,#a855f7,#ec4899,#6366f1,transparent 100%)', borderRadius: '50%', animation: 'spinRing 4s linear infinite' }} />

          {/* Pulse rings */}
          <div className="pulse-ring" style={{ inset: -24, border: '1.5px solid rgba(124,58,237,0.35)', animationDelay: '0s' }} />
          <div className="pulse-ring" style={{ inset: -24, border: '1px solid rgba(168,85,247,0.2)', animationDelay: '1.4s' }} />

          {/* Avatar circle — shrinks on short screens */}
          <div className="grad-ring relative anim-breathe"
            style={{ width: 'clamp(130px, 22vh, 180px)', height: 'clamp(130px, 22vh, 180px)' }}>
            <div className="w-full h-full rounded-full overflow-hidden"
              style={{ background: 'linear-gradient(135deg,#0d0720,#160d35)' }}>
              <img src={AVA_AVATAR} alt="Ava" className="w-full h-full object-cover select-none" draggable={false} />
            </div>
          </div>
        </div>

        {/* Headline */}
        <h1 className="font-black leading-none mb-2 select-none"
          style={{ fontSize: 'clamp(2.8rem, 9vw, 5.5rem)', letterSpacing: '-0.03em' }}>
          <span className="text-white">MEET </span>
          <span className="gradient-text">AVA</span>
        </h1>

        <p className="mb-7 font-medium select-none"
          style={{ fontSize: '1rem', color: '#94a3b8', maxWidth: 320, lineHeight: 1.6 }}>
          {userName
            ? <span style={{ color: '#c4b5fd', fontWeight: 700 }}>Welcome back, {userName}.</span>
            : 'Your intelligent AI voice companion. Speak naturally — Ava listens, thinks, and responds.'}
        </p>

        {/* Start Call CTA */}
        <button
          onClick={onStartCall}
          className="cta-glow flex items-center gap-3 mb-3 select-none active:scale-95 transition-transform duration-100"
          style={{
            background: 'linear-gradient(135deg,#6d28d9,#7c3aed,#9333ea)',
            padding: '14px 36px', borderRadius: 16,
            fontSize: '1rem', fontWeight: 800, color: '#fff',
            letterSpacing: '0.01em',
          }}>
          <span className="relative flex w-3 h-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-50" />
            <span className="relative inline-flex rounded-full w-3 h-3 bg-white" />
          </span>
          Start Voice Call
        </button>

        {/* History */}
        <button
          onClick={onOpenHistory}
          className="flex items-center gap-2 mb-6 select-none transition-all duration-200 hover:text-white"
          style={{
            padding: '9px 20px', borderRadius: 12,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.09)',
            fontSize: '0.85rem', fontWeight: 600, color: '#64748b',
          }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          Call History
        </button>

        {/* Hint */}
        <p style={{ color: '#334155', fontSize: '0.72rem', fontWeight: 500 }}>
          <span className="hidden sm:inline">
            Hold{' '}
            <kbd style={{
              padding: '2px 7px', borderRadius: 5, fontFamily: 'monospace',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#475569', fontSize: '0.7rem',
            }}>Space</kbd>
            {' '}or tap the mic to speak
          </span>
          <span className="sm:hidden">Tap &amp; hold the mic to speak</span>
        </p>
      </div>
    </div>
  );
}
