"use client";

interface RadarPulseProps {
  size?: number;
  color?: string;
  className?: string;
}

export default function RadarPulse({
  size = 100,
  color = "#6366F1",
  className = "",
}: RadarPulseProps) {
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
        {/* Fade trail gradient */}
        <linearGradient id="radarTrail" gradientTransform="rotate(90)">
          <stop offset="0%"   stopColor={color} stopOpacity="0.6" />
          <stop offset="60%"  stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>

        <filter id="radarGlow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Ring 1 — innermost */}
      <circle cx={cx} cy={cy} r={r1} stroke={color} strokeWidth="0.8" fill="none" strokeOpacity="0.3" />
      {/* Ring 2 */}
      <circle cx={cx} cy={cy} r={r2} stroke={color} strokeWidth="0.8" fill="none" strokeOpacity="0.25" />
      {/* Ring 3 — outermost */}
      <circle cx={cx} cy={cy} r={r3} stroke={color} strokeWidth="0.8" fill="none" strokeOpacity="0.18" />

      {/* Cross hairs */}
      <line x1={cx} y1={cy - r3 - 4} x2={cx} y2={cy + r3 + 4} stroke={color} strokeWidth="0.5" strokeOpacity="0.12" />
      <line x1={cx - r3 - 4} y1={cy} x2={cx + r3 + 4} y2={cy} stroke={color} strokeWidth="0.5" strokeOpacity="0.12" />

      {/* Spinning scan group */}
      <g
        style={{
          transformOrigin: `${cx}px ${cy}px`,
          animation: "radarSpin 3s linear infinite",
        }}
      >
        {/* Sweep wedge */}
        <path
          d={`M ${cx} ${cy} L ${cx} ${cy - r3} A ${r3} ${r3} 0 0 1 ${cx + r3 * Math.sin((Math.PI * 80) / 180)} ${cy - r3 * Math.cos((Math.PI * 80) / 180)} Z`}
          fill={`${color}`}
          fillOpacity="0.07"
        />
        {/* Leading scan line */}
        <line
          x1={cx}
          y1={cy}
          x2={cx}
          y2={cy - r3}
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          filter="url(#radarGlow)"
          strokeOpacity="0.9"
        />
        {/* Scan tip dot */}
        <circle cx={cx} cy={cy - r3} r="2" fill={color} fillOpacity="0.8" filter="url(#radarGlow)" />
      </g>

      {/* Center dot */}
      <circle cx={cx} cy={cy} r="2.5" fill={color} fillOpacity="0.7" filter="url(#radarGlow)" />
    </svg>
  );
}
