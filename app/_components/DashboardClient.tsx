"use client";

import { useState, useEffect } from "react";
import { Scale, Flame, Moon, CheckCircle2, Dumbbell, Timer, Wallet, TrendingUp, TrendingDown, UserCircle, Target } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

type DashboardData = {
  latestWeight: { weight: number; date: string } | null;
  todayNutrition: { calories: number } | null;
  latestSleep: { duration: number; quality: number } | null;
  nextTask: { title: string; priority: string } | null;
  workoutStreak: number;
  lastSession: { date: string; type: string; sessionLabel: string | null; duration: number; distanceKm: number | null; volume: number } | null;
  finance: { bankBalance: number; totalValue: number; total: number; variation7j: number | null } | null;
  weightHistory: { date: string; weight: number; ma: number }[];
  caloriesHistory: { date: string; calories: number }[];
};

const ACCENT = "#6495ED";
const GOAL_CAL = 2500; // default, réel dans localStorage

function greeting(): string {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return "Bonjour Baptiste 👋";
  if (h >= 12 && h < 18) return "Bon après-midi Baptiste";
  return "Bonsoir Baptiste";
}

const priorityColors: Record<string, string> = {
  HIGH: "text-red-400", MEDIUM: "text-amber-400", LOW: "text-emerald-400",
};

const sessionLabelColors: Record<string, string> = {
  PUSH: "bg-blue-500/20 text-blue-300", PULL: "bg-emerald-500/20 text-emerald-300",
  LEGS: "bg-orange-500/20 text-orange-300", FULL_BODY: "bg-purple-500/20 text-purple-300",
  RUNNING: "bg-red-500/20 text-red-300", CYCLING: "bg-cyan-500/20 text-cyan-300",
};

