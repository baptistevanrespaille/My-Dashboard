"use client";

import { useEffect, useRef } from "react";

// SVG circuit trace paths (PCB-style right-angle paths)
const TRACES = [
  "M 20 80 L 80 80 L 80 40 L 200 40 L 200 120 L 340 120 L 340 60",
  "M 360 180 L 280 180 L 280 240 L 160 240 L 160 300 L 60 300 L 60 380",
  "M 10 200 L 100 200 L 100 160 L 250 160 L 250 280 L 380 280 L 380 200",
  "M 180 10 L 180 60 L 320 60 L 320 140 L 390 140 L 390 220 L 320 220 L 320 320",
];

export default function CircuitBackground() {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    // no JS needed — all CSS animation
  }, []);

  return (
    <>
      {/* Layer 0: Deep background */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          zIndex: -4,
          background: "#030305",
          pointerEvents: "none",
        }}
      />

      {/* Layer 1: Grid */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          zIndex: -3,
          pointerEvents: "none",
          backgroundImage: `
            linear-gradient(rgba(99,102,241,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,102,241,0.06) 1px, transparent 1px),
            linear-gradient(rgba(99,102,241,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,102,241,0.1) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px, 40px 40px, 200px 200px, 200px 200px",
        }}
      />

      {/* Intersection dots at 200px grid */}
      <svg
        aria-hidden
        style={{ position: "fixed", inset: 0, zIndex: -3, pointerEvents: "none", width: "100%", height: "100%" }}
      >
        <defs>
          <pattern id="dots" x="0" y="0" width="200" height="200" patternUnits="userSpaceOnUse">
            <circle cx="0" cy="0" r="2" fill="rgba(99,102,241,0.3)" />
            <circle cx="200" cy="0" r="2" fill="rgba(99,102,241,0.3)" />
            <circle cx="0" cy="200" r="2" fill="rgba(99,102,241,0.3)" />
            <circle cx="200" cy="200" r="2" fill="rgba(99,102,241,0.3)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dots)" />
      </svg>

      {/* Layer 2: Circuit traces */}
      <svg
        ref={svgRef}
        aria-hidden
        viewBox="0 0 400 400"
        preserveAspectRatio="xMidYMid slice"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: -2,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          opacity: 0.6,
        }}
      >
        {TRACES.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke="rgba(99,102,241,0.4)"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              filter: "blur(0.5px)",
              strokeDasharray: 800,
              strokeDashoffset: 800,
              animation: `circuitTrace ${4 + i * 1.5}s ${i * 1.2}s linear infinite`,
            }}
          />
        ))}
      </svg>

      {/* Layer 3: Orbs */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          top: "-15vh",
          right: "-10vw",
          width: "60vw",
          height: "60vw",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)",
          filter: "blur(40px)",
          zIndex: -2,
          pointerEvents: "none",
          animation: "geoRotate 120s linear infinite",
          transformOrigin: "center",
        }}
      />
      <div
        aria-hidden
        style={{
          position: "fixed",
          bottom: "5vh",
          left: "-8vw",
          width: "45vw",
          height: "45vw",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(245,158,11,0.05) 0%, transparent 70%)",
          filter: "blur(40px)",
          zIndex: -2,
          pointerEvents: "none",
          animation: "geoRotate 180s linear infinite reverse",
        }}
      />

      {/* Layer 4: Scan line */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          height: 1,
          background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.5), transparent)",
          zIndex: -1,
          pointerEvents: "none",
          animation: "scanLine 6s linear infinite",
          top: "-1px",
        }}
      />
    </>
  );
}
