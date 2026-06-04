"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, ChevronDown, ChevronUp, Dumbbell, Timer, MapPin, Heart } from "lucide-react";
import { format, parseISO, startOfWeek, addWeeks, getISOWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import PageHeader from "@/components/PageHeader";
import WorkoutModal from "./WorkoutModal";
import { useRouter, useSearchParams } from "next/navigation";

export type Session = {
  id: string; date: string; type: string; sessionLabel: string | null;
  duration: number; notes: string | null;
  exercises: { id: string; exerciseName: string; sets: { setNumber: number; reps: number; weightKg: number }[]; notes: string | null }[];
  cardioLog: { distanceKm: number | null; avgPaceMinPerKm: number | null; avgHeartRate: number | null; route: string | null } | null;
};

const LABEL_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  PUSH:      { bg: "bg-blue-500/20",    text: "text-blue-300",    label: "Push" },
  PULL:      { bg: "bg-emerald-500/20", text: "text-emerald-300", label: "Pull" },
  LEGS:      { bg: "bg-orange-500/20",  text: "text-orange-300",  label: "Legs" },
  FULL_BODY: { bg: "bg-purple-500/20",  text: "text-purple-300",  label: "Full Body" },
  RUNNING:   { bg: "bg-red-500/20",     text: "text-red-300",     label: "Running" },
  CYCLING:   { bg: "bg-cyan-500/20",    text: "text-cyan-300",    label: "Vélo" },
  ROWING:    { bg: "bg-teal-500/20",    text: "text-teal-300",    label: "Rameur" },
  ELLIPTICAL:{ bg: "bg-pink-500/20",    text: "text-pink-300",    label: "Elliptique" },
  OTHER:     { bg: "bg-zinc-500/20",    text: "text-zinc-300",    label: "Autre" },
};

function sessionVolume(s: Session): number {
  return s.exercises.reduce((t, ex) => t + ex.sets.reduce((s, set) => s + set.reps * set.weightKg, 0), 0);
}

