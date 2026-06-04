"use client";

import { useEffect, useRef, ReactNode } from "react";

interface GlitchTextProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  as?: "h1" | "h2" | "h3" | "p" | "span" | "div";
  disabled?: boolean;
}

export default function GlitchText({
  children,
  className = "",
  style,
  as = "span",
  disabled = false,
}: GlitchTextProps) {
  const elRef = useRef<HTMLElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (disabled || typeof window === "undefined") return;
    const el = elRef.current;
    if (!el) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;

    function scheduleGlitch() {
      timerRef.current = setTimeout(() => { runGlitchSequence(); }, 5000 + Math.random() * 4000);
    }

    function runGlitchSequence() {
      const target = elRef.current;
      if (!target) return;
      const pulses = 3 + Math.floor(Math.random() * 3);
      let pulse = 0;

      function doPulse() {
        const t = elRef.current;
        if (!t || pulse >= pulses) {
          if (t) { t.style.transform = ""; t.style.clipPath = ""; t.style.textShadow = ""; }
          scheduleGlitch();
          return;
        }
        const tx = (Math.random() - 0.5) * 6;
        const ty = (Math.random() - 0.5) * 2;
        const i1 = Math.floor(Math.random() * 40);
        const i2 = Math.floor(Math.random() * 40);
        t.style.transform = `translateX(${tx}px) translateY(${ty}px)`;
        t.style.clipPath = `inset(${i1}% 0 ${i2}% 0)`;
        t.style.textShadow = `${(Math.random() - 0.5) * 4}px 0 #6366F1, ${(Math.random() - 0.5) * 4}px 0 #F59E0B`;

        setTimeout(() => {
          const t2 = elRef.current;
          if (t2) { t2.style.transform = ""; t2.style.clipPath = ""; t2.style.textShadow = ""; }
          pulse++;
          setTimeout(doPulse, 30 + Math.random() * 50);
        }, 40 + Math.random() * 40);
      }
      doPulse();
    }

    scheduleGlitch();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [disabled]);

  const sharedProps = {
    ref: elRef as any,
    className,
    style: { display: "inline-block", willChange: "transform", ...style },
  };

  if (as === "h1") return <h1 {...sharedProps}>{children}</h1>;
  if (as === "h2") return <h2 {...sharedProps}>{children}</h2>;
  if (as === "h3") return <h3 {...sharedProps}>{children}</h3>;
  if (as === "p")  return <p  {...sharedProps}>{children}</p>;
  if (as === "div") return <div {...sharedProps}>{children}</div>;
  return <span {...sharedProps}>{children}</span>;
}
