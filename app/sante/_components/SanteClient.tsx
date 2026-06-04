"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Upload } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import FlipNumber from "@/components/FlipNumber";
import PulsingGlow from "@/components/PulsingGlow";

const ACCENT  = "#00E5FF";
const GOLD    = "#C9A84C";
const SUCCESS = "#00E676";
const DANGER  = "#FF3D57";
const WARNING = "#FFB300";
const SPRING  = { type: "spring", stiffness: 380, damping: 35 } as const;

type SanteData = {
  weights: { date: string; weight: number }[];
  nutrition: { date: string; calories: number; protein: number; carbs: number; fat: number }[];
  sleep: { date: string; duration: number; quality: number; bedtime: string; wakeTime: string }[];
};

const weightSchema = z.object({ date: z.string(), weight: z.coerce.number().min(20).max(300) });
const nutritionSchema = z.object({
  date: z.string(), calories: z.coerce.number().int().min(0).max(10000),
  protein: z.coerce.number().min(0), carbs: z.coerce.number().min(0), fat: z.coerce.number().min(0),
});
const sleepSchema = z.object({
  date: z.string(), bedtime: z.string().regex(/^\d{2}:\d{2}$/), wakeTime: z.string().regex(/^\d{2}:\d{2}$/),
});

// Segmented control tabs
function SegControl({ value, onChange, tabs }: {
  value: string; onChange: (v: string) => void;
  tabs: { key: string; label: string }[];
}) {
  return (
    <div style={{ display: "flex", background: "var(--surface-2)", borderRadius: 14, padding: 4, position: "relative" }}>
      {tabs.map((t) => {
        const active = t.key === value;
        return (
          <button key={t.key} onClick={() => onChange(t.key)} style={{
            flex: 1, padding: "10px 4px", borderRadius: 10, fontSize: 11,
            fontWeight: 700, letterSpacing: "0.08em", border: "none", cursor: "pointer",
            fontFamily: "var(--font-sans)", minHeight: 40, position: "relative", zIndex: 1,
            background: active ? ACCENT : "transparent",
            color: active ? "#050508" : "rgba(240,238,232,0.3)",
            boxShadow: active ? `0 0 12px ${ACCENT}40` : "none",
            transition: "all 0.22s cubic-bezier(0.32,0.72,0,1)",
          }}>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

// Beam progress
function BeamProg({ value, max, color = ACCENT }: { value: number; max: number; color?: string }) {
  const [w, setW] = useState(0);
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  useEffect(() => { const t = setTimeout(() => setW(pct), 150); return () => clearTimeout(t); }, [pct]);
  return (
    <div style={{ background: "var(--surface-3)", borderRadius: 999, height: 4, overflow: "hidden" }}>
      <div className="beam-progress" style={{
        height: "100%", borderRadius: 999, width: `${w}%`,
        background: `linear-gradient(90deg, ${color}88, ${color})`,
        boxShadow: `0 0 8px ${color}50`,
        transition: "width 1.2s cubic-bezier(0.32,0.72,0,1)",
      }} />
    </div>
  );
}

// Chart tooltip
function Tip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "rgba(12,12,18,0.97)", border: `1px solid ${ACCENT}35`, borderRadius: 10, padding: "8px 12px", backdropFilter: "blur(8px)" }}>
      <p style={{ fontSize: 10, color: "rgba(240,238,232,0.4)", marginBottom: 4 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
          {p.value} {p.name}
        </p>
      ))}
    </div>
  );
}

export default function SanteClient({ data }: { data: SanteData }) {
  const [tab, setTab] = useState("poids");
  const router = useRouter();

  // Global health score (simple moyenne)
  const latestWeight = data.weights[data.weights.length - 1]?.weight;
  const latestSleep = data.sleep[data.sleep.length - 1];
  const latestNutrition = data.nutrition[data.nutrition.length - 1];
  const sleepScore = latestSleep ? Math.min(100, Math.round((latestSleep.duration / 8) * 100)) : 0;
  const calScore = latestNutrition ? Math.min(100, Math.round((latestNutrition.calories / 2500) * 100)) : 0;
  const globalScore = Math.round((sleepScore + calScore) / 2);
  const scoreColor = globalScore >= 80 ? SUCCESS : globalScore >= 60 ? WARNING : DANGER;

  return (
    <div style={{ padding: "0 20px 20px" }}>

      {/* HEADER */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }} style={{ paddingTop: 60, paddingBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 56, letterSpacing: "0.05em", color: "var(--text-primary)", lineHeight: 1 }}>SANTÉ</h1>
            <p style={{ fontSize: 13, color: "rgba(240,238,232,0.45)", marginTop: 6 }}>Poids · Calories · Sommeil</p>
          </div>
          {/* Score circle SVG */}
          <div style={{ position: "relative", width: 64, height: 64, marginTop: 4 }}>
            <svg width={64} height={64} style={{ transform: "rotate(-90deg)" }}>
              <circle cx={32} cy={32} r={27} stroke="var(--surface-3)" strokeWidth={4} fill="none" />
              <motion.circle
                cx={32} cy={32} r={27}
                stroke={scoreColor} strokeWidth={4} fill="none"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 27}
                initial={{ strokeDashoffset: 2 * Math.PI * 27 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 27 * (1 - globalScore / 100) }}
                transition={{ duration: 1.2, ease: [0.32, 0.72, 0, 1], delay: 0.3 }}
                style={{ filter: `drop-shadow(0 0 6px ${scoreColor}80)` }}
              />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: scoreColor, lineHeight: 1 }}>{globalScore}</span>
            </div>
          </div>
        </div>
        <div style={{ height: 1, marginTop: 16, background: `linear-gradient(90deg, transparent, ${ACCENT}33, transparent)` }} />
      </motion.div>

      {/* SEGMENTED TABS */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }} style={{ marginBottom: 20 }}>
        <SegControl
          value={tab} onChange={setTab}
          tabs={[{ key: "poids", label: "POIDS" }, { key: "calories", label: "CALORIES" }, { key: "sommeil", label: "SOMMEIL" }]}
        />
      </motion.div>

      {/* TAB CONTENT */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
        >
          {tab === "poids" && <WeightTab data={data.weights} onSuccess={() => router.refresh()} />}
          {tab === "calories" && <CaloriesTab data={data.nutrition} onSuccess={() => router.refresh()} />}
          {tab === "sommeil" && <SleepTab data={data.sleep} onSuccess={() => router.refresh()} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ── Poids ──────────────────────────────────────────────────────────────────────
function WeightTab({ data, onSuccess }: { data: SanteData["weights"]; onSuccess: () => void }) {
  const [height, setHeight] = useState<number | null>(null);
  useEffect(() => { const h = localStorage.getItem("user_height_cm"); if (h) setHeight(parseInt(h)); }, []);

  const today = format(new Date(), "yyyy-MM-dd");
  const { register, handleSubmit } = useForm({
    resolver: zodResolver(weightSchema),
    defaultValues: { date: today, weight: data[data.length - 1]?.weight ?? 75 },
  });

  const weights = data.map((w) => w.weight);
  const min = weights.length ? Math.min(...weights) : 0;
  const max = weights.length ? Math.max(...weights) : 0;
  const avg = weights.length ? +(weights.reduce((a, b) => a + b, 0) / weights.length).toFixed(1) : 0;
  const latest = weights[weights.length - 1];
  const bmi = height && latest ? +(latest / (height / 100) ** 2).toFixed(1) : null;
  const bmiCat = bmi == null ? null : bmi < 18.5 ? { l: "Insuffisant", c: "#3B82F6" } : bmi < 25 ? { l: "Normal", c: SUCCESS } : bmi < 30 ? { l: "Surpoids", c: WARNING } : { l: "Obèse", c: DANGER };

  const chartData = data.map((d, i) => {
    const slice = data.slice(Math.max(0, i - 6), i + 1);
    const ma = +(slice.reduce((s, x) => s + x.weight, 0) / slice.length).toFixed(2);
    return { date: format(parseISO(d.date), "d MMM", { locale: fr }), Poids: d.weight, Tendance: ma };
  });

  async function onSubmit(values: any) {
    const res = await fetch("/api/body-metrics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
    if (res.ok) { toast.success("Poids enregistré !"); onSuccess(); } else toast.error("Erreur");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Hero metric */}
      <PulsingGlow intensity="low">
        <div style={{ background: "var(--surface-1)", border: `1px solid ${ACCENT}20`, borderRadius: 20, padding: 24, textAlign: "center" }}>
          <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(240,238,232,0.3)", marginBottom: 8 }}>POIDS ACTUEL</p>
          <p style={{ fontFamily: "var(--font-display)", fontSize: 72, lineHeight: 1, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
            <FlipNumber value={latest ? `${latest}` : "—"} />
            <span style={{ fontSize: 24, color: "rgba(240,238,232,0.35)", marginLeft: 6 }}>KG</span>
          </p>
          {bmi != null && bmiCat && (
            <span style={{ display: "inline-block", marginTop: 10, background: bmiCat.c + "20", color: bmiCat.c, border: `1px solid ${bmiCat.c}40`, fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 999 }}>
              IMC {bmi} — {bmiCat.l}
            </span>
          )}
        </div>
      </PulsingGlow>

      {/* Stats pills */}
      <div style={{ display: "flex", gap: 8 }}>
        {[["MIN", min], ["MOY", avg], ["MAX", max]].map(([l, v]) => (
          <div key={l as string} style={{ flex: 1, background: "var(--surface-1)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "10px 8px", textAlign: "center" }}>
            <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", color: "rgba(240,238,232,0.25)", marginBottom: 4 }}>{l as string}</p>
            <p style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 16, color: "var(--text-primary)" }}>{v as number} kg</p>
          </div>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit(onSubmit)} style={{ background: "var(--surface-1)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
        <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(240,238,232,0.3)" }}>ENREGISTRER</p>
        <div style={{ display: "flex", gap: 10 }}>
          <input {...register("date")} type="date" className="input-dark" style={{ flex: 1 }} />
          <input {...register("weight")} type="number" step="0.1" placeholder="75.5" className="input-dark" style={{ flex: 1 }} />
        </div>
        <motion.button whileTap={{ scale: 0.97 }} type="submit" className="shimmer-btn" style={{ background: `linear-gradient(135deg, ${ACCENT}, #00B8CC)`, color: "#050508", borderRadius: 12, height: 46, fontWeight: 700, fontSize: 13, letterSpacing: "0.08em", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
          ENREGISTRER
        </motion.button>
      </form>

      {/* Chart */}
      {chartData.length > 0 && (
        <div style={{ background: "var(--surface-1)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, padding: 20 }}>
          <p style={{ fontFamily: "var(--font-display)", fontSize: 20, letterSpacing: "0.03em", color: "var(--text-primary)", marginBottom: 16 }}>ÉVOLUTION</p>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -30 }}>
              <defs>
                <linearGradient id="wg2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ACCENT} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tick={{ fill: "rgba(240,238,232,0.25)", fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <Tooltip content={<Tip />} cursor={{ stroke: `${ACCENT}40`, strokeWidth: 1, strokeDasharray: "4 4" }} />
              <Area type="monotone" dataKey="Poids" stroke={ACCENT} strokeWidth={2.5} fill="url(#wg2)" dot={false} activeDot={{ r: 5, fill: "#fff", stroke: ACCENT, strokeWidth: 2 }} />
              <Area type="monotone" dataKey="Tendance" stroke={GOLD} strokeWidth={1.5} strokeDasharray="6 3" fill="none" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ── Calories ───────────────────────────────────────────────────────────────────
function CaloriesTab({ data, onSuccess }: { data: SanteData["nutrition"]; onSuccess: () => void }) {
  const latest = data[data.length - 1];
  const calorieGoal = typeof window !== "undefined" ? parseInt(localStorage.getItem("calorie_goal") ?? "2500") : 2500;
  const today = format(new Date(), "yyyy-MM-dd");
  const { register, handleSubmit } = useForm({ resolver: zodResolver(nutritionSchema), defaultValues: { date: today, calories: 0, protein: 0, carbs: 0, fat: 0 } });

  const donutData = latest ? [
    { name: "Prot.", value: latest.protein, color: ACCENT },
    { name: "Gluc.", value: latest.carbs, color: "#A78BFA" },
    { name: "Lip.", value: latest.fat, color: GOLD },
  ] : [];

  async function onSubmit(values: any) {
    const res = await fetch("/api/nutrition", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
    if (res.ok) { toast.success("Calories enregistrées !"); onSuccess(); } else toast.error("Erreur");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Donut */}
      {latest && (
        <div style={{ background: "var(--surface-1)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={donutData} cx={80} cy={80} innerRadius={55} outerRadius={75} dataKey="value" paddingAngle={3} startAngle={90} endAngle={-270}>
                    {donutData.map((d, i) => <Cell key={i} fill={d.color} strokeWidth={0} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--text-primary)", lineHeight: 1 }}>{latest.calories}</span>
                <span style={{ fontSize: 10, color: "rgba(240,238,232,0.35)", letterSpacing: "0.08em" }}>KCAL</span>
              </div>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
              {donutData.map((d) => (
                <div key={d.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: d.color }}>{d.name}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-primary)" }}>{d.value}g</span>
                  </div>
                  <BeamProg value={d.value} max={d.value + 10} color={d.color} />
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: "rgba(240,238,232,0.35)" }}>Objectif journalier</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: ACCENT, fontWeight: 700 }}>{latest.calories} / {calorieGoal} kcal</span>
            </div>
            <BeamProg value={latest.calories} max={calorieGoal} color={latest.calories > calorieGoal * 1.1 ? DANGER : ACCENT} />
          </div>
        </div>
      )}

      {/* Import CSV + Form */}
      <div style={{ background: "var(--surface-1)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
        <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(240,238,232,0.3)" }}>ENREGISTRER</p>
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input {...register("date")} type="date" className="input-dark" style={{ flex: 1 }} />
            <input {...register("calories")} type="number" placeholder="Calories" className="input-dark" style={{ flex: 1 }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <input {...register("protein")} type="number" step="0.1" placeholder="Prot. g" className="input-dark" />
            <input {...register("carbs")} type="number" step="0.1" placeholder="Gluc. g" className="input-dark" />
            <input {...register("fat")} type="number" step="0.1" placeholder="Lip. g" className="input-dark" />
          </div>
          <motion.button whileTap={{ scale: 0.97 }} type="submit" className="shimmer-btn" style={{ background: `linear-gradient(135deg, ${ACCENT}, #00B8CC)`, color: "#050508", borderRadius: 12, height: 46, fontWeight: 700, fontSize: 13, letterSpacing: "0.08em", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
            ENREGISTRER
          </motion.button>
        </form>
      </div>
    </div>
  );
}

// ── Sommeil ────────────────────────────────────────────────────────────────────
function SleepTab({ data, onSuccess }: { data: SanteData["sleep"]; onSuccess: () => void }) {
  const today = format(new Date(), "yyyy-MM-dd");
  const latest = data[data.length - 1];
  const { register, handleSubmit } = useForm({ resolver: zodResolver(sleepSchema), defaultValues: { date: today, bedtime: "23:00", wakeTime: "07:00" } });

  const scoreColor = (d: number) => d >= 8 ? SUCCESS : d >= 6 ? WARNING : DANGER;
  const last14 = data.slice(-14).map((d) => ({
    date: format(parseISO(d.date), "d MMM", { locale: fr }),
    Durée: +d.duration.toFixed(1),
    score: d.quality,
  }));

  async function onSubmit(values: any) {
    // Calculate duration from bedtime and wakeTime
    const [bh, bm] = values.bedtime.split(":").map(Number);
    const [wh, wm] = values.wakeTime.split(":").map(Number);
    let dur = (wh * 60 + wm) - (bh * 60 + bm);
    if (dur < 0) dur += 24 * 60;
    const res = await fetch("/api/sleep", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, duration: +(dur / 60).toFixed(2), quality: Math.min(100, Math.round((dur / 60 / 8) * 100)) }),
    });
    if (res.ok) { toast.success("Sommeil enregistré !"); onSuccess(); } else toast.error("Erreur");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Hero card */}
      {latest && (
        <div style={{ background: "var(--surface-1)", border: `1px solid ${scoreColor(latest.duration)}30`, borderRadius: 20, padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(240,238,232,0.3)", marginBottom: 8 }}>
                {latest.bedtime && latest.wakeTime ? `${latest.bedtime} → ${latest.wakeTime}` : "DERNIÈRE NUIT"}
              </p>
              <p style={{ fontFamily: "var(--font-display)", fontSize: 56, lineHeight: 1, color: "var(--text-primary)" }}>
                <FlipNumber value={latest.duration.toFixed(1)} />
                <span style={{ fontSize: 20, color: "rgba(240,238,232,0.35)", marginLeft: 6 }}>H</span>
              </p>
            </div>
            {/* Score circle */}
            <div style={{ position: "relative", width: 56, height: 56 }}>
              <svg width={56} height={56} style={{ transform: "rotate(-90deg)" }}>
                <circle cx={28} cy={28} r={23} stroke="var(--surface-3)" strokeWidth={4} fill="none" />
                <motion.circle
                  cx={28} cy={28} r={23}
                  stroke={scoreColor(latest.duration)} strokeWidth={4} fill="none"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 23}
                  initial={{ strokeDashoffset: 2 * Math.PI * 23 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 23 * (1 - Math.min(latest.duration / 8, 1)) }}
                  transition={{ duration: 1.2, ease: [0.32, 0.72, 0, 1], delay: 0.2 }}
                  style={{ filter: `drop-shadow(0 0 5px ${scoreColor(latest.duration)}80)` }}
                />
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: scoreColor(latest.duration) }}>
                  {Math.round(Math.min(latest.duration / 8, 1) * 100)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 14-day chart */}
      {last14.length > 0 && (
        <div style={{ background: "var(--surface-1)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, padding: 20 }}>
          <p style={{ fontFamily: "var(--font-display)", fontSize: 20, letterSpacing: "0.03em", color: "var(--text-primary)", marginBottom: 16 }}>14 DERNIÈRES NUITS</p>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={last14} margin={{ top: 5, right: 5, bottom: 0, left: -30 }}>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tick={{ fill: "rgba(240,238,232,0.25)", fontSize: 9 }} tickLine={false} axisLine={false} interval={2} />
              <YAxis tick={{ fill: "rgba(240,238,232,0.25)", fontSize: 9 }} tickLine={false} axisLine={false} domain={[0, 10]} />
              <Tooltip content={<Tip />} />
              <Bar dataKey="Durée" radius={[4, 4, 0, 0]}>
                {last14.map((d, i) => (
                  <Cell key={i} fill={d.Durée >= 8 ? SUCCESS : d.Durée >= 6 ? WARNING : DANGER} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} style={{ background: "var(--surface-1)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
        <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(240,238,232,0.3)" }}>ENREGISTRER</p>
        <input {...register("date")} type="date" className="input-dark" />
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 10, color: "rgba(240,238,232,0.35)", marginBottom: 4 }}>COUCHER</p>
            <input {...register("bedtime")} type="time" className="input-dark" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 10, color: "rgba(240,238,232,0.35)", marginBottom: 4 }}>RÉVEIL</p>
            <input {...register("wakeTime")} type="time" className="input-dark" />
          </div>
        </div>
        <motion.button whileTap={{ scale: 0.97 }} type="submit" className="shimmer-btn" style={{ background: `linear-gradient(135deg, ${ACCENT}, #00B8CC)`, color: "#050508", borderRadius: 12, height: 46, fontWeight: 700, fontSize: 13, letterSpacing: "0.08em", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
          ENREGISTRER
        </motion.button>
      </form>
    </div>
  );
}
