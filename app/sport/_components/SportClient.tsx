"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, ChevronDown, Dumbbell, Timer, MapPin, Heart } from "lucide-react";
import { format, parseISO, startOfWeek, addWeeks, getISOWeek, isThisWeek, isThisMonth } from "date-fns";
import { fr } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import WorkoutModal from "./WorkoutModal";
import { useRouter, useSearchParams } from "next/navigation";
import Card3D from "@/components/Card3D";
import FlipNumber from "@/components/FlipNumber";
import { SPRING_STANDARD, gradientDividerStyle } from "@/lib/motion";

const ACCENT  = "#6366F1";
const SUCCESS = "#10B981";
const DANGER  = "#EF4444";
const WARNING = "#F59E0B";
const SPRING  = { type: "spring", stiffness: 380, damping: 35 } as const;

export type Session = {
  id: string; date: string; type: string; sessionLabel: string | null;
  duration: number; notes: string | null;
  exercises: { id: string; exerciseName: string; sets: { setNumber: number; reps: number; weightKg: number }[]; notes: string | null }[];
  cardioLog: { distanceKm: number | null; avgPaceMinPerKm: number | null; avgHeartRate: number | null; route: string | null } | null;
};

const SESSION_COLOR: Record<string, string> = {
  PUSH: "#6495ED", PULL: SUCCESS, LEGS: WARNING,
  RUNNING: DANGER, CARDIO: DANGER, FULL_BODY: "#A78BFA",
  CYCLING: ACCENT, ROWING: "#14B8A6", ELLIPTICAL: "#EC4899", OTHER: "#64748B",
};
const SESSION_LABEL_MAP: Record<string, string> = {
  PUSH: "Push", PULL: "Pull", LEGS: "Legs",
  RUNNING: "Running", CARDIO: "Cardio", FULL_BODY: "Full Body",
  CYCLING: "Vélo", ROWING: "Rameur", ELLIPTICAL: "Elliptique", OTHER: "Autre",
};

function sessionVolume(s: Session) {
  return s.exercises.reduce((t, ex) => t + ex.sets.reduce((a, set) => a + set.reps * set.weightKg, 0), 0);
}

function BarTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "rgba(12,12,18,0.97)", border: `1px solid ${ACCENT}35`, borderRadius: 10, padding: "8px 12px", backdropFilter: "blur(8px)" }}>
      <p style={{ fontSize: 10, color: "rgba(248,248,255,0.4)", marginBottom: 4 }}>{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: p.fill }} />
          <span style={{ fontSize: 11, fontFamily: "var(--font-space)", color: "var(--text-primary)" }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function SportClient({ sessions }: { sessions: Session[] }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"freq" | "volume" | "distance">("freq");
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("modal") === "true") {
      setModalOpen(true);
      window.history.replaceState(null, "", "/sport");
    }
  }, [searchParams]);

  let streak = 0;
  const dates = new Set(sessions.map((s) => s.date));
  for (let i = 0; i <= 35; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    if (dates.has(d.toISOString().split("T")[0])) streak++; else if (i > 0) break;
  }

  const monthSessions = sessions.filter((s) => isThisMonth(parseISO(s.date)));
  const monthVolume = monthSessions.reduce((t, s) => t + sessionVolume(s), 0);
  const monthKm = monthSessions.reduce((t, s) => t + (s.cardioLog?.distanceKm ?? 0), 0);

  const weeks: { label: string; PUSH: number; PULL: number; LEGS: number; Cardio: number; volume: number; km: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const ws = startOfWeek(addWeeks(new Date(), -i), { weekStartsOn: 1 });
    weeks.push({ label: `S${getISOWeek(ws)}`, PUSH: 0, PULL: 0, LEGS: 0, Cardio: 0, volume: 0, km: 0 });
  }
  sessions.forEach((s) => {
    const ws = startOfWeek(parseISO(s.date), { weekStartsOn: 1 });
    const label = `S${getISOWeek(ws)}`;
    const w = weeks.find((wk) => wk.label === label);
    if (!w) return;
    const lbl = s.sessionLabel ?? "OTHER";
    if (s.type === "STRENGTH") {
      if (lbl === "PUSH") w.PUSH++;
      else if (lbl === "PULL") w.PULL++;
      else if (lbl === "LEGS") w.LEGS++;
      w.volume = parseFloat((w.volume + sessionVolume(s) / 1000).toFixed(1));
    } else {
      w.Cardio++;
      w.km = parseFloat((w.km + (s.cardioLog?.distanceKm ?? 0)).toFixed(1));
    }
  });

  const grouped: Record<string, Session[]> = {};
  sessions.forEach((s) => {
    const key = isThisWeek(parseISO(s.date), { weekStartsOn: 1 })
      ? "CETTE SEMAINE"
      : format(startOfWeek(parseISO(s.date), { weekStartsOn: 1 }), "'SEM.' d MMM", { locale: fr }).toUpperCase();
    grouped[key] = grouped[key] ?? [];
    grouped[key].push(s);
  });

  async function handleSave(data: any) {
    const res = await fetch("/api/workouts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (!res.ok) { toast.error("Erreur lors de l'enregistrement"); return; }
    toast.success("Session enregistrée !");
    setModalOpen(false);
    router.refresh();
  }

  return (
    <div style={{ padding: "0 20px 20px" }}>

      {/* HEADER */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }} style={{ paddingTop: 60, paddingBottom: 20 }}>
        <h1 style={{ fontFamily: "var(--font-syne)", fontSize: 56, letterSpacing: "0.05em", color: "var(--text-primary)", lineHeight: 1 }}>SPORT</h1>
        <p style={{ fontSize: 13, color: "rgba(248,248,255,0.45)", marginTop: 6, fontFamily: "var(--font-space)" }}>
          {format(new Date(), "MMMM yyyy", { locale: fr }).toUpperCase()}
          <span style={{ color: ACCENT, margin: "0 8px" }}>·</span>
          {monthSessions.length} SÉANCES
          <span style={{ color: ACCENT, margin: "0 8px" }}>·</span>
          {(monthVolume / 1000).toFixed(1)} T
          {streak > 0 && <><span style={{ color: ACCENT, margin: "0 8px" }}>·</span>🔥 {streak}j</>}
        </p>
        <div style={{ height: 1, marginTop: 16, background: `linear-gradient(90deg, transparent, ${ACCENT}33, transparent)` }} />
      </motion.div>

      {/* STATS ROW */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.45, ease: [0.32, 0.72, 0, 1] }} style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[
          { label: "SÉANCES", value: `${monthSessions.length}`, unit: "" },
          { label: "VOLUME", value: `${(monthVolume / 1000).toFixed(1)}`, unit: "t" },
          { label: "KM", value: `${monthKm.toFixed(1)}`, unit: "km" },
        ].map((s, i) => (
          <div key={i} style={{ flex: 1, background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)", border: "1px solid rgba(0,229,255,0.15)", borderRadius: 16, padding: "12px 10px", textAlign: "center" }}>
            <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", color: "rgba(248,248,255,0.25)", marginBottom: 4 }}>{s.label}</p>
            <p style={{ fontFamily: "var(--font-syne)", fontSize: 28, color: "var(--text-primary)", lineHeight: 1 }}>
              <FlipNumber value={s.value} /><span style={{ fontSize: 13, color: "rgba(248,248,255,0.35)", marginLeft: 2 }}>{s.unit}</span>
            </p>
          </div>
        ))}
      </motion.div>

      {/* CHART */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14, duration: 0.45, ease: [0.32, 0.72, 0, 1] }} style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)", border: "1px solid rgba(0,229,255,0.15)", borderRadius: 20, padding: 20, marginBottom: 20 }}>
        <div style={{ display: "flex", background: "var(--surface-2)", borderRadius: 12, padding: 4, marginBottom: 16 }}>
          {([["freq", "FRÉQUENCE"], ["volume", "VOLUME"], ["distance", "DISTANCE"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setActiveTab(k)} style={{
              flex: 1, padding: "8px 4px", borderRadius: 8, fontSize: 10, fontWeight: 700,
              letterSpacing: "0.08em", border: "none", cursor: "pointer", minHeight: 36,
              fontFamily: "var(--font-space)",
              background: activeTab === k ? ACCENT : "transparent",
              color: activeTab === k ? "#050508" : "rgba(248,248,255,0.3)",
              boxShadow: activeTab === k ? `0 0 12px ${ACCENT}40` : "none",
              transition: "all 0.2s cubic-bezier(0.32,0.72,0,1)",
            }}>{l}</button>
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <ResponsiveContainer width="100%" height={140}>
              {activeTab === "freq" ? (
                <BarChart data={weeks} margin={{ top: 5, right: 5, bottom: 0, left: -25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "rgba(248,248,255,0.25)", fontSize: 9 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: "rgba(248,248,255,0.25)", fontSize: 9 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<BarTip />} />
                  <Bar dataKey="PUSH" stackId="a" fill="#6495ED" />
                  <Bar dataKey="PULL" stackId="a" fill={SUCCESS} />
                  <Bar dataKey="LEGS" stackId="a" fill={WARNING} />
                  <Bar dataKey="Cardio" stackId="a" fill={DANGER} radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : activeTab === "volume" ? (
                <BarChart data={weeks} margin={{ top: 5, right: 5, bottom: 0, left: -25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "rgba(248,248,255,0.25)", fontSize: 9 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: "rgba(248,248,255,0.25)", fontSize: 9 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<BarTip />} />
                  <Bar dataKey="volume" fill={ACCENT} radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <BarChart data={weeks} margin={{ top: 5, right: 5, bottom: 0, left: -25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "rgba(248,248,255,0.25)", fontSize: 9 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: "rgba(248,248,255,0.25)", fontSize: 9 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<BarTip />} />
                  <Bar dataKey="km" fill={DANGER} radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </motion.div>
        </AnimatePresence>
        {activeTab === "freq" && (
          <div style={{ display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
            {[["PUSH", "#6495ED"], ["PULL", SUCCESS], ["LEGS", WARNING], ["CARDIO", DANGER]].map(([l, c]) => (
              <div key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
                <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", color: "rgba(248,248,255,0.35)" }}>{l}</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* SESSION LIST */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {Object.keys(grouped).length === 0 ? (
          <div style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)", border: "1px solid rgba(0,229,255,0.15)", borderRadius: 20, padding: 48, textAlign: "center" }}>
            <Dumbbell size={36} style={{ color: "rgba(248,248,255,0.15)", display: "block", margin: "0 auto 12px" }} />
            <p style={{ color: "rgba(248,248,255,0.3)", fontSize: 14 }}>Aucune session. Lance-toi !</p>
          </div>
        ) : (
          Object.entries(grouped).map(([week, wSessions], wi) => (
            <motion.div key={week} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + wi * 0.06, duration: 0.4, ease: [0.32, 0.72, 0, 1] }}>
              <p style={{ fontFamily: "var(--font-syne)", fontSize: 18, letterSpacing: "0.08em", color: "rgba(248,248,255,0.25)", marginBottom: 10 }}>{week}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {wSessions.map((s) => (
                  <SessionCard key={s.id} session={s} expanded={expanded === s.id} onToggle={() => setExpanded(expanded === s.id ? null : s.id)} />
                ))}
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* FAB */}
      <motion.button
        whileTap={{ scale: 0.88 }}
        onClick={() => setModalOpen(true)}
        style={{
          position: "fixed", bottom: 100, right: 20,
          width: 64, height: 64, borderRadius: "50%",
          background: `radial-gradient(circle at 40% 35%, ${ACCENT}, #4F46E5)`,
          border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 8px 32px ${ACCENT}40, 0 0 0 1px ${ACCENT}25`,
          zIndex: 30,
          animation: "pulseGlow 3s ease-in-out infinite alternate",
          ["--glow-from" as string]: `0 8px 32px ${ACCENT}30`,
          ["--glow-to" as string]: `0 8px 48px ${ACCENT}60`,
        }}
      >
        <Plus size={28} style={{ color: "#050508" }} strokeWidth={2.5} />
      </motion.button>

      <WorkoutModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} />
    </div>
  );
}

function SessionCard({ session, expanded, onToggle }: { session: Session; expanded: boolean; onToggle: () => void }) {
  const lbl = session.sessionLabel ?? "OTHER";
  const color = SESSION_COLOR[lbl] ?? SESSION_COLOR.OTHER;
  const label = SESSION_LABEL_MAP[lbl] ?? "Autre";
  const isCardio = session.type !== "STRENGTH";
  const volume = !isCardio ? sessionVolume(session) : 0;
  const dateStr = format(parseISO(session.date), "EEE d MMM", { locale: fr });

  return (
    <Card3D maxRotation={3}>
      <motion.div layout style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)", border: "1px solid rgba(0,229,255,0.15)", borderRadius: 20, overflow: "hidden", borderLeft: `4px solid ${color}` }}>
        <button onClick={onToggle} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px 14px 12px", textAlign: "left", background: "none", border: "none", cursor: "pointer", minHeight: 64 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: color + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {isCardio ? <Timer size={17} style={{ color }} /> : <Dumbbell size={17} style={{ color }} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <span style={{ background: color + "22", color, border: `1px solid ${color}40`, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, letterSpacing: "0.08em" }}>
                {label.toUpperCase()}
              </span>
              {volume > 0 && <span style={{ fontFamily: "var(--font-space)", fontSize: 10, color: "rgba(248,248,255,0.35)" }}>{(volume / 1000).toFixed(1)}t</span>}
              {session.cardioLog?.distanceKm && <span style={{ fontFamily: "var(--font-space)", fontSize: 10, color: "rgba(248,248,255,0.35)" }}>{session.cardioLog.distanceKm} km</span>}
            </div>
            <p style={{ fontSize: 11, color: "rgba(248,248,255,0.35)" }}>{dateStr} · {session.duration} min</p>
          </div>
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ type: "spring", stiffness: 400, damping: 30 }}>
            <ChevronDown size={15} style={{ color: "rgba(248,248,255,0.3)" }} />
          </motion.div>
        </button>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} style={{ overflow: "hidden" }}>
              <div style={{ padding: "0 16px 16px", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 12 }}>
                {isCardio && session.cardioLog && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {session.cardioLog.distanceKm && <MiniStat label="Distance" value={`${session.cardioLog.distanceKm} km`} />}
                    {session.cardioLog.avgPaceMinPerKm && <MiniStat label="Allure" value={`${session.cardioLog.avgPaceMinPerKm} min/km`} />}
                    {session.cardioLog.avgHeartRate && <MiniStat label="FC moy." value={`${session.cardioLog.avgHeartRate} bpm`} icon={<Heart size={10} style={{ color: DANGER }} />} />}
                    {session.cardioLog.route && <MiniStat label="Parcours" value={session.cardioLog.route} icon={<MapPin size={10} style={{ color: SUCCESS }} />} />}
                  </div>
                )}
                {!isCardio && session.exercises.map((ex) => {
                  const exVol = ex.sets.reduce((s, set) => s + set.reps * set.weightKg, 0);
                  return (
                    <div key={ex.id} style={{ background: "var(--surface-3)", borderRadius: 12, padding: 12, marginBottom: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{ex.exerciseName}</p>
                        {exVol > 0 && <span style={{ fontFamily: "var(--font-space)", fontSize: 10, color: "rgba(248,248,255,0.3)" }}>{exVol} kg vol.</span>}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {ex.sets.map((set, i) => (
                          <span key={i} style={{ fontFamily: "var(--font-space)", fontSize: 11, fontWeight: 500, background: `${ACCENT}12`, color: ACCENT, padding: "4px 8px", borderRadius: 8 }}>
                            {set.reps}×{set.weightKg}kg
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </Card3D>
  );
}

function MiniStat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div style={{ background: "var(--surface-3)", borderRadius: 10, padding: "8px 10px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
        {icon}<span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", color: "rgba(248,248,255,0.25)", textTransform: "uppercase" }}>{label}</span>
      </div>
      <span style={{ fontFamily: "var(--font-space)", fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{value}</span>
    </div>
  );
}
