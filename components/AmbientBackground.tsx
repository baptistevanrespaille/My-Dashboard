"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  phase: number;
  amplitude: number;
  isStar: boolean;
}

export default function AmbientBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const isMobile = window.innerWidth < 768;
    const COUNT = isMobile ? 25 : 40;
    const CONNECT_DIST = 100;
    const ACCENT = { r: 0, g: 229, b: 255 };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const particles: Particle[] = Array.from({ length: COUNT }, () => {
      const isStar = Math.random() < 0.05;
      return {
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: isStar ? Math.random() * 3 + 2 : Math.random() * 2 + 0.5,
        opacity: isStar ? Math.random() * 0.4 + 0.2 : Math.random() * 0.2 + 0.05,
        phase: Math.random() * Math.PI * 2,
        amplitude: Math.random() * 30 + 15,
        isStar,
      };
    });

    let t = 0;
    let rafId: number;
    let paused = false;

    const onVisibility = () => { paused = document.hidden; };
    document.addEventListener("visibilitychange", onVisibility);

    const draw = () => {
      if (!paused) {
        t += 0.005;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Move particles in sinusoidal waves
        for (const p of particles) {
          const dx = Math.cos(t + p.phase) * p.vx;
          const dy = Math.sin(t + p.phase * 0.7) * p.vy;
          p.x += dx + p.vx * 0.5;
          p.y += dy + p.vy * 0.5;

          // Bounce
          if (p.x < 0) { p.x = 0; p.vx *= -1; }
          if (p.x > canvas.width) { p.x = canvas.width; p.vx *= -1; }
          if (p.y < 0) { p.y = 0; p.vy *= -1; }
          if (p.y > canvas.height) { p.y = canvas.height; p.vy *= -1; }

          // Draw particle
          if (p.isStar) {
            ctx.save();
            ctx.shadowBlur = 12;
            ctx.shadowColor = `rgba(${ACCENT.r},${ACCENT.g},${ACCENT.b},0.8)`;
          }
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${ACCENT.r},${ACCENT.g},${ACCENT.b},${p.opacity})`;
          ctx.fill();
          if (p.isStar) ctx.restore();
        }

        // Draw connections
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const a = particles[i];
            const b = particles[j];
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < CONNECT_DIST) {
              const opacity = (1 - dist / CONNECT_DIST) * 0.06;
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.strokeStyle = `rgba(${ACCENT.r},${ACCENT.g},${ACCENT.b},${opacity})`;
              ctx.lineWidth = 0.5;
              ctx.stroke();
            }
          }
        }
      }
      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <>
      {/* Layer 1 : Radial ambient gradient (pulsing) */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          zIndex: -3,
          background: "#050508",
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: "60vh",
          zIndex: -2,
          background: "radial-gradient(ellipse 80% 60% at 50% -20%, rgba(0,229,255,0.1) 0%, transparent 70%)",
          animation: "ambientPulse 8s ease-in-out infinite alternate",
          pointerEvents: "none",
        }}
      />

      {/* Layer 2 : Particle canvas */}
      <canvas
        ref={canvasRef}
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          zIndex: -1,
          pointerEvents: "none",
        }}
      />

      {/* Layer 3 : Geometric orbs */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          top: "-15vh",
          right: "-15vw",
          width: "60vw",
          height: "60vw",
          borderRadius: "50%",
          border: "1px solid rgba(0,229,255,0.03)",
          zIndex: -1,
          pointerEvents: "none",
          animation: "geoRotate 60s linear infinite",
          boxShadow: "inset 0 0 100px rgba(0,229,255,0.02)",
        }}
      />
      <div
        aria-hidden
        style={{
          position: "fixed",
          bottom: "-10vh",
          left: "-10vw",
          width: "50vw",
          height: "50vw",
          borderRadius: "50%",
          border: "1px solid rgba(201,168,76,0.03)",
          zIndex: -1,
          pointerEvents: "none",
          animation: "geoRotate 80s linear infinite reverse",
          boxShadow: "inset 0 0 80px rgba(201,168,76,0.015)",
        }}
      />
      {/* Blurred accent orb top-right */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          top: "-5vh",
          right: "-5vw",
          width: "40vw",
          height: "40vw",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,229,255,0.04) 0%, transparent 70%)",
          filter: "blur(40px)",
          zIndex: -1,
          pointerEvents: "none",
        }}
      />
      {/* Blurred gold orb bottom-left */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          bottom: "10vh",
          left: "-8vw",
          width: "35vw",
          height: "35vw",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(201,168,76,0.03) 0%, transparent 70%)",
          filter: "blur(40px)",
          zIndex: -1,
          pointerEvents: "none",
        }}
      />
    </>
  );
}
