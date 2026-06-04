"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, Dumbbell, Clock, TrendingUp, Zap, Flame, Target,
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

// ─── Types ───────────────────────────────────────────────────────────────────
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

// ─── Helpers ─────────────────────────────────────────────────────────────────
function greeting(): string {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return "Bonjour Baptiste 👋";
  if (h >= 12 && h < 18) return "Bon après-midi Baptiste";
  return "Bonsoir Baptiste";
}

function fmtEuro(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

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

// ─── Fade-in section wrapper ──────────────────────────────────────────────────
function Section({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

// ─── Animated progress bar ────────────────────────────────────────────────────
function ProgressBar({ value, max, color = "var(--primary)" }: { value: number; max: number; color?: string }) {
  const [width, setWidth] = useState(0);
  const pct = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;

  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 100);
    return () => clearTimeout(t);
  }, [pct]);

  return (
    <div className="progress-track">
      <div className="progress-fill" style={{ width: `${width}%`, background: color, transition: "width 1s ease-out" }} />
    </div>
  );
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div style={{ background: "var(--surface-2)", border: "1px solid var(--border-active)", borderRadius: 12, padding: "8px 12px" }}>
        <p style={{ color: "var(--text-tertiary)", fontSize: 11 }}>{label}</p>
        <p style={{ color: "var(--text-primary)", fontSize: 14, fontWeight: 700 }}>{payload[0].value} kg</p>
      </div>
    );
  }
  return null;
};

