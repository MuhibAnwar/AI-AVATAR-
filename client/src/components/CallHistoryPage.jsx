import { useEffect, useState, useCallback } from 'react';

export default function CallHistoryPage({ userId, onBack }) {
  const [calls, setCalls]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [selectedCall, setSelectedCall] = useState(null); // { id, session_id, title, ... }
  const [messages, setMessages]     = useState([]);
  const [msgLoading, setMsgLoading] = useState(false);

  // Load call list
  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    fetch(`/api/history?userId=${encodeURIComponent(userId)}`)
      .then(r => r.json())
      .then(d => { setCalls(d.calls || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [userId]);

  // Load messages for a selected call
  const openCall = useCallback(async (call) => {
    setSelectedCall(call);
    setMessages([]);
    setMsgLoading(true);
    try {
      const r = await fetch(`/api/history/${encodeURIComponent(call.session_id)}/messages`);
      const d = await r.json();
      setMessages(d.messages || []);
    } catch (_) {}
    setMsgLoading(false);
  }, []);

  // ── Detail view (messages) ────────────────────────────────────────────────
  if (selectedCall) {
    return (
      <div className="w-full h-full flex flex-col"
        style={{ background: 'radial-gradient(ellipse at 50% 0%,#150a30 0%,#04040f 65%)' }}>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-6 pb-4 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <button onClick={() => setSelectedCall(null)}
            className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#64748b' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </button>
          <div className="min-w-0">
            <h2 className="text-white font-black text-base truncate" style={{ letterSpacing: '-0.01em' }}>{selectedCall.title}</h2>
            <p style={{ color: '#475569', fontSize: '0.72rem', marginTop: 2 }}>{formatDate(selectedCall.started_at)}</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-3">
          {msgLoading && (
            <div className="flex justify-center pt-10">
              <div className="w-6 h-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            </div>
          )}
          {!msgLoading && messages.length === 0 && (
            <p className="text-center text-gray-600 text-sm pt-10">No messages found.</p>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full overflow-hidden mr-2 mt-0.5 shrink-0"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)' }}>
                  <img src="https://pub-1407f82391df4ab1951418d04be76914.r2.dev/uploads/a4d19b4b-1581-4959-8022-7f74727174c9.png"
                    alt="Ava" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="max-w-[75%]">
                <div className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
                  style={msg.role === 'user'
                    ? { background: 'linear-gradient(135deg,#6d28d9,#7c3aed,#9333ea)', color: '#fff', borderBottomRightRadius: 4, fontWeight: 500 }
                    : { background: 'rgba(255,255,255,0.05)', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.07)', borderBottomLeftRadius: 4 }}>
                  {msg.content}
                </div>
                <p className="text-gray-600 text-[10px] mt-1 px-1">{formatTime(msg.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── List view (all calls) ─────────────────────────────────────────────────
  return (
    <div className="w-full h-full flex flex-col"
      style={{ background: 'radial-gradient(ellipse at 50% 0%,#150a30 0%,#04040f 65%)' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-4 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <button onClick={onBack}
          className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#64748b' }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <div>
          <h1 className="text-white font-black text-xl" style={{ letterSpacing: '-0.02em' }}>Call History</h1>
          <p style={{ color: '#475569', fontSize: '0.72rem', marginTop: 2 }}>{calls.length} conversation{calls.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2">

        {loading && (
          <div className="flex justify-center pt-16">
            <div className="w-7 h-7 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          </div>
        )}

        {!loading && !userId && (
          <div className="flex flex-col items-center gap-3 pt-16 text-center px-6">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
              style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
              🔒
            </div>
            <p className="text-white font-semibold">Sign in to see history</p>
            <p className="text-gray-500 text-sm">Your call history is saved when you're logged in.</p>
          </div>
        )}

        {!loading && userId && calls.length === 0 && (
          <div className="flex flex-col items-center gap-3 pt-16 text-center px-6">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
              style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
              💬
            </div>
            <p className="text-white font-semibold">No calls yet</p>
            <p className="text-gray-500 text-sm">Your conversations with Ava will appear here.</p>
          </div>
        )}

        {calls.map((call) => (
          <button key={call.id} onClick={() => openCall(call)}
            className="w-full text-left rounded-2xl px-4 py-4 flex items-center gap-3.5 transition-all duration-200 active:scale-[0.98]"
            style={{
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(124,58,237,0.3)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}>

            {/* Icon */}
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg,rgba(109,40,217,0.2),rgba(147,51,234,0.15))', border: '1px solid rgba(124,58,237,0.2)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm truncate" style={{ letterSpacing: '-0.01em' }}>{call.title}</p>
              <p style={{ color: '#475569', fontSize: '0.72rem', marginTop: 3 }}>
                {formatDate(call.started_at)} · {call.message_count} message{call.message_count !== 1 ? 's' : ''}
              </p>
            </div>

            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2.5" strokeLinecap="round">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 86400000) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diff < 604800000) {
    return d.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
