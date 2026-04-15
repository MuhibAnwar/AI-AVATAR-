/**
 * StatusIndicator — shows "Listening...", "Thinking...", or "Speaking..."
 * with contextual color and animation.
 */
export default function StatusIndicator({ status }) {
  const config = {
    idle:      { label: 'Ready',        color: 'text-gray-500',  dot: 'bg-gray-500' },
    listening: { label: 'Listening...', color: 'text-green-400', dot: 'bg-green-400' },
    thinking:  { label: 'Thinking...',  color: 'text-indigo-400', dot: null },
    speaking:  { label: 'Speaking...',  color: 'text-purple-400', dot: 'bg-purple-400' },
    error:     { label: 'Try again',    color: 'text-red-400',   dot: 'bg-red-400' },
  };

  const { label, color, dot } = config[status] || config.idle;
  const isThinking = status === 'thinking';

  return (
    <div className="flex items-center justify-center gap-2 h-6">
      {/* Thinking dots */}
      {isThinking ? (
        <div className="flex items-center gap-1.5">
          <span className="dot-flashing" />
          <span className="dot-flashing" />
          <span className="dot-flashing" />
          <span className={`ml-1 text-sm font-medium status-fade ${color}`}>{label}</span>
        </div>
      ) : (
        <>
          {dot && (
            <span
              className={`w-2 h-2 rounded-full ${dot} ${status === 'listening' || status === 'speaking' ? 'animate-pulse' : ''}`}
            />
          )}
          <span className={`text-sm font-medium status-fade ${color}`}>{label}</span>
        </>
      )}
    </div>
  );
}
