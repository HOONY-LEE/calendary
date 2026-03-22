/**
 * Apple-style activity indicator spinner
 * 8 rounded bars with staggered opacity animation
 */
export function AppleSpinner({ size = 20, className = "" }: { size?: number; className?: string }) {
  const bars = 8;

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
            left: (size - size * 0.09) / 2,
            width: size * 0.09,
            height: size * 0.28,
            borderRadius: size * 0.045,
            backgroundColor: "currentColor",
            transform: `rotate(${i * 45}deg) translateY(${size * 0.22}px)`,
            transformOrigin: `${size * 0.045}px ${size / 2}px`,
            animation: `appleSpinnerFade 1.05s linear infinite`,
            animationDelay: `${-(bars - i) * (1.05 / bars)}s`,
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