// ─── Add Task bottom sheet ────────────────────────────────────────────────────
function AddTaskSheet({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (title: string, priority: string) => void }) {
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
            style={{ background: "rgba(0,0,0,0.6)" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto"
            style={{ background: "var(--surface-2)", borderRadius: "20px 20px 0 0", border: "1px solid var(--border)", paddingBottom: "env(safe-area-inset-bottom)" }}
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-4" style={{ borderBottom: "1px solid var(--border)" }}>
              <p style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 16 }}>Nouvelle tâche</p>
              <button onClick={onClose} style={{ color: "var(--text-tertiary)" }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titre de la tâche…"
                className="input-dark"
              />
              <div className="flex gap-2">
                {["HIGH", "MEDIUM", "LOW"].map((p) => {
                  const s = PRIORITY_STYLE[p];
                  return (
                    <button key={p} type="button" onClick={() => setPriority(p)}
                      style={{
                        flex: 1, padding: "8px", borderRadius: 10, fontSize: 12, fontWeight: 600,
                        background: priority === p ? s.bg : "var(--surface-3)",
                        color: priority === p ? s.text : "var(--text-tertiary)",
                        border: `1px solid ${priority === p ? s.text + "40" : "var(--border)"}`,
                        transition: "all 0.15s",
                      }}>
                      {s.label}
                    </button>
                  );
                })}
              </div>
              <button type="submit"
                style={{ width: "100%", background: "var(--primary)", color: "#fff", borderRadius: 12, height: 44, fontWeight: 700, fontSize: 15 }}>
                Ajouter
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
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
  const sessionColor = workout?.sessionLabel ? SESSION_COLORS[workout.sessionLabel] : "var(--primary)";
  const sessionName = workout?.sessionLabel ? SESSION_LABELS[workout.sessionLabel] : "Session";
  const visibleTasks = tasks.filter((t) => !completedIds.has(t.id)).slice(0, 4);

  const weightChartData = (data?.weightHistory ?? []).map((d) => ({
    date: format(parseISO(d.date), "d MMM", { locale: fr }),
    Poids: d.value,
    Tendance: d.ma,
  }));

  const sportPct = sportsGoal > 0 ? (data?.weekSessions ?? 0) / sportsGoal * 100 : 0;
  const sportColor = sportPct < 50 ? "var(--warning)" : sportPct < 80 ? "var(--primary)" : "var(--success)";

  const calPct = calorieGoal > 0 && data?.avgCalories7d ? data.avgCalories7d / calorieGoal * 100 : 0;
  const calColor = calPct > 110 ? "var(--danger)" : calPct > 95 ? "var(--warning)" : "var(--primary)";

  return (
    <div className="px-4 space-y-5 pb-nav" style={{ background: "var(--background)" }}>

      {/* ── SECTION 1 : Header ─────────────────────────────────────────────── */}
      <Section delay={0}>
        <div className="flex items-start justify-between pt-6 pb-2">
          <div>
            <p className="label mb-1">Aujourd'hui</p>
            <h1 style={{ color: "var(--text-primary)", fontWeight: 800, fontSize: 24, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
              {todayFormatted}
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 4 }}>{greeting()}</p>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <button style={{ color: "var(--text-secondary)" }}>
              <Bell size={20} />
            </button>
            <button
              onClick={() => router.push("/profil")}
              style={{
                width: 42, height: 42, borderRadius: "50%",
                background: "var(--primary-glow)",
                border: "1px solid var(--border-active)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--primary)", fontWeight: 700, fontSize: 15,
              }}>
              B
            </button>
          </div>
        </div>
      </Section>

      {/* ── SECTION 2 : Card séance ────────────────────────────────────────── */}
      <Section delay={0.1}>
        <div style={{
          background: "linear-gradient(135deg, #1A1A2E 0%, #12121F 100%)",
          border: "1px solid var(--border-active)",
          borderRadius: 20,
          padding: 20,
          boxShadow: "0 0 40px rgba(100,149,237,0.08)",
        }}>
          {workout ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <span style={{
                  background: sessionColor + "20", color: sessionColor,
                  fontSize: 11, fontWeight: 700, padding: "4px 10px",
                  borderRadius: 999, letterSpacing: "0.04em",
                }}>
                  {workout.sessionLabel ?? workout.type}
                </span>
                {data?.todayWorkout
                  ? <span style={{ fontSize: 11, color: "var(--success)" }}>● Aujourd'hui</span>
                  : <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Dernière séance</span>}
              </div>

              <p style={{ color: "var(--text-tertiary)", fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                Séance du jour
              </p>
              <p style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 22, letterSpacing: "-0.02em", marginBottom: 16 }}>
                {sessionName}
              </p>

              {/* Stats row */}
              <div className="grid grid-cols-3" style={{ borderTop: "1px solid var(--border)", paddingTop: 16, gap: 0 }}>
                {[
                  { icon: <Clock size={14} />, label: "Durée", value: `${workout.duration}min` },
                  {
                    icon: <Dumbbell size={14} />, label: workout.distanceKm ? "Distance" : "Exercices",
                    value: workout.distanceKm ? `${workout.distanceKm}km` : `${workout.exerciseCount} ex.`
                  },
                  {
                    icon: <TrendingUp size={14} />, label: "Volume",
                    value: workout.totalVolume > 0 ? `${(workout.totalVolume / 1000).toFixed(1)}t` : "—"
                  },
                ].map((s, i) => (
                  <div key={i} style={{
                    padding: "0 16px",
                    borderLeft: i > 0 ? "1px solid var(--border)" : "none",
                    textAlign: i === 1 ? "center" : i === 2 ? "right" : "left",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: i === 2 ? "flex-end" : i === 1 ? "center" : "flex-start", color: "var(--text-tertiary)", marginBottom: 4 }}>
                      {s.icon}
                      <span style={{ fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</span>
                    </div>
                    <p style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 15, fontVariantNumeric: "tabular-nums" }}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Weekly progress */}
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
                <div className="flex justify-between" style={{ marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{data?.weekSessions ?? 0}/{sportsGoal} séances cette semaine</span>
                  <span style={{ fontSize: 11, color: "var(--primary)", fontWeight: 700 }}>{Math.round(sportPct)}%</span>
                </div>
                <ProgressBar value={data?.weekSessions ?? 0} max={sportsGoal} color={sportColor} />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center py-6 gap-3">
              <Dumbbell size={32} style={{ color: "var(--text-tertiary)" }} />
              <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Aucune séance aujourd'hui</p>
              <button
                onClick={() => router.push("/sport?modal=true")}
                style={{
                  background: "var(--primary)", color: "#fff",
                  padding: "10px 20px", borderRadius: 12, fontSize: 14, fontWeight: 700,
                }}>
                Enregistrer une séance →
              </button>
            </div>
          )}
        </div>
      </Section>

      {/* ── SECTION 3 : Métriques rapides ────────────────────────────────────── */}
      <Section delay={0.2}>
        <div className="grid grid-cols-2 gap-3">
          {/* Poids */}
          <MetricCard
            label="POIDS"
            value={data?.latestWeight ? `${data.latestWeight.value}` : "—"}
            unit="kg"
            change={data?.latestWeight?.previousValue != null && data?.latestWeight?.value != null
              ? data.latestWeight.value - data.latestWeight.previousValue
              : null}
          />
          {/* Calories */}
          <div style={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 20, padding: 16 }}>
            <p className="label mb-1">CALORIES</p>
            <p style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 22, fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>
              {data?.todayCalories?.calories ?? "—"}
              <span style={{ fontSize: 13, fontWeight: 400, color: "var(--text-tertiary)", marginLeft: 3 }}>kcal</span>
            </p>
            {data?.todayCalories && (
              <div style={{ marginTop: 8 }}>
                <ProgressBar value={data.todayCalories.calories} max={calorieGoal} color={calColor} />
                <p style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 4 }}>
                  Objectif {calorieGoal} kcal
                </p>
              </div>
            )}
          </div>
          {/* Sommeil */}
          <MetricCard
            label="SOMMEIL"
            value={data?.lastSleep ? `${data.lastSleep.duration.toFixed(1)}h` : "—"}
            sub={data?.lastSleep?.score != null ? `Score ${data.lastSleep.score}/100` : undefined}
          />
          {/* Patrimoine */}
          <MetricCard
            label="PATRIMOINE"
            value={data?.totalPatrimoine ? fmtEuro(data.totalPatrimoine.value) : "—"}
            change={data?.totalPatrimoine?.change7d ?? null}
            changeFormat="euro"
            changeSuffix="/7j"
          />
        </div>
      </Section>

      {/* ── SECTION 4 : Objectifs ─────────────────────────────────────────────── */}
      <Section delay={0.3}>
        <div style={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 20, padding: 20 }}>
          <div className="flex items-center justify-between mb-5">
            <p style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 16 }}>Objectifs</p>
            <button
              onClick={() => router.push("/profil")}
              style={{ color: "var(--primary)", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
              Régler <ChevronRight size={13} />
            </button>
          </div>

          <div className="space-y-5">
            <GoalRow
              icon={<Zap size={15} style={{ color: "var(--primary)" }} />}
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
                icon={<Target size={15} style={{ color: "var(--primary)" }} />}
                label="Objectif de poids"
                current={0}
                goal={100}
                unit={`${data.latestWeight.value} kg → ${weightGoal} kg`}
                color="var(--success)"
                customPct={Math.max(0, Math.min(100, (1 - Math.abs(data.latestWeight.value - weightGoal) / Math.max(data.latestWeight.value, weightGoal)) * 100))}
              />
            )}
          </div>
        </div>
      </Section>

      {/* ── SECTION 5 : Tâches ───────────────────────────────────────────────── */}
      <Section delay={0.4}>
        <div style={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 20, padding: 20 }}>
          <div className="flex items-center justify-between mb-4">
            <p style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 16 }}>À faire aujourd'hui</p>
            <span style={{
              background: "var(--primary-glow)", color: "var(--primary)",
              fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
            }}>
              {visibleTasks.length}
            </span>
          </div>

          {visibleTasks.length === 0 ? (
            <p style={{ color: "var(--text-secondary)", fontSize: 14, textAlign: "center", padding: "16px 0" }}>
              Toutes les tâches sont complétées 🎉
            </p>
          ) : (
            <div className="space-y-2">
              {visibleTasks.map((task) => {
                const p = PRIORITY_STYLE[task.priority];
                const done = completedIds.has(task.id);
                return (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: done ? 0.4 : 1, x: 0 }}
                    className="flex items-center gap-3"
                    style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 14, padding: "12px 14px" }}
                  >
                    <button onClick={() => handleToggleTask(task.id)} className="flex-shrink-0">
                      {done
                        ? <CheckCircle2 size={20} style={{ color: "var(--primary)" }} />
                        : <Circle size={20} style={{ color: "var(--border-active)" }} />}
                    </button>
                    <p style={{ flex: 1, fontSize: 14, fontWeight: 500, color: done ? "var(--text-tertiary)" : "var(--text-primary)", textDecoration: done ? "line-through" : "none" }}>
                      {task.title}
                    </p>
                    <span style={{ fontSize: 10, fontWeight: 600, background: p.bg, color: p.text, padding: "3px 7px", borderRadius: 6 }}>
                      {p.label}
                    </span>
                    <button onClick={() => handleDeleteTask(task.id)} style={{ color: "var(--text-tertiary)" }} className="flex-shrink-0">
                      <Trash2 size={13} />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}

          <button
            onClick={() => setAddTaskOpen(true)}
            className="flex items-center gap-2 mt-4"
            style={{ color: "var(--primary)", fontSize: 13, fontWeight: 600 }}
          >
            <Plus size={14} /> Ajouter une tâche
          </button>
        </div>
      </Section>

      {/* ── SECTION 6 : Graphique poids ─────────────────────────────────────── */}
      <Section delay={0.5}>
        <div style={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 20, padding: 20 }}>
          <div className="flex items-center justify-between mb-4">
            <p style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 16 }}>Évolution du poids</p>
            <span style={{ fontSize: 11, background: "var(--surface-3)", color: "var(--text-tertiary)", padding: "3px 8px", borderRadius: 8 }}>30 jours</span>
          </div>

          {weightChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={weightChartData} margin={{ top: 5, right: 5, bottom: 0, left: -30 }}>
                <defs>
                  <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6495ED" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#6495ED" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "var(--text-tertiary)", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="Poids"
                  stroke="#6495ED"
                  strokeWidth={2.5}
                  fill="url(#weightGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: "#fff", stroke: "#6495ED", strokeWidth: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="Tendance"
                  stroke="rgba(100,149,237,0.4)"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center" style={{ height: 120, color: "var(--text-tertiary)", fontSize: 13 }}>
              Aucune donnée de poids
            </div>
          )}
        </div>
      </Section>

      {/* Bottom sheet add task */}
      <AddTaskSheet open={addTaskOpen} onClose={() => setAddTaskOpen(false)} onAdd={handleAddTask} />
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function MetricCard({
  label, value, unit, sub, change, changeFormat = "kg", changeSuffix = ""
}: {
  label: string; value: string; unit?: string; sub?: string;
  change?: number | null; changeFormat?: string; changeSuffix?: string;
}) {
  const isPositive = change != null && change > 0;
  const isNegative = change != null && change < 0;
  const changeStr = change != null
    ? changeFormat === "euro"
      ? `${change >= 0 ? "+" : ""}${new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(change)}${changeSuffix}`
      : `${change >= 0 ? "+" : ""}${change.toFixed(1)} ${changeFormat}${changeSuffix}`
    : null;

  return (
    <div style={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 20, padding: 16 }}>
      <p className="label mb-1">{label}</p>
      <p style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 22, fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>
        {value}
        {unit && <span style={{ fontSize: 13, fontWeight: 400, color: "var(--text-tertiary)", marginLeft: 3 }}>{unit}</span>}
      </p>
      {sub && <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>{sub}</p>}
      {changeStr && (
        <p style={{ fontSize: 11, fontWeight: 600, marginTop: 4, color: isPositive ? "var(--danger)" : isNegative ? "var(--success)" : "var(--text-tertiary)" }}>
          {changeStr}
        </p>
      )}
    </div>
  );
}

function GoalRow({
  icon, label, current, goal, unit, color, customPct
}: {
  icon: React.ReactNode; label: string; current: number; goal: number;
  unit: string; color: string; customPct?: number;
}) {
  const _pct = customPct ?? (goal > 0 ? Math.min(Math.round(current / goal * 100), 100) : 0);
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon}
          <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>{label}</span>
        </div>
        <span style={{ fontSize: 12, color, fontWeight: 700 }}>{unit}</span>
      </div>
      <ProgressBar value={customPct ?? current} max={customPct != null ? 100 : goal} color={color} />
    </div>
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
        <div className="skeleton w-10 h-10 rounded-full" />
      </div>
      <div className="skeleton h-44 rounded-2xl" />
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
      </div>
      <div className="skeleton h-40 rounded-2xl" />
      <div className="skeleton h-48 rounded-2xl" />
      <div className="skeleton h-48 rounded-2xl" />
    </div>
  );
}
