/**
 * Apple-style activity indicator spinner
 * 12 bars with staggered opacity animation
 */
export function AppleSpinner({ size = 20, className = "" }: { size?: number; className?: string }) {
  const bars = 12;

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
            top: 0,
            left: (size - size * 0.08) / 2,
            width: size * 0.08,
            height: size * 0.26,
            borderRadius: size * 0.04,
            backgroundColor: "currentColor",
            transform: `rotate(${i * 30}deg) translateY(${size * 0.14}px)`,
            transformOrigin: `${size * 0.04}px ${size / 2}px`,
            animation: `appleSpinnerFade 1s linear infinite`,
            animationDelay: `${-(bars - i) * (1 / bars)}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes appleSpinnerFade {
          0%, 40% { opacity: 1; }
          100% { opacity: 0.15; }
        }
      `}</style>
    </div>
  );
}
