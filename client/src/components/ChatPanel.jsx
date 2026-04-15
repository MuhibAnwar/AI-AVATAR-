import { useEffect, useRef } from 'react';

/**
 * ChatPanel — collapsible right-side conversation transcript.
 */
export default function ChatPanel({ messages, isOpen, onToggle }) {
  const bottomRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  return (
    <>
      {/* Toggle tab — hidden on mobile when open (close button used instead) */}
      <button
        onClick={onToggle}
        className={`absolute right-0 top-1/2 -translate-y-1/2 z-20 w-7 h-20 glass rounded-l-xl flex-col items-center justify-center gap-1 hover:bg-white/10 transition-colors duration-200 ${isOpen ? 'hidden sm:flex' : 'flex'}`}
        title={isOpen ? 'Close chat' : 'Open chat'}
      >
        <span className="text-gray-400 text-xs">{isOpen ? '›' : '‹'}</span>
        <span className="text-gray-500" style={{ writingMode: 'vertical-rl', fontSize: '9px', letterSpacing: '0.1em' }}>
          CHAT
        </span>
      </button>

      {/* Panel — fixed on mobile (viewport-relative), absolute on desktop */}
      <div
        className={`fixed sm:absolute right-0 top-0 bottom-0 z-30 flex flex-col glass transition-all duration-300 ease-in-out ${
          isOpen ? 'w-full sm:w-72 opacity-100' : 'w-0 opacity-0 pointer-events-none overflow-hidden'
        }`}
        style={{ borderLeft: '1px solid rgba(255,255,255,0.08)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)' }}>A</div>
            <span className="text-sm font-semibold text-white">Transcript</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600 glass px-2 py-0.5 rounded-full">{messages.length}</span>
            {/* Close button — always visible on mobile, hidden on sm+ (uses side tab) */}
            <button
              onClick={onToggle}
              className="sm:hidden w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-white transition-colors"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-w-0">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="text-3xl mb-3">💬</div>
              <p className="text-gray-500 text-sm">Start speaking to begin the conversation.</p>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div
                key={i}
                className={`flex flex-col animate-fade-in ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <span className={`text-xs mb-1 ${msg.role === 'user' ? 'text-indigo-400' : 'text-purple-400'}`}>
                  {msg.role === 'user' ? 'You' : 'Ava'}
                </span>
                <div
                  className={`px-3 py-2 text-sm text-white max-w-[90%] leading-relaxed ${
                    msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ava'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-white/5 shrink-0">
          <p className="text-xs text-gray-600 text-center">
            <span className="hidden sm:inline">Hold Space to speak</span>
            <span className="sm:hidden">Tap &amp; hold mic to speak</span>
          </p>
        </div>
      </div>
    </>
  );
}
