/**
 * Apple-style activity indicator spinner
 * 8 thick rounded bars with staggered opacity animation
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
            left: (size - size * 0.13) / 2,
            width: size * 0.13,
            height: size * 0.32,
            borderRadius: size * 0.07,
            backgroundColor: "currentColor",
            transform: `rotate(${i * 45}deg) translateY(${size * 0.12}px)`,
            transformOrigin: `${size * 0.065}px ${size / 2}px`,
            animation: `appleSpinnerFade 0.8s linear infinite`,
            animationDelay: `${-(bars - i) * (0.8 / bars)}s`,
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
