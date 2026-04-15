import { useEffect, useRef, useState } from 'react';

/**
 * MicVisualizer — animated bar graph showing live mic input level.
 * Attaches to the user's microphone stream via Web Audio API.
 */
export default function MicVisualizer({ isRecording, stream }) {
  const [levels, setLevels] = useState(Array(12).fill(0.1));
  const animFrameRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const audioCtxRef = useRef(null);

  useEffect(() => {
    if (!isRecording || !stream) {
      setLevels(Array(12).fill(0.1));
      return;
    }

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64;
    analyser.smoothingTimeConstant = 0.7;
    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);

    audioCtxRef.current = audioCtx;
    analyserRef.current = analyser;
    sourceRef.current = source;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const draw = () => {
      analyser.getByteFrequencyData(dataArray);
      // Map frequency bins to 12 bars with some visual scaling
      const bars = Array.from({ length: 12 }, (_, i) => {
        const binIndex = Math.floor((i / 12) * dataArray.length);
        return Math.max(0.05, dataArray[binIndex] / 255);
      });
      setLevels(bars);
      animFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      source.disconnect();
      audioCtx.close().catch(() => {});
    };
  }, [isRecording, stream]);

  return (
    <div className="flex items-end justify-center gap-[3px]" style={{ height: '32px' }}>
      {levels.map((level, i) => (
        <div
          key={i}
          className="mic-bar transition-all duration-75"
          style={{
            height: `${Math.max(8, level * 32)}px`,
            opacity: isRecording ? 0.9 : 0.25,
            background: isRecording
              ? `linear-gradient(to top, #6366f1, #a855f7)`
              : '#3a3a3a',
          }}
        />
      ))}
    </div>
  );
}
