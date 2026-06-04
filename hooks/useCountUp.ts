"use client";

import { useEffect, useRef, useState } from "react";

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3); // cubic easeOut
}

interface CountUpOptions {
  to: number;
  from?: number;
  duration?: number; // ms, default 1400
  decimals?: number; // default 0
  enabled?: boolean; // default true
}

/**
 * useCountUp — animates 0 → target via requestAnimationFrame.
 * SSR-safe: returns `to` immediately on server.
 */
export function useCountUp({
  to,
  from = 0,
  duration = 1400,
  decimals = 0,
  enabled = true,
}: CountUpOptions): string {
  const [value, setValue] = useState<number>(typeof window === "undefined" ? to : from);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      setValue(to);
      return;
    }

    const range = to - from;
    if (range === 0) { setValue(to); return; }

    startRef.current = null;

    const step = (timestamp: number) => {
      if (startRef.current === null) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const current = from + range * easeOut(progress);
      setValue(current);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setValue(to);
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [to, from, duration, enabled]);

  return value.toFixed(decimals);
}

/**
 * useCountUpFormatted — same but returns a formatted string (e.g. currency).
 */
export function useCountUpFormatted({
  to,
  from = 0,
  duration = 1400,
  format,
  enabled = true,
}: {
  to: number;
  from?: number;
  duration?: number;
  format: (n: number) => string;
  enabled?: boolean;
}): string {
  const raw = parseFloat(
    useCountUp({ to, from, duration, decimals: 2, enabled })
  );
  return format(raw);
}
