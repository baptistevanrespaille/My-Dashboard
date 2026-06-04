import { Home, Compass } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-[#6495ED]/15 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Compass size={28} className="text-[#6495ED]" />
        </div>
        <h1 className="text-5xl font-black text-white mb-3 tracking-tight">404</h1>
        <p className="text-sm text-zinc-500 mb-8">
          Cette page n'existe pas. Tu t'es peut-être perdu dans le dashboard.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-[#6495ED] hover:bg-[#4a7de8] text-white text-sm font-semibold px-6 py-3 rounded-xl transition-colors"
        >
          <Home size={14} /> Retour au Dashboard
        </Link>
      </div>
    </div>
  );
}
