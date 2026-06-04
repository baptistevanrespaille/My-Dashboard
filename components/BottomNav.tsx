"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { LayoutDashboard, Dumbbell, Heart, Wallet, CheckSquare } from "lucide-react";

const tabs = [
  { href: "/",        label: "HOME",    icon: LayoutDashboard },
  { href: "/sport",   label: "SPORT",   icon: Dumbbell },
  { href: "/sante",   label: "SANTÉ",   icon: Heart },
  { href: "/finance", label: "FINANCE", icon: Wallet },
  { href: "/taches",  label: "TÂCHES",  icon: CheckSquare },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: "rgba(0,0,0,0.92)",
        backdropFilter: "blur(30px)",
        WebkitBackdropFilter: "blur(30px)",
        borderTop: "1px solid rgba(255,255,255,0.10)",
        boxShadow: "0 -1px 30px rgba(255,255,255,0.03)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="flex items-end justify-around max-w-lg mx-auto" style={{ height: 68, paddingBottom: 6 }}>
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                gap: 4, padding: "8px 12px", minHeight: 44, minWidth: 52,
                position: "relative", textDecoration: "none",
              }}
            >
              {/* White indicator bar */}
              {active && (
                <motion.div
                  layoutId="nav-bar"
                  style={{
                    position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
                    width: 40, height: 2, borderRadius: 999,
                    background: "#FFFFFF",
                    boxShadow: "0 0 10px rgba(255,255,255,0.6), 0 0 25px rgba(255,255,255,0.2)",
                  }}
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}

              <motion.div
                animate={{ scale: active ? 1.15 : 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <Icon
                  size={22}
                  strokeWidth={1.5}
                  style={{
                    color: active ? "#FFFFFF" : "rgba(255,255,255,0.28)",
                    filter: active ? "drop-shadow(0 0 6px rgba(255,255,255,0.8))" : "none",
                    transition: "color 0.2s, filter 0.2s",
                  }}
                />
              </motion.div>

              {active && (
                <span style={{
                  fontFamily: "var(--font-space)", fontSize: 9, fontWeight: 700,
                  letterSpacing: "0.12em", color: "#FFFFFF", lineHeight: 1,
                }}>
                  {label}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
