import { useReducedMotion } from "framer-motion";

// ─── Easing ───────────────────────────────────────────────────────────────────
const EASE_OUT  = [0.25, 0.46, 0.45, 0.94] as [number,number,number,number];
const EASE_IN   = [0.4,  0,    1,    1]    as [number,number,number,number];
const EASE_BOTH = [0.32, 0.72, 0,    1]    as [number,number,number,number];

// ─── Page-level transition (blur + scale + y) ─────────────────────────────────
export const pageTransition = {
  initial: { opacity: 0, filter: "blur(16px)", scale: 0.97, y: 40 },
  animate: { opacity: 1, filter: "blur(0px)",  scale: 1,    y: 0  },
  exit:    { opacity: 0, filter: "blur(16px)", scale: 1.03, y: -40 },
  transition: { duration: 0.65, ease: EASE_OUT },
};

// ─── Section fade-in (blur + y) ───────────────────────────────────────────────
export const blurSlideUp = {
  initial:    { opacity: 0, filter: "blur(12px)", y: 28 },
  animate:    { opacity: 1, filter: "blur(0px)",  y: 0  },
  exit:       { opacity: 0, filter: "blur(8px)",  y: -12 },
  transition: { duration: 0.7, ease: EASE_OUT },
};

// ─── Stagger container ────────────────────────────────────────────────────────
export const staggerContainer = {
  animate: { transition: { staggerChildren: 0.09 } },
};

// ─── Stagger item (used inside staggerContainer) ──────────────────────────────
export const staggerItem = {
  initial:    { opacity: 0, filter: "blur(12px)", y: 28 },
  animate:    { opacity: 1, filter: "blur(0px)",  y: 0  },
  transition: { duration: 0.7, ease: EASE_OUT },
};

// ─── Card hover (lift + scale) ────────────────────────────────────────────────
export const cardHover = {
  whileHover: { y: -7,  scale: 1.018 },
  whileTap:   { scale: 0.97 },
  transition: { type: "spring", stiffness: 300, damping: 22 },
};

// ─── Button ───────────────────────────────────────────────────────────────────
export const buttonHover = {
  whileHover: { scale: 1.05 },
  whileTap:   { scale: 0.97 },
  transition: { type: "spring", stiffness: 400, damping: 20 },
};

// ─── Spring constants ─────────────────────────────────────────────────────────
export const SPRING_STANDARD = { type: "spring", stiffness: 380, damping: 35 } as const;
export const SPRING_BOUNCY   = { type: "spring", stiffness: 500, damping: 25 } as const;
export const SPRING_SLOW     = { type: "spring", stiffness: 200, damping: 30 } as const;

// ─── Gradient divider helper (accent line) ────────────────────────────────────
export const gradientDividerStyle = (color = "#00E5FF") => ({
  height: 1,
  background: `linear-gradient(90deg, transparent, ${color}33, transparent)`,
  margin: "12px 0 16px",
});

// ─── useMotionConfig: respects prefers-reduced-motion ────────────────────────
// Returns animation-safe variants that disable blur/scale/y if reduced.
export function useMotionConfig() {
  const prefersReduced = useReducedMotion();

  const safeBlurSlideUp = prefersReduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.3 } }
    : blurSlideUp;

  const safeStaggerItem = prefersReduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.3 } }
    : staggerItem;

  const safeCardHover = prefersReduced
    ? { whileTap: { opacity: 0.8 } }
    : cardHover;

  return { prefersReduced, safeBlurSlideUp, safeStaggerItem, safeCardHover };
}
