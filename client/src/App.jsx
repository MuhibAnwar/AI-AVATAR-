import { useState, useCallback, useEffect, useRef } from 'react';
import { useUser, UserButton, SignInButton, SignUpButton } from '@clerk/clerk-react';
import LandingPage from './components/LandingPage.jsx';
import CallScreen from './components/CallScreen.jsx';
import CallHistoryPage from './components/CallHistoryPage.jsx';

const GUEST_LIMIT_MS = 3.5 * 60 * 1000; // 3.5 minutes

export default function App() {
  const [screen, setScreen]             = useState('landing');
  const [showGuestModal, setShowGuestModal] = useState(false);
  const { user, isLoaded }              = useUser();

  const sessionStartRef = useRef(Date.now());
  const timerRef        = useRef(null);

  // Start 7-minute countdown for guests; clear it when they log in
  useEffect(() => {
    if (!isLoaded) return;

    if (user) {
      clearTimeout(timerRef.current);
      setShowGuestModal(false);
      return;
    }

    const elapsed   = Date.now() - sessionStartRef.current;
    const remaining = Math.max(GUEST_LIMIT_MS - elapsed, 0);

    timerRef.current = setTimeout(() => setShowGuestModal(true), remaining);
    return () => clearTimeout(timerRef.current);
  }, [isLoaded, user]);

  const handleStartCall   = useCallback(() => setScreen('call'), []);
  const handleEndCall     = useCallback(() => setScreen('landing'), []);
  const handleOpenHistory = useCallback(() => setScreen('history'), []);
  const handleBackToHome  = useCallback(() => setScreen('landing'), []);

  if (!isLoaded) return null;

  return (
    <div className="w-full h-full relative">

      {/* User button — visible when signed in, but not on call screen (overlaps chat button) */}
      {user && screen !== 'call' && (
        <div className="absolute top-4 right-4 z-50">
          <UserButton
            appearance={{
              elements: {
                avatarBox: 'w-9 h-9 ring-2 ring-indigo-500/40 ring-offset-2 ring-offset-transparent',
              },
            }}
          />
        </div>
      )}

      {/* Guest sign-in pill — hidden on call screen (top bar has no room) */}
      {!user && screen !== 'call' && (
        <div className="absolute top-4 right-4 z-50 flex items-center gap-1.5 anim-fade-in">
          <SignInButton mode="modal">
            <button
              className="hidden sm:flex items-center px-3 py-1.5 rounded-full transition-all duration-200 active:scale-95 select-none"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#94a3b8',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              Sign In
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button
              className="flex items-center px-3 py-1.5 rounded-full transition-all duration-200 active:scale-95 select-none"
              style={{
                background: 'linear-gradient(135deg,#6d28d9,#7c3aed)',
                border: '1px solid rgba(124,58,237,0.4)',
                color: '#fff',
                fontSize: '0.75rem',
                fontWeight: 700,
                boxShadow: '0 0 16px rgba(124,58,237,0.35)',
              }}
            >
              Sign Up
            </button>
          </SignUpButton>
        </div>
      )}

      {screen === 'landing' && (
        <LandingPage onStartCall={handleStartCall} onOpenHistory={handleOpenHistory} userName={user?.firstName} />
      )}
      {screen === 'call' && (
        <CallScreen onEndCall={handleEndCall} userId={user?.id} user={user} />
      )}
      {screen === 'history' && (
        <CallHistoryPage userId={user?.id} onBack={handleBackToHome} />
      )}

      {/* 7-minute guest prompt */}
      {showGuestModal && !user && (
        <GuestPromptModal onDismiss={() => setShowGuestModal(false)} />
      )}
    </div>
  );
}

function GuestPromptModal({ onDismiss }) {
  const AVA_AVATAR = 'https://pub-1407f82391df4ab1951418d04be76914.r2.dev/uploads/a4d19b4b-1581-4959-8022-7f74727174c9.png';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(4,4,15,0.88)', backdropFilter: 'blur(20px)' }}>
      <div className="w-full max-w-sm rounded-3xl p-8 flex flex-col items-center text-center gap-6 anim-scale-in"
        style={{
          background: 'linear-gradient(145deg,rgba(124,58,237,0.08),rgba(255,255,255,0.02))',
          border: '1px solid rgba(124,58,237,0.2)',
          boxShadow: '0 40px 100px rgba(0,0,0,0.7), 0 0 80px rgba(124,58,237,0.12)',
        }}>

        {/* Avatar */}
        <div className="relative">
          <div className="absolute inset-0 rounded-full opacity-50"
            style={{ background: 'conic-gradient(#6d28d9,#a855f7,#ec4899,#6d28d9)', transform: 'scale(1.35)', filter: 'blur(8px)', animation: 'spinRing 6s linear infinite' }} />
          <div className="relative rounded-full" style={{ width: 84, height: 84, background: 'linear-gradient(135deg,#6d28d9,#a855f7,#ec4899)', padding: 3 }}>
            <div className="w-full h-full rounded-full overflow-hidden" style={{ background: '#0d0720' }}>
              <img src={AVA_AVATAR} alt="Ava" className="w-full h-full object-cover select-none" draggable={false} />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <h2 className="text-white font-black" style={{ fontSize: '1.6rem', letterSpacing: '-0.02em' }}>
            Enjoying MeetAva?
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.65, maxWidth: 280, margin: '0 auto' }}>
            You've been chatting for a few minutes. Create a free account to continue and save your full history.
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <SignUpButton mode="modal">
            <button className="w-full py-4 rounded-2xl text-white font-black text-sm active:scale-95 transition-transform select-none"
              style={{ background: 'linear-gradient(135deg,#6d28d9,#7c3aed,#9333ea)', boxShadow: '0 0 40px rgba(124,58,237,0.5)', letterSpacing: '0.01em' }}>
              Create Free Account
            </button>
          </SignUpButton>
          <SignInButton mode="modal">
            <button className="w-full py-4 rounded-2xl text-white font-bold text-sm active:scale-95 transition-transform select-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', letterSpacing: '0.01em' }}>
              Sign In
            </button>
          </SignInButton>
        </div>

        <button onClick={onDismiss}
          className="transition-colors select-none"
          style={{ color: '#334155', fontSize: '0.78rem', fontWeight: 500 }}>
          Maybe later
        </button>
      </div>
    </div>
  );
}
