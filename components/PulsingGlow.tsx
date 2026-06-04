"use client";

import { ReactNode } from "react";

interface PulsingGlowProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  color?: string;
  intensity?: "low" | "medium" | "high";
}

export default function PulsingGlow({
  children,
  className = "",
  style,
  color = "100,149,237",
  intensity = "medium",
}: PulsingGlowProps) {
  const shadows = {
    low:    [`0 0 15px rgba(${color},0.06)`, `0 0 30px rgba(${color},0.12)`],
    medium: [`0 0 20px rgba(${color},0.08)`, `0 0 40px rgba(${color},0.18)`],
    high:   [`0 0 25px rgba(${color},0.12)`, `0 0 60px rgba(${color},0.28)`],
  };
  const [from, to] = shadows[intensity];

  return (
    <div
      className={className}
      style={{
        animation: `pulseGlow 3s ease-in-out infinite alternate`,
        ["--glow-from" as string]: from,
        ["--glow-to" as string]: to,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
