import { SignInButton, SignUpButton } from '@clerk/clerk-react';

const AVA_AVATAR = 'https://pub-1407f82391df4ab1951418d04be76914.r2.dev/uploads/a4d19b4b-1581-4959-8022-7f74727174c9.png';

export default function AuthPage() {
  return (
    <div
      className="w-full h-full relative flex flex-col items-center justify-center overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #070711 0%, #0d0d1f 50%, #070711 100%)' }}
    >
      {/* Background blobs */}
      <div className="bg-blobs">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
      </div>

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-8 w-full px-6 text-center">

        {/* Avatar */}
        <div className="relative">
          <div className="absolute inset-0 rounded-full opacity-30"
            style={{ background: 'conic-gradient(#6366f1,#a855f7,#ec4899,#6366f1)', transform: 'scale(1.3)', filter: 'blur(4px)', animation: 'spinRing 8s linear infinite' }} />
          <div
            className="relative rounded-full anim-breathe"
            style={{ width: 100, height: 100, background: 'linear-gradient(135deg,#6366f1,#a855f7,#ec4899)', padding: 3 }}
          >
            <div className="w-full h-full rounded-full overflow-hidden" style={{ background: '#1a1040' }}>
              <img src={AVA_AVATAR} alt="Ava" className="w-full h-full object-cover select-none" draggable={false} />
            </div>
          </div>
        </div>

        {/* Headline */}
        <div className="flex flex-col gap-2">
          <h1 className="text-5xl font-bold tracking-tight leading-none">
            <span className="text-white">Meet </span>
            <span style={{ background: 'linear-gradient(135deg,#818cf8,#c084fc,#f472b6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Ava
            </span>
          </h1>
          <p className="text-gray-400 text-lg font-light max-w-xs mx-auto leading-relaxed">
            Your intelligent AI voice companion. Sign in to start talking.
          </p>
        </div>

        {/* Auth buttons */}
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <SignInButton mode="modal">
            <button
              className="w-full py-3.5 rounded-2xl text-white font-semibold text-base transition-opacity hover:opacity-90 active:scale-95 select-none"
              style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)', boxShadow: '0 0 30px rgba(99,102,241,0.4)' }}
            >
              Sign In
            </button>
          </SignInButton>

          <SignUpButton mode="modal">
            <button
              className="w-full py-3.5 rounded-2xl text-white font-semibold text-base transition-all hover:bg-white/10 active:scale-95 select-none glass"
            >
              Create Account
            </button>
          </SignUpButton>
        </div>

        {/* Feature pills */}
        <div className="flex items-center gap-3 flex-wrap justify-center">
          {['Voice AI', 'Live Transcript', 'Natural Speech'].map(f => (
            <span key={f} className="glass px-3 py-1 rounded-full text-xs text-gray-400">
              {f}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