export default function DashboardClient({ data }: { data: DashboardData }) {
  const todayLabel = format(new Date(), "EEEE d MMMM", { locale: fr });
  const greeting_ = greeting();
  const [calorieGoal, setCalorieGoal] = useState(2500);
  const [weightGoal, setWeightGoal] = useState<number | null>(null);
  const [sportsGoal, setSportsGoal] = useState(5);

  useEffect(() => {
    const cg = localStorage.getItem("calorie_goal");
    const wg = localStorage.getItem("weight_goal_kg");
    const sg = localStorage.getItem("sports_goal_week");
    if (cg) setCalorieGoal(parseInt(cg));
    if (wg) setWeightGoal(parseFloat(wg));
    if (sg) setSportsGoal(parseInt(sg));
  }, []);

  const weightChartData = data.weightHistory.map((d) => ({
    date: format(parseISO(d.date), "d MMM", { locale: fr }),
    Poids: d.weight,
    Tendance: d.ma,
  }));

  const calChartData = data.caloriesHistory.map((d) => ({
    date: format(parseISO(d.date), "EEE", { locale: fr }),
    Calories: d.calories,
  }));

  const fmtEuro = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

  const avgCal7 = data.caloriesHistory.length
    ? Math.round(data.caloriesHistory.reduce((s, d) => s + d.calories, 0) / data.caloriesHistory.length)
    : 0;

  return (
    <div className="px-4 space-y-4">
      {/* Header avec icône profil */}
      <div className="flex items-start justify-between pt-5 pb-1">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">{greeting_}</h1>
          <p className="text-xs text-zinc-500 mt-0.5">{todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1)}</p>
        </div>
        <Link href="/profil" className="w-10 h-10 rounded-xl bg-[#6495ED]/15 flex items-center justify-center text-[#6495ED] hover:bg-[#6495ED]/25 transition-colors mt-0.5">
          <UserCircle size={20} />
        </Link>
      </div>

      {/* Résumé du jour */}
      <div className="card-dark p-4">
        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">Aujourd'hui</p>
        <div className="grid grid-cols-2 gap-2.5">
          <StatCard icon={<Scale size={15} className="text-[#6495ED]" />} label="Poids" value={data.latestWeight ? `${data.latestWeight.weight} kg` : "—"} />
          <StatCard icon={<Flame size={15} className="text-orange-400" />} label="Calories" value={data.todayNutrition ? `${data.todayNutrition.calories} kcal` : "—"} />
          <StatCard icon={<Moon size={15} className="text-blue-400" />} label="Sommeil" value={data.latestSleep ? `${data.latestSleep.duration.toFixed(1)}h · ★${data.latestSleep.quality}` : "—"} />
          <StatCard
            icon={<span className="text-base">🔥</span>}
            label="Streak sport"
            value={`${data.workoutStreak}j`}
            accent={data.workoutStreak > 0}
          />
        </div>

        {data.nextTask && (
          <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center gap-2">
            <CheckCircle2 size={13} className="text-zinc-600 flex-shrink-0" />
            <span className="text-[11px] text-zinc-500">Prochain :</span>
            <span className={`text-[11px] font-medium truncate ${priorityColors[data.nextTask.priority]}`}>
              {data.nextTask.title}
            </span>
          </div>
        )}
      </div>

      {/* Dernière session sport */}
      {data.lastSession && (
        <div className="card-dark p-4 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${data.lastSession.type === "STRENGTH" ? "bg-[#6495ED]/15" : "bg-red-500/15"}`}>
            {data.lastSession.type === "STRENGTH"
              ? <Dumbbell size={18} className="text-[#6495ED]" />
              : <Timer size={18} className="text-red-400" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-white">Dernière session</p>
              {data.lastSession.sessionLabel && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${sessionLabelColors[data.lastSession.sessionLabel] ?? "bg-zinc-700 text-zinc-300"}`}>
                  {data.lastSession.sessionLabel}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500">
              {format(parseISO(data.lastSession.date), "d MMM", { locale: fr })} · {data.lastSession.duration} min
              {data.lastSession.distanceKm ? ` · ${data.lastSession.distanceKm} km` : ""}
              {data.lastSession.volume > 0 ? ` · ${Math.round(data.lastSession.volume / 1000)}t` : ""}
            </p>
          </div>
        </div>
      )}

      {/* Finance snapshot */}
      {data.finance && (
        <div className="card-dark p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
            <Wallet size={18} className="text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Patrimoine total</p>
            <p className="text-base font-bold text-[#6495ED]">{fmtEuro(data.finance.total)}</p>
          </div>
          {data.finance.variation7j !== null && (
            <div className={`flex items-center gap-1 text-sm font-semibold ${data.finance.variation7j >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {data.finance.variation7j >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {data.finance.variation7j >= 0 ? "+" : ""}{fmtEuro(data.finance.variation7j)}
            </div>
          )}
        </div>
      )}

      {/* Objectifs de la semaine */}
      <div className="card-dark p-4">
        <div className="flex items-center gap-2 mb-3">
          <Target size={15} className="text-[#6495ED]" />
          <p className="text-sm font-semibold text-white">Objectifs de la semaine</p>
        </div>
        <div className="space-y-3">
          <GoalRow
            label="Sessions sport"
            current={data.workoutStreak}
            goal={sportsGoal}
            unit="session(s)"
            color="#6495ED"
          />
          {data.latestWeight && weightGoal && (
            <GoalRow
              label="Poids cible"
              current={data.latestWeight.weight}
              goal={weightGoal}
              unit="kg"
              color="#10b981"
              reverse
            />
          )}
          {avgCal7 > 0 && (
            <GoalRow
              label="Calories moy. 7j"
              current={avgCal7}
              goal={calorieGoal}
              unit="kcal"
              color="#f97316"
            />
          )}
        </div>
      </div>

      {/* Graphique poids + tendance */}
      <div className="card-dark p-4">
        <p className="text-sm font-semibold text-white mb-3">Poids — 30 jours</p>
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={weightChartData} margin={{ top: 5, right: 5, bottom: 0, left: -22 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" />
            <XAxis dataKey="date" tick={{ fill: "#555", fontSize: 9 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fill: "#555", fontSize: 10 }} tickLine={false} axisLine={false} domain={["dataMin - 0.5", "dataMax + 0.5"]} />
            <Tooltip contentStyle={{ background: "#1A1A1A", border: "1px solid #333", borderRadius: 8, fontSize: 11 }} />
            <Line type="monotone" dataKey="Poids" stroke={ACCENT} strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
            <Line type="monotone" dataKey="Tendance" stroke={ACCENT} strokeWidth={1} dot={false} strokeDasharray="4 3" opacity={0.5} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Graphique calories */}
      <div className="card-dark p-4">
        <p className="text-sm font-semibold text-white mb-3">Calories — 7 jours</p>
        <ResponsiveContainer width="100%" height={130}>
          <BarChart data={calChartData} margin={{ top: 5, right: 5, bottom: 0, left: -22 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: "#555", fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: "#555", fontSize: 10 }} tickLine={false} axisLine={false} domain={[1200, "dataMax + 200"]} />
            <Tooltip contentStyle={{ background: "#1A1A1A", border: "1px solid #333", borderRadius: 8, fontSize: 11 }} formatter={(v: any) => [`${v} kcal`]} />
            <ReferenceLine y={GOAL_CAL} stroke={ACCENT} strokeDasharray="4 3" opacity={0.5} />
            <Bar dataKey="Calories" fill={ACCENT} radius={[4, 4, 0, 0]} opacity={0.8} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, accent = false }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-[#111] rounded-xl p-3 flex flex-col gap-1">
      <div className="flex items-center gap-1.5">{icon}<span className="text-[10px] text-zinc-500 uppercase tracking-wide font-medium">{label}</span></div>
      <span className={`text-base font-bold ${accent ? "text-[#6495ED]" : "text-white"}`}>{value}</span>
    </div>
  );
}

function GoalRow({ label, current, goal, unit, color, reverse = false }: {
  label: string; current: number; goal: number; unit: string; color: string; reverse?: boolean;
}) {
  // reverse=true : moins c'est mieux (ex: poids vers objectif de perte)
  const pct = reverse
    ? Math.max(0, Math.min(100, 100 - Math.abs(current - goal) / goal * 100))
    : Math.min(100, Math.round((current / goal) * 100));
  const isGood = reverse ? current <= goal : pct >= 80;
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-zinc-400">{label}</span>
        <span className="text-xs font-semibold" style={{ color }}>
          {current}{typeof current === "number" && !Number.isInteger(current) ? "" : ""} / {goal} {unit}
        </span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: isGood ? "#10b981" : color }} />
      </div>
    </div>
  );
}
