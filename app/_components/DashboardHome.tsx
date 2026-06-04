"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Dumbbell, Clock, TrendingUp, Zap, Flame, Target,
  CheckCircle2, Circle, Trash2, Plus, X, ChevronRight,
} from "lucide-react";
import {
  Line, XAxis, Tooltip, ResponsiveContainer,
  Area, AreaChart, CartesianGrid,
} from "recharts";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Card3D from "@/components/Card3D";
import PulsingGlow from "@/components/PulsingGlow";
import FlipNumber from "@/components/FlipNumber";

// ─── Types ────────────────────────────────────────────────────────────────────
type WorkoutInfo = {
  type: string;
  sessionLabel: string | null;
  duration: number;
  exerciseCount: number;
  totalVolume: number;
  distanceKm: number | null;
};

type DashboardData = {
  todayWorkout: WorkoutInfo | null;
  lastWorkout: WorkoutInfo | null;
  weekSessions: number;
  latestWeight: { value: number; date: string; previousValue: number | null } | null;
  todayCalories: { calories: number } | null;
  avgCalories7d: number | null;
  lastSleep: { duration: number; quality: number; score: number | null } | null;
  totalPatrimoine: { value: number; change7d: number | null } | null;
  pendingTasks: { id: string; title: string; priority: string; scope: string }[];
  weightHistory: { date: string; value: number; ma: number }[];
};

// ─── Constants ────────────────────────────────────────────────────────────────
const SESSION_COLORS: Record<string, string> = {
  PUSH: "#6495ED", PULL: "#34D399", LEGS: "#F59E0B",
  RUNNING: "#F87171", CARDIO: "#F87171", FULL_BODY: "#A78BFA", OTHER: "#94A3B8",
};
const SESSION_LABELS: Record<string, string> = {
  PUSH: "Push Day", PULL: "Pull Day", LEGS: "Leg Day",
  RUNNING: "Running", CARDIO: "Cardio", FULL_BODY: "Full Body", OTHER: "Autre",
};
const PRIORITY_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  HIGH:   { bg: "rgba(248,113,113,0.12)", text: "#F87171",  label: "Haute" },
  MEDIUM: { bg: "rgba(251,191,36,0.12)",  text: "#FBBF24",  label: "Moy." },
  LOW:    { bg: "rgba(255,255,255,0.06)", text: "rgba(255,255,255,0.35)", label: "Basse" },
};
const SPRING = { type: "spring", stiffness: 300, damping: 30 } as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getGreetingText(): string {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return "Bonjour Baptiste";
  if (h >= 12 && h < 18) return "Bon après-midi Baptiste";
  return "Bonsoir Baptiste";
}

function fmtEuro(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

// ─── Typewriter greeting ──────────────────────────────────────────────────────
function TypewriterGreeting() {
  const full = getGreetingText();
  const [displayed, setDisplayed] = useState("");
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) { setDisplayed(full); return; }
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setDisplayed(full.slice(0, i));
      if (i >= full.length) clearInterval(iv);
    }, 45);
    return () => clearInterval(iv);
  }, [full, reduced]);

  return (
    <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, marginTop: 4 }}>
      {displayed}
      {displayed.length < full.length && (
        <span style={{ opacity: 0.5, animation: "pulseGlow 0.8s ease-in-out infinite alternate" }}>|</span>
      )}
    </p>
  );
}

// ─── Avatar with rotating conic gradient border ───────────────────────────────
function AvatarButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ position: "relative", width: 44, height: 44, borderRadius: "50%", flexShrink: 0 }}
      aria-label="Profil"
    >
      {/* Rotating border */}
      <span
        aria-hidden
        style={{
          position: "absolute",
          inset: -1.5,
          borderRadius: "50%",
          background: "conic-gradient(from 0deg, #6495ED, #34D399, #F59E0B, #6495ED)",
          animation: "rotateBorder 4s linear infinite",
          zIndex: 0,
        }}
      />
      {/* Inner fill */}
      <span
        style={{
          position: "absolute",
          inset: 2,
          borderRadius: "50%",
          background: "var(--surface-2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1,
          color: "var(--primary)",
          fontWeight: 700,
          fontSize: 16,
        }}
      >
        B
      </span>
    </button>
  );
}

// ─── Section fade-in wrapper ──────────────────────────────────────────────────
function Section({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.32, 0.72, 0, 1] }}
    >
      {children}
    </motion.div>
  );
}

