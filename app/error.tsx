"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[App Error]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-red-500/15 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <AlertTriangle size={28} className="text-red-400" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Une erreur est survenue</h1>
        <p className="text-sm text-zinc-500 mb-8">
          {error.message ?? "Quelque chose s'est mal passé. Réessaie ou reviens à l'accueil."}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="flex items-center gap-2 bg-[#6495ED] hover:bg-[#4a7de8] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
          >
            <RotateCcw size={14} /> Réessayer
          </button>
          <Link
            href="/"
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
          >
            <Home size={14} /> Accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
