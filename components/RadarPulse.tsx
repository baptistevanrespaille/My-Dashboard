"use client";

interface RadarPulseProps {
  size?: number;
  className?: string;
}

export default function RadarPulse({ size = 100, className = "" }: RadarPulseProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r1 = size * 0.18;
  const r2 = size * 0.32;
  const r3 = size * 0.45;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      aria-hidden
      style={{ display: "block", overflow: "visible" }}
    >
      <defs>
        <filter id="radarGlowW">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Rings */}
      <circle cx={cx} cy={cy} r={r1} stroke="rgba(255,255,255,0.20)" strokeWidth="0.8" fill="none" />
      <circle cx={cx} cy={cy} r={r2} stroke="rgba(255,255,255,0.14)" strokeWidth="0.8" fill="none" />
      <circle cx={cx} cy={cy} r={r3} stroke="rgba(255,255,255,0.10)" strokeWidth="0.8" fill="none" />

      {/* Cross hairs */}
      <line x1={cx} y1={cy - r3 - 4} x2={cx} y2={cy + r3 + 4} stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
      <line x1={cx - r3 - 4} y1={cy} x2={cx + r3 + 4} y2={cy} stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />

      {/* Spinning sweep */}
      <g style={{ transformOrigin: `${cx}px ${cy}px`, animation: "radarSpin 3s linear infinite" }}>
        {/* Sweep wedge */}
        <path
          d={`M ${cx} ${cy} L ${cx} ${cy - r3} A ${r3} ${r3} 0 0 1 ${cx + r3 * Math.sin((Math.PI * 80) / 180)} ${cy - r3 * Math.cos((Math.PI * 80) / 180)} Z`}
          fill="rgba(255,255,255,0.05)"
        />
        {/* Scan line */}
        <line
          x1={cx} y1={cy} x2={cx} y2={cy - r3}
          stroke="rgba(255,255,255,0.6)"
          strokeWidth="1.2"
          strokeLinecap="round"
          filter="url(#radarGlowW)"
        />
        {/* Tip */}
        <circle cx={cx} cy={cy - r3} r="2" fill="rgba(255,255,255,0.7)" filter="url(#radarGlowW)" />
      </g>

      {/* Center */}
      <circle cx={cx} cy={cy} r="2.5" fill="rgba(255,255,255,0.6)" filter="url(#radarGlowW)" />
    </svg>
  );
}
