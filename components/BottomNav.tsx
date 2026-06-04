"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Dumbbell, Heart, Wallet, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/sport", label: "Sport", icon: Dumbbell },
  { href: "/sante", label: "Santé", icon: Heart },
  { href: "/finance", label: "Finance", icon: Wallet },
  { href: "/taches", label: "Tâches", icon: CheckSquare },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.08]"
      style={{
        background: "rgba(15,15,15,0.96)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-150",
                active ? "text-[#6495ED]" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <Icon
                size={22}
                strokeWidth={active ? 2.5 : 1.8}
                className={cn(active && "drop-shadow-[0_0_8px_rgba(100,149,237,0.6)]")}
              />
              <span className={cn("text-[10px] font-medium", active ? "text-[#6495ED]" : "text-zinc-500")}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