export default function SportClient({ sessions }: { sessions: Session[] }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Auto-open modal if ?modal=true is in the URL
  useEffect(() => {
    if (searchParams.get("modal") === "true") {
      setModalOpen(true);
      // Clean the URL without reload
      window.history.replaceState(null, "", "/sport");
    }
  }, [searchParams]);

  // Streak
  let streak = 0;
  const dates = new Set(sessions.map((s) => s.date));
  for (let i = 0; i <= 35; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const k = d.toISOString().split("T")[0];
    if (dates.has(k)) streak++; else if (i > 0) break;
  }

  // Graphiques 8 semaines
  const weeks: { label: string; PUSH: number; PULL: number; LEGS: number; Cardio: number; volume: number; km: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const ws = startOfWeek(addWeeks(new Date(), -i), { weekStartsOn: 1 });
    weeks.push({ label: `S${getISOWeek(ws)}`, PUSH: 0, PULL: 0, LEGS: 0, Cardio: 0, volume: 0, km: 0 });
  }
  sessions.forEach((s) => {
    const ws = startOfWeek(parseISO(s.date), { weekStartsOn: 1 });
    const label = `S${getISOWeek(ws)}`;
    const w = weeks.find((w) => w.label === label);
    if (!w) return;
    const lbl = s.sessionLabel ?? "OTHER";
    if (s.type === "STRENGTH") {
      if (lbl === "PUSH") w.PUSH++;
      else if (lbl === "PULL") w.PULL++;
      else if (lbl === "LEGS") w.LEGS++;
      w.volume += sessionVolume(s) / 1000;
    } else {
      w.Cardio++;
      w.km += s.cardioLog?.distanceKm ?? 0;
    }
  });
  weeks.forEach((w) => { w.volume = parseFloat(w.volume.toFixed(1)); w.km = parseFloat(w.km.toFixed(1)); });

  // Sessions groupées par semaine
  const grouped: Record<string, Session[]> = {};
  sessions.forEach((s) => {
    const ws = format(startOfWeek(parseISO(s.date), { weekStartsOn: 1 }), "'Sem. du' d MMM", { locale: fr });
    grouped[ws] = grouped[ws] ?? [];
    grouped[ws].push(s);
  });

  async function handleSave(data: any) {
    const res = await fetch("/api/workouts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (!res.ok) { toast.error("Erreur lors de l'enregistrement"); return; }
    toast.success("Session enregistrée !");
    setModalOpen(false);
    router.refresh();
  }

  return (
    <div className="px-4 space-y-4">
      <PageHeader
        title="Sport"
        subtitle={streak > 0 ? `🔥 ${streak} jour${streak > 1 ? "s" : ""} de suite` : `${sessions.length} sessions`}
        action={
          <button onClick={() => setModalOpen(true)} className="flex items-center gap-1.5 bg-[#6495ED] hover:bg-[#4a7de8] text-white text-sm font-semibold px-3 py-2 rounded-xl transition-colors">
            <Plus size={15} /> Session
          </button>
        }
      />

      {/* Graphique fréquence par type */}
      <div className="card-dark p-4">
        <p className="text-sm font-semibold text-white mb-3">Sessions / semaine par type</p>
        <ResponsiveContainer width="100%" height={130}>
          <BarChart data={weeks} margin={{ top: 5, right: 5, bottom: 0, left: -25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "#555", fontSize: 9 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: "#555", fontSize: 9 }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip contentStyle={{ background: "#1A1A1A", border: "1px solid #333", borderRadius: 8, fontSize: 10 }} />
            <Legend wrapperStyle={{ fontSize: 10, color: "#777" }} />
            <Bar dataKey="PUSH" stackId="a" fill="#3b82f6" radius={[0,0,0,0]} />
            <Bar dataKey="PULL" stackId="a" fill="#10b981" />
            <Bar dataKey="LEGS" stackId="a" fill="#f97316" />
            <Bar dataKey="Cardio" stackId="a" fill="#ef4444" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Volume muscu + distance cardio */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card-dark p-3">
          <p className="text-xs font-semibold text-white mb-2">Volume (t/sem)</p>
          <ResponsiveContainer width="100%" height={80}>
            <LineChart data={weeks} margin={{ top: 2, right: 2, bottom: 0, left: -30 }}>
              <XAxis dataKey="label" tick={{ fill: "#555", fontSize: 8 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "#1A1A1A", border: "1px solid #333", borderRadius: 8, fontSize: 10 }} formatter={(v: any) => [`${v}t`]} />
              <Line type="monotone" dataKey="volume" stroke="#6495ED" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="card-dark p-3">
          <p className="text-xs font-semibold text-white mb-2">Distance (km/sem)</p>
          <ResponsiveContainer width="100%" height={80}>
            <BarChart data={weeks} margin={{ top: 2, right: 2, bottom: 0, left: -30 }}>
              <XAxis dataKey="label" tick={{ fill: "#555", fontSize: 8 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "#1A1A1A", border: "1px solid #333", borderRadius: 8, fontSize: 10 }} formatter={(v: any) => [`${v} km`]} />
              <Bar dataKey="km" fill="#ef4444" radius={[3,3,0,0]} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sessions groupées */}
      <div className="space-y-4">
        {Object.keys(grouped).length === 0 && (
          <div className="card-dark p-8 text-center">
            <Dumbbell size={32} className="text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">Aucune session. Lance-toi !</p>
          </div>
        )}
        {Object.entries(grouped).map(([week, weekSessions]) => (
          <div key={week}>
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider px-1 mb-1.5">{week}</p>
            <div className="space-y-1.5">
              {weekSessions.map((s) => (
                <SessionCard key={s.id} session={s} expanded={expanded === s.id} onToggle={() => setExpanded(expanded === s.id ? null : s.id)} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <WorkoutModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} />
    </div>
  );
}

function SessionCard({ session, expanded, onToggle }: { session: Session; expanded: boolean; onToggle: () => void }) {
  const lbl = session.sessionLabel ?? "OTHER";
  const style = LABEL_STYLE[lbl] ?? LABEL_STYLE.OTHER;
  const isCardio = session.type !== "STRENGTH";
  const volume = !isCardio ? sessionVolume(session) : 0;
  const dateStr = format(parseISO(session.date), "EEE d MMM", { locale: fr });

  return (
    <div className="card-dark overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center gap-3 p-3.5 text-left">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isCardio ? "bg-red-500/15" : "bg-[#6495ED]/15"}`}>
          {isCardio ? <Timer size={16} className="text-red-400" /> : <Dumbbell size={16} className="text-[#6495ED]" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${style.bg} ${style.text}`}>{style.label}</span>
            {volume > 0 && <span className="text-[10px] text-zinc-500">{(volume / 1000).toFixed(1)}t vol.</span>}
            {session.cardioLog?.distanceKm && <span className="text-[10px] text-zinc-500">{session.cardioLog.distanceKm} km</span>}
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">{dateStr} · {session.duration} min</p>
        </div>
        {expanded ? <ChevronUp size={14} className="text-zinc-600" /> : <ChevronDown size={14} className="text-zinc-600" />}
      </button>

      {expanded && (
        <div className="px-3.5 pb-3.5 border-t border-white/[0.05] pt-3 space-y-2">
          {isCardio && session.cardioLog && (
            <div className="grid grid-cols-2 gap-2">
              {session.cardioLog.distanceKm && <MiniStat label="Distance" value={`${session.cardioLog.distanceKm} km`} />}
              {session.cardioLog.avgPaceMinPerKm && <MiniStat label="Allure" value={`${session.cardioLog.avgPaceMinPerKm} min/km`} />}
              {session.cardioLog.avgHeartRate && <MiniStat label="FC moy." value={`${session.cardioLog.avgHeartRate} bpm`} icon={<Heart size={11} className="text-red-400" />} />}
              {session.cardioLog.route && <MiniStat label="Parcours" value={session.cardioLog.route} icon={<MapPin size={11} className="text-emerald-400" />} />}
            </div>
          )}
          {!isCardio && session.exercises.map((ex) => {
            const exVol = ex.sets.reduce((s, set) => s + set.reps * set.weightKg, 0);
            return (
              <div key={ex.id} className="bg-[#111] rounded-xl p-3">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-sm font-semibold text-white">{ex.exerciseName}</p>
                  <span className="text-[10px] text-zinc-500">{exVol > 0 ? `${exVol} kg vol.` : ""}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ex.sets.map((set, i) => (
                    <span key={i} className="text-xs bg-[#6495ED]/10 text-[#9bb9f3] px-2 py-1 rounded-lg">
                      {set.reps}×{set.weightKg}kg
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-[#111] rounded-xl p-2.5">
      <div className="flex items-center gap-1 mb-0.5">{icon}<span className="text-[9px] text-zinc-500 uppercase">{label}</span></div>
      <span className="text-xs font-semibold text-white">{value}</span>
    </div>
  );
}
