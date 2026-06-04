"use client";

import { useEffect, useRef, useState } from "react";

interface DataStreamProps {
  value: string | number;
  className?: string;
  style?: React.CSSProperties;
  duration?: number; // total ms, default 1200
  delay?: number;    // start delay ms
}

interface DigitState {
  char: string;
  locked: boolean;
  flash: boolean;
}

function useDataStream(target: string, duration: number, delay: number): DigitState[] {
  const [digits, setDigits] = useState<DigitState[]>(() =>
    target.split("").map((c) => ({ char: /\d/.test(c) ? "0" : c, locked: !/\d/.test(c), flash: false }))
  );
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      setDigits(target.split("").map((c) => ({ char: c, locked: true, flash: false })));
      return;
    }

    const chars = target.split("");
    const numericIndices = chars.map((c, i) => (/\d/.test(c) ? i : -1)).filter((i) => i >= 0);

    // Phase 1: rapid scramble
    let elapsed = 0;
    const scrambleDuration = duration * 0.6;
    const slowdownDuration = duration * 0.3;
    const lockDuration = duration * 0.1;
    const lockInterval = lockDuration / Math.max(numericIndices.length, 1);

    // Initialize with scrambling digits
    setDigits(
      chars.map((c, i) => ({
        char: /\d/.test(c) ? String(Math.floor(Math.random() * 10)) : c,
        locked: !/\d/.test(c),
        flash: false,
      }))
    );

    const startTime = performance.now() + delay;

    const scramble = () => {
      const now = performance.now();
      if (now < startTime) {
        rafRef.current = requestAnimationFrame(scramble);
        return;
      }
      elapsed = now - startTime;

      if (elapsed < scrambleDuration + slowdownDuration) {
        // Speed decreases over time
        const speed = elapsed < scrambleDuration
          ? 50  // fast phase: new digit every 50ms
          : 50 + ((elapsed - scrambleDuration) / slowdownDuration) * 200; // slow down to 250ms

        setDigits((prev) =>
          prev.map((d, i) => {
            if (d.locked) return d;
            return { ...d, char: String(Math.floor(Math.random() * 10)) };
          })
        );
        rafRef.current = requestAnimationFrame(scramble);
      }
    };
    rafRef.current = requestAnimationFrame(scramble);

    // Phase 3: lock digits left → right
    numericIndices.forEach((idx, order) => {
      setTimeout(() => {
        setDigits((prev) => {
          const next = [...prev];
          next[idx] = { char: chars[idx], locked: true, flash: true };
          return next;
        });
        // Remove flash after 80ms
        setTimeout(() => {
          setDigits((prev) => {
            const next = [...prev];
            if (next[idx]) next[idx] = { ...next[idx], flash: false };
            return next;
          });
        }, 80);
      }, delay + scrambleDuration + slowdownDuration + order * lockInterval);
    });

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [target, duration, delay]);

  return digits;
}

export default function DataStreamNumber({
  value,
  className = "",
  style,
  duration = 1200,
  delay = 0,
}: DataStreamProps) {
  const target = String(value);
  const digits = useDataStream(target, duration, delay);

  return (
    <span
      className={className}
      style={{ display: "inline", fontVariantNumeric: "tabular-nums", ...style }}
      aria-label={target}
    >
      {digits.map((d, i) => (
        <span
          key={i}
          style={{
            display: "inline-block",
            color: d.flash
              ? "var(--accent-bright, #818CF8)"
              : d.locked
              ? "inherit"
              : "rgba(99,102,241,0.65)",
            transition: d.flash ? "none" : "color 0.15s",
            fontFamily: "inherit",
          }}
        >
          {d.char}
        </span>
      ))}
    </span>
  );
}
