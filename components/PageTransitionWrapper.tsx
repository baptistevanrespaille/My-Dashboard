"use client";

import { ReactNode } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import { EASE_OUT } from "@/lib/motion";

const fullVariants = {
  initial: { opacity: 0, filter: "blur(16px)", scale: 0.97, y: 40 },
  animate: { opacity: 1, filter: "blur(0px)",  scale: 1,    y: 0  },
  exit:    { opacity: 0, filter: "blur(16px)", scale: 1.03, y: -40 },
};

const reducedVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit:    { opacity: 0 },
};

export default function PageTransitionWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const prefersReduced = useReducedMotion();
  const variants = prefersReduced ? reducedVariants : fullVariants;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: prefersReduced ? 0.2 : 0.65, ease: EASE_OUT }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
