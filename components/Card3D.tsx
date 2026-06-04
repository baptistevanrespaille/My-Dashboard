"use client";

import { useRef, useCallback, ReactNode } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

interface Card3DProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  maxRotation?: number;
  disabled?: boolean;
}

// Inner glow overlay — always rendered (hooks called unconditionally)
function GlowOverlay({ glowX, glowY }: { glowX: ReturnType<typeof useSpring>; glowY: ReturnType<typeof useSpring> }) {
  const bg = useTransform(
    [glowX, glowY],
    ([x, y]) =>
      `radial-gradient(circle at ${x}% ${y}%, rgba(255,255,255,0.07) 0%, transparent 60%)`
  );
  return (
    <motion.div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: "inherit",
        background: bg,
        pointerEvents: "none",
        zIndex: 1,
      }}
    />
  );
}

export default function Card3D({
  children,
  className = "",
  style,
  maxRotation = 8,
  disabled = false,
}: Card3DProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const rawX = useSpring(0, { stiffness: 300, damping: 30 });
  const rawY = useSpring(0, { stiffness: 300, damping: 30 });
  const glowX = useSpring(50, { stiffness: 200, damping: 25 });
  const glowY = useSpring(50, { stiffness: 200, damping: 25 });

  const rotateX = useTransform(rawY, [-1, 1], [maxRotation, -maxRotation]);
  const rotateY = useTransform(rawX, [-1, 1], [-maxRotation, maxRotation]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (disabled || !cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      rawX.set(x * 2 - 1);
      rawY.set(y * 2 - 1);
      glowX.set(x * 100);
      glowY.set(y * 100);
    },
    [disabled, rawX, rawY, glowX, glowY]
  );

  const handleMouseLeave = useCallback(() => {
    rawX.set(0);
    rawY.set(0);
    glowX.set(50);
    glowY.set(50);
  }, [rawX, rawY, glowX, glowY]);

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX: disabled ? 0 : rotateX,
        rotateY: disabled ? 0 : rotateY,
        transformStyle: "preserve-3d",
        perspective: "1000px",
        willChange: "transform",
        position: "relative",
        ...style,
      }}
      className={className}
    >
      {!disabled && <GlowOverlay glowX={glowX} glowY={glowY} />}
      {children}
    </motion.div>
  );
}
