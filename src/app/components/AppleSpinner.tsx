/**
 * Apple-style activity indicator spinner
 * 8 rounded bars with staggered opacity animation and hollow center
 */
export function AppleSpinner({ size = 20, className = "" }: { size?: number; className?: string }) {
  const bars = 8;
  const barWidth = size * 0.095;
  const barHeight = size * 0.27;
  const halfSize = size / 2;
  const innerGap = size * 0.18; // 중앙 빈 원 반지름

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        position: "relative",
      }}
    >
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: barWidth,
            height: barHeight,
            borderRadius: barWidth,
            backgroundColor: "currentColor",
            top: halfSize - barHeight - innerGap,
            left: halfSize - barWidth / 2,
            transformOrigin: `${barWidth / 2}px ${barHeight + innerGap}px`,
            transform: `rotate(${i * 45}deg)`,
            animation: `appleSpinnerFade 1.4s linear infinite`,
            animationDelay: `${-(bars - i) * (1.4 / bars)}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes appleSpinnerFade {
          0%, 30% { opacity: 1; }
          100% { opacity: 0.12; }
        }
      `}</style>
    </div>
  );
}
