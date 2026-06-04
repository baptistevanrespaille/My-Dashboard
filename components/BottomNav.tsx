"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { LayoutDashboard, Dumbbell, Heart, Wallet, CheckSquare } from "lucide-react";

const tabs = [
  { href: "/",       label: "HOME",    icon: LayoutDashboard },
  { href: "/sport",  label: "SPORT",   icon: Dumbbell },
  { href: "/sante",  label: "SANTÉ",   icon: Heart },
  { href: "/finance",label: "FINANCE", icon: Wallet },
  { href: "/taches", label: "TÂCHES",  icon: CheckSquare },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: "rgba(5,5,8,0.92)",
        backdropFilter: "blur(30px)",
        WebkitBackdropFilter: "blur(30px)",
        borderTop: "1px solid rgba(0,229,255,0.12)",
        boxShadow: "0 -1px 30px rgba(0,229,255,0.06)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div
        className="flex items-center justify-around max-w-lg mx-auto"
        style={{ height: 72 }}
      >
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-1 relative"
              style={{ padding: "8px 12px", minHeight: 60, minWidth: 56 }}
            >
              {/* Active indicator dot with layoutId for smooth transitions */}
              {active && (
                <motion.span
                  layoutId="nav-indicator"
                  style={{
                    position: "absolute",
                    top: 4,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 4,
                    height: 4,
                    borderRadius: "50%",
                    background: "#00E5FF",
                    boxShadow: "0 0 8px rgba(0,229,255,0.8)",
                  }}
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}

              <Icon
                size={22}
                strokeWidth={1.5}
                style={{
                  color: active ? "#00E5FF" : "rgba(240,238,232,0.3)",
                  filter: active ? "drop-shadow(0 0 6px rgba(0,229,255,0.7))" : "none",
                  transition: "color 0.2s, filter 0.2s",
                }}
              />

              {active && (
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    color: "#00E5FF",
                    fontFamily: "var(--font-sans)",
                    lineHeight: 1,
                  }}
                >
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
