import MicVisualizer from './MicVisualizer.jsx';

/**
 * ControlBar — bottom control row: mute, end call, settings, mic visualizer.
 */
export default function ControlBar({
  isMuted,
  isRecording,
  micStream,
  onToggleMute,
  onEndCall,
  onToggleChat,
  isChatOpen,
}) {
  return (
    <div className="flex items-center justify-center gap-4 relative">
      {/* Mic visualizer - left of controls */}
      <div className="absolute left-0 hidden sm:flex items-center gap-2">
        <MicVisualizer isRecording={isRecording && !isMuted} stream={micStream} />
      </div>

      {/* Settings button */}
      <button
        onClick={onToggleChat}
        title={isChatOpen ? 'Hide chat' : 'Show chat'}
        className="ctrl-btn w-12 h-12 glass hover:bg-white/10 text-gray-300 hover:text-white"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </button>

      {/* Mute button */}
      <button
        onClick={onToggleMute}
        title={isMuted ? 'Unmute' : 'Mute'}
        className={`ctrl-btn w-14 h-14 transition-all duration-200 ${
          isMuted
            ? 'bg-red-500/90 hover:bg-red-400 text-white shadow-lg shadow-red-500/30'
            : 'glass hover:bg-white/10 text-gray-300 hover:text-white'
        }`}
      >
        {isMuted ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="1" y1="1" x2="23" y2="23"/>
            <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
            <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        )}
      </button>

      {/* End call button */}
      <button
        onClick={onEndCall}
        title="End call"
        className="ctrl-btn w-16 h-16 bg-red-600 hover:bg-red-500 text-white shadow-xl shadow-red-600/40"
        style={{ borderRadius: '50%' }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/>
        </svg>
      </button>

      {/* Camera toggle (decorative, camera is always on) */}
      <button
        title="Camera"
        className="ctrl-btn w-12 h-12 glass hover:bg-white/10 text-gray-300 hover:text-white"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="23 7 16 12 23 17 23 7"/>
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
        </svg>
      </button>

      {/* Push-to-talk hint */}
      <div className="absolute right-0 hidden sm:flex items-center">
        <div className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 ${
          isRecording
            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
            : 'text-gray-600 glass'
        }`}>
          {isRecording ? '🔴 Recording' : '⎵ Hold Space'}
        </div>
      </div>
    </div>
  );
}