// ─── Beam progress bar ────────────────────────────────────────────────────────
function BeamProgress({ value, max, color = "var(--primary)" }: { value: number; max: number; color?: string }) {
  const [width, setWidth] = useState(0);
  const pct = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;

  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 120);
    return () => clearTimeout(t);
  }, [pct]);

  return (
    <div className="progress-track">
      <div
        className="progress-fill beam-progress"
        style={{
          width: `${width}%`,
          background: `linear-gradient(90deg, ${color}aa, ${color})`,
          transition: "width 1s cubic-bezier(0.32,0.72,0,1)",
          boxShadow: `0 0 8px ${color}60`,
        }}
      />
    </div>
  );
}

// ─── Custom chart tooltip ─────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div style={{
        background: "rgba(26,26,46,0.95)",
        border: "1px solid rgba(100,149,237,0.4)",
        borderRadius: 12,
        padding: "8px 12px",
        backdropFilter: "blur(8px)",
      }}>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 11 }}>{label}</p>
        <p style={{ color: "#fff", fontSize: 15, fontWeight: 700 }}>
          <FlipNumber value={payload[0].value} /> kg
        </p>
      </div>
    );
  }
  return null;
};

// ─── Metric card ─────────────────────────────────────────────────────────────
function MetricCard({
  label, value, unit, sub, change, changeFormat = "kg", changeSuffix = "",
}: {
  label: string; value: string; unit?: string; sub?: string;
  change?: number | null; changeFormat?: string; changeSuffix?: string;
}) {
  const isPositive = change != null && change > 0;
  const isNegative = change != null && change < 0;
  const changeStr = change != null
    ? changeFormat === "euro"
      ? `${change >= 0 ? "+" : ""}${fmtEuro(change)}${changeSuffix}`
      : `${change >= 0 ? "+" : ""}${change.toFixed(1)} ${changeFormat}${changeSuffix}`
    : null;

  return (
    <Card3D maxRotation={5}>
      <div style={{
        background: "var(--surface-1)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 20,
        padding: 16,
        height: "100%",
      }}>
        <p style={{ fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.3)", marginBottom: 6 }}>
          {label}
        </p>
        <p style={{ color: "#fff", fontWeight: 700, fontSize: 22, lineHeight: 1.1 }}>
          <FlipNumber value={value} />
          {unit && <span style={{ fontSize: 13, fontWeight: 400, color: "rgba(255,255,255,0.35)", marginLeft: 3 }}>{unit}</span>}
        </p>
        {sub && <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>{sub}</p>}
        {changeStr && (
          <p style={{ fontSize: 11, fontWeight: 600, marginTop: 4, color: isPositive ? "#F87171" : isNegative ? "#4ADE80" : "rgba(255,255,255,0.4)" }}>
            {changeStr}
          </p>
        )}
      </div>
    </Card3D>
  );
}

// ─── Goal row ─────────────────────────────────────────────────────────────────
function GoalRow({
  icon, label, current, goal, unit, color, customPct,
}: {
  icon: React.ReactNode; label: string; current: number; goal: number;
  unit: string; color: string; customPct?: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
        <div className="flex items-center gap-2">
          {icon}
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>{label}</span>
        </div>
        <span style={{ fontSize: 12, color, fontWeight: 700 }}>{unit}</span>
      </div>
      <BeamProgress value={customPct ?? current} max={customPct != null ? 100 : goal} color={color} />
    </div>
  );
}

// ─── Add task bottom sheet ────────────────────────────────────────────────────
function AddTaskSheet({
  open, onClose, onAdd,
}: {
  open: boolean; onClose: () => void;
  onAdd: (title: string, priority: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("MEDIUM");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd(title.trim(), priority);
    setTitle("");
    setPriority("MEDIUM");
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto"
            style={{
              background: "rgba(22,22,38,0.98)",
              borderRadius: "24px 24px 0 0",
              border: "1px solid rgba(255,255,255,0.07)",
              borderBottom: "none",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={SPRING}
          >
            {/* Drag handle */}
            <div style={{ width: 36, height: 4, borderRadius: 999, background: "rgba(255,255,255,0.1)", margin: "12px auto 0" }} />
            <div className="flex items-center justify-between px-5 pt-4 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <p style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>Nouvelle tâche</p>
              <button onClick={onClose} style={{ color: "rgba(255,255,255,0.4)", padding: 4 }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titre de la tâche…"
                className="input-dark"
              />
              <div className="flex gap-2">
                {(["HIGH", "MEDIUM", "LOW"] as const).map((p) => {
                  const s = PRIORITY_STYLE[p];
                  return (
                    <button key={p} type="button" onClick={() => setPriority(p)}
                      style={{
                        flex: 1, padding: "9px 4px", borderRadius: 12, fontSize: 12, fontWeight: 600,
                        background: priority === p ? s.bg : "var(--surface-3)",
                        color: priority === p ? s.text : "rgba(255,255,255,0.35)",
                        border: `1px solid ${priority === p ? s.text + "40" : "rgba(255,255,255,0.07)"}`,
                        transition: "all 0.18s cubic-bezier(0.32,0.72,0,1)",
                      }}>
                      {s.label}
                    </button>
                  );
                })}
              </div>
              <button
                type="submit"
                className="shimmer-btn"
                style={{
                  width: "100%",
                  background: "linear-gradient(135deg, #6495ED, #4A7BD4)",
                  color: "#fff",
                  borderRadius: 14,
                  height: 48,
                  fontWeight: 700,
                  fontSize: 15,
                  boxShadow: "0 4px 20px rgba(100,149,237,0.3)",
                }}
              >
                Ajouter
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="px-4 space-y-5 pb-nav pt-6">
      <div className="flex justify-between items-start">
        <div>
          <div className="skeleton h-3 w-20 mb-2" />
          <div className="skeleton h-7 w-48 mb-2" />
          <div className="skeleton h-4 w-36" />
        </div>
        <div className="skeleton w-11 h-11 rounded-full" />
      </div>
      <div className="skeleton h-52 rounded-2xl" />
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
      </div>
      <div className="skeleton h-44 rounded-2xl" />
      <div className="skeleton h-48 rounded-2xl" />
      <div className="skeleton h-48 rounded-2xl" />
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function DashboardHome() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<{ id: string; title: string; priority: string; scope: string }[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [calorieGoal, setCalorieGoal] = useState(2500);
  const [sportsGoal, setSportsGoal] = useState(5);
  const [weightGoal, setWeightGoal] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    setCalorieGoal(parseInt(localStorage.getItem("calorie_goal") ?? "2500"));
    setSportsGoal(parseInt(localStorage.getItem("sports_goal_week") ?? "5"));
    const wg = localStorage.getItem("weight_goal_kg");
    if (wg) setWeightGoal(parseFloat(wg));

    fetch("/api/dashboard/home")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setTasks(d.pendingTasks ?? []);
      })
      .catch(() => toast.error("Erreur de chargement"))
      .finally(() => setLoading(false));
  }, []);

  async function handleToggleTask(id: string) {
    const newSet = new Set(completedIds);
    const wasCompleted = newSet.has(id);
    if (!wasCompleted) newSet.add(id); else newSet.delete(id);
    setCompletedIds(newSet);
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !wasCompleted }),
    });
    if (!wasCompleted && Array.from(newSet).length === tasks.length) {
      toast.success("Toutes les tâches complétées 🎉");
    }
  }

  async function handleDeleteTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
  }

  async function handleAddTask(title: string, priority: string) {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, priority, scope: "DAY", dueDate: new Date().toISOString().split("T")[0] }),
    });
    if (res.ok) {
      const task = await res.json();
      setTasks((prev) => [...prev, { id: task.id, title: task.title, priority: task.priority, scope: task.scope }]);
      toast.success("Tâche ajoutée !");
    }
  }

  if (loading) return <DashboardSkeleton />;

  const todayLabel = format(new Date(), "EEEE d MMMM yyyy", { locale: fr });
  const todayFormatted = todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1);
  const workout = data?.todayWorkout ?? data?.lastWorkout;
  const sessionColor = workout?.sessionLabel ? SESSION_COLORS[workout.sessionLabel] : "#6495ED";
  const sessionName = workout?.sessionLabel ? SESSION_LABELS[workout.sessionLabel] : "Session";
  const visibleTasks = tasks.filter((t) => !completedIds.has(t.id)).slice(0, 4);

  const weightChartData = (data?.weightHistory ?? []).map((d) => ({
    date: format(parseISO(d.date), "d MMM", { locale: fr }),
    Poids: d.value,
    Tendance: d.ma,
  }));

  const sportPct = sportsGoal > 0 ? (data?.weekSessions ?? 0) / sportsGoal * 100 : 0;
  const sportColor = sportPct < 50 ? "#FBBF24" : sportPct < 80 ? "#6495ED" : "#4ADE80";
  const calPct = calorieGoal > 0 && data?.avgCalories7d ? data.avgCalories7d / calorieGoal * 100 : 0;
  const calColor = calPct > 110 ? "#F87171" : calPct > 95 ? "#FBBF24" : "#6495ED";

  return (
    <div className="px-4 space-y-5 pb-nav" style={{ paddingTop: 0 }}>

      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <Section delay={0}>
        <div className="flex items-start justify-between" style={{ paddingTop: 28, paddingBottom: 8 }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.3)", marginBottom: 4 }}>
              Aujourd'hui
            </p>
            <h1 style={{
              color: "#fff",
              fontWeight: 800,
              fontSize: 22,
              letterSpacing: "-0.03em",
              lineHeight: 1.15,
              fontFamily: "var(--font-sans)",
            }}>
              {todayFormatted}
            </h1>
            <TypewriterGreeting />
          </div>
          <AvatarButton onClick={() => router.push("/profil")} />
        </div>
      </Section>

      {/* ── SÉANCE DU JOUR ────────────────────────────────────────────────── */}
      <Section delay={0.08}>
        <PulsingGlow intensity="medium">
          <Card3D maxRotation={6} className="animated-border-card" style={{ borderRadius: 22 }}>
            <div style={{
              background: "linear-gradient(140deg, rgba(26,26,46,0.98) 0%, rgba(18,18,31,0.98) 100%)",
              borderRadius: 22,
              padding: 20,
              position: "relative",
              overflow: "hidden",
            }}>
              {/* Subtle color wash from session type */}
              <div aria-hidden style={{
                position: "absolute",
                top: -40,
                right: -40,
                width: 160,
                height: 160,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${sessionColor}18 0%, transparent 70%)`,
                pointerEvents: "none",
              }} />

              {workout ? (
                <>
                  <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
                    <span style={{
                      background: sessionColor + "22",
                      color: sessionColor,
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "4px 10px",
                      borderRadius: 999,
                      letterSpacing: "0.04em",
                    }}>
                      {workout.sessionLabel ?? workout.type}
                    </span>
                    {data?.todayWorkout
                      ? <span style={{ fontSize: 11, color: "#4ADE80", fontWeight: 600 }}>● Aujourd'hui</span>
                      : <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Dernière séance</span>}
                  </div>

                  <p style={{ fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.3)", marginBottom: 4 }}>
                    Séance du jour
                  </p>
                  <p style={{ color: "#fff", fontWeight: 800, fontSize: 24, letterSpacing: "-0.03em", marginBottom: 18, fontFamily: "var(--font-sans)" }}>
                    {sessionName}
                  </p>

                  {/* Stats row with FlipNumbers */}
                  <div className="grid grid-cols-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16 }}>
                    {[
                      { icon: <Clock size={12} />, label: "Durée", value: `${workout.duration}`, unit: "min" },
                      {
                        icon: <Dumbbell size={12} />,
                        label: workout.distanceKm ? "Distance" : "Exercices",
                        value: workout.distanceKm ? `${workout.distanceKm}` : `${workout.exerciseCount}`,
                        unit: workout.distanceKm ? "km" : "ex.",
                      },
                      {
                        icon: <TrendingUp size={12} />,
                        label: "Volume",
                        value: workout.totalVolume > 0 ? `${(workout.totalVolume / 1000).toFixed(1)}` : "—",
                        unit: workout.totalVolume > 0 ? "t" : "",
                      },
                    ].map((s, i) => (
                      <div key={i} style={{
                        padding: "0 14px",
                        borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.06)" : "none",
                        textAlign: i === 0 ? "left" : i === 1 ? "center" : "right",
                      }}>
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          justifyContent: i === 2 ? "flex-end" : i === 1 ? "center" : "flex-start",
                          color: "rgba(255,255,255,0.3)",
                          marginBottom: 5,
                        }}>
                          {s.icon}
                          <span style={{ fontSize: 9, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</span>
                        </div>
                        <p style={{ color: "#fff", fontWeight: 700, fontSize: 17 }}>
                          <FlipNumber value={s.value} />
                          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginLeft: 2 }}>{s.unit}</span>
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Weekly progress */}
                  <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="flex justify-between" style={{ marginBottom: 7 }}>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                        {data?.weekSessions ?? 0}/{sportsGoal} séances cette semaine
                      </span>
                      <span style={{ fontSize: 11, color: "#6495ED", fontWeight: 700 }}>
                        <FlipNumber value={Math.round(sportPct)} />%
                      </span>
                    </div>
                    <BeamProgress value={data?.weekSessions ?? 0} max={sportsGoal} color={sportColor} />
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center py-6 gap-4">
                  <div style={{
                    width: 56, height: 56, borderRadius: "50%",
                    background: "rgba(100,149,237,0.1)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Dumbbell size={26} style={{ color: "#6495ED" }} />
                  </div>
                  <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 14 }}>Aucune séance aujourd'hui</p>
                  <button
                    className="shimmer-btn"
                    onClick={() => router.push("/sport?modal=true")}
                    style={{
                      background: "linear-gradient(135deg, #6495ED, #4A7BD4)",
                      color: "#fff",
                      padding: "11px 22px",
                      borderRadius: 14,
                      fontSize: 14,
                      fontWeight: 700,
                      boxShadow: "0 4px 20px rgba(100,149,237,0.3)",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    Enregistrer une séance
                    <span style={{ fontSize: 16 }}>→</span>
                  </button>
                </div>
              )}
            </div>
          </Card3D>
        </PulsingGlow>
      </Section>

      {/* ── MÉTRIQUES RAPIDES ─────────────────────────────────────────────── */}
      <Section delay={0.16}>
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            label="POIDS"
            value={data?.latestWeight ? `${data.latestWeight.value}` : "—"}
            unit="kg"
            change={data?.latestWeight?.previousValue != null && data?.latestWeight?.value != null
              ? data.latestWeight.value - data.latestWeight.previousValue
              : null}
          />

          {/* Calories with progress */}
          <Card3D maxRotation={5}>
            <div style={{ background: "var(--surface-1)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: 16, height: "100%" }}>
              <p style={{ fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.3)", marginBottom: 6 }}>
                CALORIES
              </p>
              <p style={{ color: "#fff", fontWeight: 700, fontSize: 22, lineHeight: 1.1 }}>
                <FlipNumber value={data?.todayCalories?.calories ?? "—"} />
                <span style={{ fontSize: 13, fontWeight: 400, color: "rgba(255,255,255,0.35)", marginLeft: 3 }}>kcal</span>
              </p>
              {data?.todayCalories && (
                <div style={{ marginTop: 10 }}>
                  <BeamProgress value={data.todayCalories.calories} max={calorieGoal} color={calColor} />
                  <p style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 5 }}>
                    Objectif {calorieGoal} kcal
                  </p>
                </div>
              )}
            </div>
          </Card3D>

          <MetricCard
            label="SOMMEIL"
            value={data?.lastSleep ? `${data.lastSleep.duration.toFixed(1)}` : "—"}
            unit="h"
            sub={data?.lastSleep?.score != null ? `Score ${data.lastSleep.score}/100` : undefined}
          />

          <MetricCard
            label="PATRIMOINE"
            value={data?.totalPatrimoine ? fmtEuro(data.totalPatrimoine.value) : "—"}
            change={data?.totalPatrimoine?.change7d ?? null}
            changeFormat="euro"
            changeSuffix="/7j"
          />
        </div>
      </Section>

      {/* ── OBJECTIFS ─────────────────────────────────────────────────────── */}
      <Section delay={0.24}>
        <div style={{
          background: "var(--surface-1)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 22,
          padding: 20,
        }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
            <p style={{ color: "#fff", fontWeight: 700, fontSize: 16, letterSpacing: "-0.01em" }}>Objectifs</p>
            <button
              onClick={() => router.push("/profil")}
              style={{ color: "#6495ED", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}
            >
              Régler <ChevronRight size={13} />
            </button>
          </div>

          <div className="space-y-5">
            <GoalRow
              icon={<Zap size={15} style={{ color: "#6495ED" }} />}
              label="Sessions cette semaine"
              current={data?.weekSessions ?? 0}
              goal={sportsGoal}
              unit={`${data?.weekSessions ?? 0}/${sportsGoal}`}
              color={sportColor}
            />
            <GoalRow
              icon={<Flame size={15} style={{ color: "#FB923C" }} />}
              label="Calories moy. 7j"
              current={data?.avgCalories7d ?? 0}
              goal={calorieGoal}
              unit={`${data?.avgCalories7d ?? 0} / ${calorieGoal} kcal`}
              color={calColor}
            />
            {weightGoal && data?.latestWeight && (
              <GoalRow
                icon={<Target size={15} style={{ color: "#4ADE80" }} />}
                label="Objectif de poids"
                current={0}
                goal={100}
                unit={`${data.latestWeight.value} kg → ${weightGoal} kg`}
                color="#4ADE80"
                customPct={Math.max(0, Math.min(100,
                  (1 - Math.abs(data.latestWeight.value - weightGoal) / Math.max(data.latestWeight.value, weightGoal)) * 100
                ))}
              />
            )}
          </div>
        </div>
      </Section>

      {/* ── TÂCHES ────────────────────────────────────────────────────────── */}
      <Section delay={0.32}>
        <div style={{
          background: "var(--surface-1)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 22,
          padding: 20,
        }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
            <p style={{ color: "#fff", fontWeight: 700, fontSize: 16, letterSpacing: "-0.01em" }}>À faire aujourd'hui</p>
            <span style={{
              background: "rgba(100,149,237,0.12)",
              color: "#6495ED",
              fontSize: 11,
              fontWeight: 700,
              padding: "3px 9px",
              borderRadius: 999,
            }}>
              {visibleTasks.length}
            </span>
          </div>

          {visibleTasks.length === 0 ? (
            <motion.p
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, textAlign: "center", padding: "20px 0" }}
            >
              Toutes les tâches sont complétées 🎉
            </motion.p>
          ) : (
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {visibleTasks.map((task, i) => {
                  const p = PRIORITY_STYLE[task.priority];
                  const done = completedIds.has(task.id);
                  return (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: done ? 0.35 : 1, x: 0 }}
                      exit={{ opacity: 0, x: 12, height: 0 }}
                      transition={{ ...SPRING, delay: i * 0.04 }}
                      className="flex items-center gap-3"
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.05)",
                        borderRadius: 14,
                        padding: "12px 14px",
                      }}
                    >
                      <button onClick={() => handleToggleTask(task.id)} className="flex-shrink-0">
                        {done
                          ? <CheckCircle2 size={20} style={{ color: "#6495ED" }} />
                          : <Circle size={20} style={{ color: "rgba(100,149,237,0.5)" }} />}
                      </button>
                      <p style={{
                        flex: 1,
                        fontSize: 14,
                        fontWeight: 500,
                        color: done ? "rgba(255,255,255,0.25)" : "#fff",
                        textDecoration: done ? "line-through" : "none",
                      }}>
                        {task.title}
                      </p>
                      <span style={{ fontSize: 10, fontWeight: 600, background: p.bg, color: p.text, padding: "3px 7px", borderRadius: 6 }}>
                        {p.label}
                      </span>
                      <button onClick={() => handleDeleteTask(task.id)} style={{ color: "rgba(255,255,255,0.2)", flexShrink: 0 }}>
                        <Trash2 size={13} />
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}

          <button
            onClick={() => setAddTaskOpen(true)}
            className="flex items-center gap-2"
            style={{ color: "#6495ED", fontSize: 13, fontWeight: 600, marginTop: 16 }}
          >
            <Plus size={14} /> Ajouter une tâche
          </button>
        </div>
      </Section>

      {/* ── GRAPHIQUE POIDS ───────────────────────────────────────────────── */}
      <Section delay={0.4}>
        <div style={{
          background: "var(--surface-1)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 22,
          padding: 20,
        }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
            <p style={{ color: "#fff", fontWeight: 700, fontSize: 16, letterSpacing: "-0.01em" }}>Évolution du poids</p>
            <span style={{
              fontSize: 11,
              background: "rgba(255,255,255,0.04)",
              color: "rgba(255,255,255,0.35)",
              padding: "3px 9px",
              borderRadius: 8,
            }}>
              30 jours
            </span>
          </div>

          {weightChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={weightChartData} margin={{ top: 5, right: 5, bottom: 0, left: -30 }}>
                <defs>
                  <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6495ED" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#6495ED" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(100,149,237,0.2)", strokeWidth: 1 }} />
                <Area
                  type="monotone"
                  dataKey="Poids"
                  stroke="#6495ED"
                  strokeWidth={2.5}
                  fill="url(#weightGrad)"
                  dot={false}
                  activeDot={{ r: 5, fill: "#fff", stroke: "#6495ED", strokeWidth: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="Tendance"
                  stroke="rgba(100,149,237,0.35)"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center" style={{ height: 120, color: "rgba(255,255,255,0.25)", fontSize: 13 }}>
              Aucune donnée de poids
            </div>
          )}
        </div>
      </Section>

      <AddTaskSheet open={addTaskOpen} onClose={() => setAddTaskOpen(false)} onAdd={handleAddTask} />
    </div>
  );
}
