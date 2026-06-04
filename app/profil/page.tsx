"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, User, Database, Webhook, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ProfilPage() {
  const [height, setHeight] = useState("");
  const [calorieGoal, setCalorieGoal] = useState("");
  const [weightGoal, setWeightGoal] = useState("");
  const [sportsGoal, setSportsGoal] = useState("");
  const [seeding, setSeeding] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setHeight(localStorage.getItem("user_height_cm") ?? "");
    setCalorieGoal(localStorage.getItem("calorie_goal") ?? "2500");
    setWeightGoal(localStorage.getItem("weight_goal_kg") ?? "");
    setSportsGoal(localStorage.getItem("sports_goal_week") ?? "5");
  }, []);

  function save(key: string, value: string) {
    localStorage.setItem(key, value);
    toast.success("Sauvegardé !");
  }

  async function handleReseed() {
    setSeeding(true);
    const res = await fetch("/api/seed", { method: "POST" });
    setSeeding(false);
    if (res.ok) { toast.success("Données réinitialisées !"); router.refresh(); }
    else toast.error("Erreur lors du seed");
  }

  const webhookUrl = typeof window !== "undefined" ? `${window.location.origin}/api/webhook/health` : "/api/webhook/health";

  return (
    <div className="px-4 pb-nav space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 pt-5 pb-3">
        <Link href="/" className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">Profil</h1>
          <p className="text-xs text-zinc-500">Préférences et configuration</p>
        </div>
      </div>

      {/* Objectifs personnels */}
      <div className="card-dark p-4 space-y-4">
        <div className="flex items-center gap-2">
          <User size={16} className="text-[#6495ED]" />
          <p className="text-sm font-semibold text-white">Objectifs personnels</p>
        </div>

        <div className="space-y-3">
          <PrefField
            label="Taille (cm)"
            value={height}
            onChange={setHeight}
            onSave={() => save("user_height_cm", height)}
            placeholder="ex. 178"
            type="number"
          />
          <PrefField
            label="Objectif calorique (kcal/jour)"
            value={calorieGoal}
            onChange={setCalorieGoal}
            onSave={() => save("calorie_goal", calorieGoal)}
            placeholder="ex. 2500"
            type="number"
          />
          <PrefField
            label="Objectif de poids (kg)"
            value={weightGoal}
            onChange={setWeightGoal}
            onSave={() => save("weight_goal_kg", weightGoal)}
            placeholder="ex. 75"
            type="number"
          />
          <PrefField
            label="Sessions sport / semaine"
            value={sportsGoal}
            onChange={setSportsGoal}
            onSave={() => save("sports_goal_week", sportsGoal)}
            placeholder="ex. 5"
            type="number"
          />
        </div>
      </div>

      {/* Section Données */}
      <div className="card-dark p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Database size={16} className="text-amber-400" />
          <p className="text-sm font-semibold text-white">Données</p>
        </div>
        <p className="text-xs text-zinc-500">
          Réinitialise la base de données avec 30 jours de données de démonstration.
          Toutes les données existantes seront écrasées.
        </p>
        <Button
          onClick={handleReseed}
          disabled={seeding}
          variant="outline"
          className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-xl h-10"
        >
          {seeding ? (
            <><RefreshCw size={14} className="animate-spin mr-2" /> Réinitialisation…</>
          ) : "Réinitialiser le seed"}
        </Button>
      </div>

      {/* Section Webhook */}
      <div className="card-dark p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Webhook size={16} className="text-emerald-400" />
          <p className="text-sm font-semibold text-white">Webhook (Raccourcis iOS)</p>
        </div>
        <p className="text-xs text-zinc-500">
          Configure les Raccourcis iOS pour envoyer des données automatiquement.
        </p>
        <div className="space-y-2">
          <div className="bg-[#111] rounded-xl p-3">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1">URL</p>
            <p className="text-xs text-[#6495ED] font-mono break-all">{webhookUrl}</p>
          </div>
          <div className="bg-[#111] rounded-xl p-3">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Header</p>
            <p className="text-xs text-zinc-300 font-mono">x-webhook-secret: mydashboard2024</p>
          </div>
          <div className="bg-[#111] rounded-xl p-3">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Types supportés</p>
            <p className="text-xs text-zinc-400">weight (kg) · sleep (hours) · nutrition (kcal)</p>
          </div>
        </div>
        <p className="text-[10px] text-zinc-600">
          Voir WEBHOOKS.md pour les exemples de payload complets.
        </p>
      </div>
    </div>
  );
}

function PrefField({
  label, value, onChange, onSave, placeholder, type = "text",
}: {
  label: string; value: string; onChange: (v: string) => void;
  onSave: () => void; placeholder?: string; type?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <label className="text-xs text-zinc-400 mb-1 block">{label}</label>
        <Input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="input-dark h-10"
        />
      </div>
      <button
        onClick={onSave}
        className="mt-5 text-xs bg-[#6495ED]/20 text-[#9bb9f3] hover:bg-[#6495ED]/30 px-3 py-2 rounded-xl transition-colors font-medium flex-shrink-0"
      >
        OK
      </button>
    </div>
  );
}
