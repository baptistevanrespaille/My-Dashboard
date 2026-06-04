"use client";

import { useEffect, useRef, useState } from "react";

interface DataStreamProps {
  value: string | number;
  className?: string;
  style?: React.CSSProperties;
  duration?: number;
  delay?: number;
}

interface DigitState {
  char: string;
  locked: boolean;
  flash: boolean;
}

function useDataStream(target: string, duration: number, delay: number): DigitState[] {
  const [digits, setDigits] = useState<DigitState[]>(() =>
    target.split("").map((c) => ({
      char: /\d/.test(c) ? "0" : c,
      locked: !/\d/.test(c),
      flash: false,
    }))
  );
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      setDigits(target.split("").map((c) => ({ char: c, locked: true, flash: false })));
      return;
    }

    const chars = target.split("");
    const numericIndices = chars.map((c, i) => (/\d/.test(c) ? i : -1)).filter((i) => i >= 0);
    const scrambleDuration = duration * 0.55;
    const slowdownDuration = duration * 0.30;
    const lockDuration = duration * 0.15;
    const lockInterval = lockDuration / Math.max(numericIndices.length, 1);

    setDigits(chars.map((c, _i) => ({
      char: /\d/.test(c) ? String(Math.floor(Math.random() * 10)) : c,
      locked: !/\d/.test(c),
      flash: false,
    })));

    const startTime = performance.now() + delay;
    let lastScramble = 0;

    const scramble = (now: number) => {
      if (now < startTime) { rafRef.current = requestAnimationFrame(scramble); return; }
      const elapsed = now - startTime;

      if (elapsed < scrambleDuration + slowdownDuration) {
        const minInterval = elapsed < scrambleDuration ? 55 : 55 + ((elapsed - scrambleDuration) / slowdownDuration) * 220;
        if (now - lastScramble >= minInterval) {
          lastScramble = now;
          setDigits((prev) => prev.map((d) =>
            d.locked ? d : { ...d, char: String(Math.floor(Math.random() * 10)) }
          ));
        }
        rafRef.current = requestAnimationFrame(scramble);
      }
    };
    rafRef.current = requestAnimationFrame(scramble);

    // Lock digits left → right
    numericIndices.forEach((idx, order) => {
      setTimeout(() => {
        setDigits((prev) => {
          const next = [...prev];
          next[idx] = { char: chars[idx], locked: true, flash: true };
          return next;
        });
        setTimeout(() => {
          setDigits((prev) => {
            const next = [...prev];
            if (next[idx]) next[idx] = { ...next[idx], flash: false };
            return next;
          });
        }, 80);
      }, delay + scrambleDuration + slowdownDuration + order * lockInterval);
    });

    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration, delay]);

  return digits;
}

export default function DataStreamNumber({
  value,
  className = "",
  style,
  duration = 1100,
  delay = 0,
}: DataStreamProps) {
  const target = String(value);
  const digits = useDataStream(target, duration, delay);

  return (
    <span className={className} style={{ display: "inline", fontVariantNumeric: "tabular-nums", ...style }} aria-label={target}>
      {digits.map((d, i) => (
        <span key={i} style={{
          display: "inline-block",
          color: d.flash ? "#FFFFFF" : d.locked ? "inherit" : "rgba(255,255,255,0.45)",
          textShadow: d.flash ? "0 0 12px rgba(255,255,255,0.8)" : "none",
          transition: d.flash ? "none" : "color 0.12s",
          fontFamily: "inherit",
        }}>
          {d.char}
        </span>
      ))}
    </span>
  );
}
