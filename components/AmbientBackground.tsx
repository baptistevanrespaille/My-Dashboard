"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
}

export default function AmbientBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const isMobile = window.innerWidth < 768;
    const COUNT = isMobile ? 15 : 28;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const particles: Particle[] = Array.from({ length: COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.12 + 0.04,
    }));

    let rafId: number;
    let paused = false;

    const onVisibility = () => { paused = document.hidden; };
    document.addEventListener("visibilitychange", onVisibility);

    const draw = () => {
      if (!paused) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (const p of particles) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
          if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(100,149,237,${p.opacity})`;
          ctx.fill();
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
      {/* Animated gradient background */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          zIndex: -2,
          background: "linear-gradient(135deg, #080810, #0D0D1A, #080810, #0A0A16)",
          backgroundSize: "400% 400%",
          animation: "ambientShift 10s ease infinite",
          pointerEvents: "none",
        }}
      />
      {/* Particle canvas */}
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
      {/* Radial glow orb — top right */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          top: "-10vh",
          right: "-10vw",
          width: "50vw",
          height: "50vw",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(100,149,237,0.06) 0%, transparent 70%)",
          zIndex: -1,
          pointerEvents: "none",
          animation: "orbFloat 8s ease-in-out infinite alternate",
        }}
      />
      {/* Radial glow orb — bottom left */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          bottom: "-5vh",
          left: "-5vw",
          width: "35vw",
          height: "35vw",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(52,211,153,0.04) 0%, transparent 70%)",
          zIndex: -1,
          pointerEvents: "none",
          animation: "orbFloat 12s ease-in-out infinite alternate-reverse",
        }}
      />
    </>
  );
}
