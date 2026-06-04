"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface FlipNumberProps {
  value: string | number;
  className?: string;
  duration?: number;
}

function FlipDigit({ digit, duration }: { digit: string; duration: number }) {
  const [displayed, setDisplayed] = useState(digit);
  const prev = useRef(digit);

  useEffect(() => {
    if (digit !== prev.current) {
      const timer = setTimeout(() => {
        setDisplayed(digit);
        prev.current = digit;
      }, duration / 2);
      return () => clearTimeout(timer);
    }
  }, [digit, duration]);

  return (
    <span
      style={{
        display: "inline-block",
        fontVariantNumeric: "tabular-nums",
        fontFamily: "ui-monospace, 'Geist Mono', monospace",
        perspective: "200px",
        transformStyle: "preserve-3d",
      }}
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={displayed}
          initial={{ rotateX: -90, opacity: 0 }}
          animate={{ rotateX: 0, opacity: 1 }}
          exit={{ rotateX: 90, opacity: 0 }}
          transition={{
            duration: duration / 1000,
            ease: [0.32, 0.72, 0, 1],
          }}
          style={{ display: "inline-block" }}
        >
          {displayed}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export default function FlipNumber({
  value,
  className = "",
  duration = 400,
}: FlipNumberProps) {
  const str = String(value);

  return (
    <span className={className} aria-label={str}>
      {str.split("").map((char, i) => {
        const isDigit = /\d/.test(char);
        return isDigit ? (
          <FlipDigit key={i} digit={char} duration={duration} />
        ) : (
          <span key={i} style={{ fontVariantNumeric: "tabular-nums" }}>
            {char}
          </span>
        );
      })}
    </span>
  );
}
