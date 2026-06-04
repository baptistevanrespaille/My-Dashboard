"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Upload } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/PageHeader";

type SanteData = {
  weights: { date: string; weight: number }[];
  nutrition: { date: string; calories: number; protein: number; carbs: number; fat: number }[];
  sleep: { date: string; duration: number; quality: number; bedtime: string; wakeTime: string }[];
};

const ACCENT = "#6495ED";

// ─── Schémas ──────────────────────────────────────────────────────────────────
const weightSchema = z.object({ date: z.string(), weight: z.coerce.number().min(20).max(300) });
const nutritionSchema = z.object({
  date: z.string(), calories: z.coerce.number().int().min(0).max(10000),
  protein: z.coerce.number().min(0), carbs: z.coerce.number().min(0), fat: z.coerce.number().min(0),
});
const sleepSchema = z.object({
  date: z.string(), bedtime: z.string().regex(/^\d{2}:\d{2}$/), wakeTime: z.string().regex(/^\d{2}:\d{2}$/),
});

export default function SanteClient({ data }: { data: SanteData }) {
  const router = useRouter();
  return (
    <div className="px-4 space-y-4">
      <PageHeader title="Santé" subtitle="Poids · Calories · Sommeil" />
      <Tabs defaultValue="poids">
        <TabsList className="w-full bg-[#1A1A1A] border border-white/[0.08] rounded-xl p-1 h-10">
          {["poids", "calories", "sommeil"].map((v) => (
            <TabsTrigger key={v} value={v} className="flex-1 rounded-lg text-xs capitalize data-[state=active]:bg-[#6495ED] data-[state=active]:text-white text-zinc-400">
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="poids" className="mt-4 space-y-4">
          <WeightTab data={data.weights} onSuccess={() => router.refresh()} />
        </TabsContent>
        <TabsContent value="calories" className="mt-4 space-y-4">
          <CaloriesTab data={data.nutrition} onSuccess={() => router.refresh()} />
        </TabsContent>
        <TabsContent value="sommeil" className="mt-4 space-y-4">
          <SleepTab data={data.sleep} onSuccess={() => router.refresh()} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Onglet Poids ──────────────────────────────────────────────────────────────
function WeightTab({ data, onSuccess }: { data: SanteData["weights"]; onSuccess: () => void }) {
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    const h = localStorage.getItem("user_height_cm");
    if (h) setHeight(parseInt(h));
  }, []);

  const today = format(new Date(), "yyyy-MM-dd");
  const { register, handleSubmit } = useForm({
    resolver: zodResolver(weightSchema),
    defaultValues: { date: today, weight: data[data.length - 1]?.weight ?? 75 },
  });

  const weights = data.map((w) => w.weight);
  const min = weights.length ? Math.min(...weights) : 0;
  const max = weights.length ? Math.max(...weights) : 0;
  const avg = weights.length ? weights.reduce((a, b) => a + b, 0) / weights.length : 0;
  const latestWeight = weights[weights.length - 1];
  const first30 = weights[0];
  const variation30 = weights.length >= 2 ? latestWeight - first30 : null;

  // BMI
  const bmi = height && latestWeight ? latestWeight / (height / 100) ** 2 : null;
  const bmiLabel = bmi == null ? null : bmi < 18.5 ? { l: "Insuffisant", c: "text-blue-400" } : bmi < 25 ? { l: "Normal", c: "text-emerald-400" } : bmi < 30 ? { l: "Surpoids", c: "text-amber-400" } : { l: "Obèse", c: "text-red-400" };

  // Moyenne mobile 7j
  const chartData = data.map((d, i) => {
    const slice = data.slice(Math.max(0, i - 6), i + 1);
    const ma = slice.reduce((s, x) => s + x.weight, 0) / slice.length;
    return { date: format(parseISO(d.date), "d MMM", { locale: fr }), Poids: d.weight, Tendance: parseFloat(ma.toFixed(2)) };
  });

  async function onSubmit(values: any) {
    const res = await fetch("/api/body-metrics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
    if (res.ok) { toast.success("Poids enregistré !"); onSuccess(); } else toast.error("Erreur");
  }

  function saveHeight(e: React.ChangeEvent<HTMLInputElement>) {
    const v = parseInt(e.target.value);
    if (v > 100 && v < 250) { localStorage.setItem("user_height_cm", String(v)); setHeight(v); }
  }

  return (
    <>
      <div className="card-dark p-4 space-y-3">
        <p className="text-sm font-semibold text-white">Poids du jour</p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date"><Input type="date" {...register("date")} className="input-dark" /></Field>
            <Field label="Poids (kg)"><Input type="number" step="0.1" {...register("weight")} className="input-dark" /></Field>
          </div>
          <Button type="submit" className="w-full bg-[#6495ED] hover:bg-[#4a7de8] text-white rounded-xl h-10">Enregistrer</Button>
        </form>
        {/* Taille pour IMC */}
        <div className="pt-2 border-t border-white/[0.06]">
          <Field label="Votre taille (cm) — pour l'IMC">
            <Input type="number" defaultValue={height ?? ""} onChange={saveHeight} placeholder="ex. 178" className="input-dark" />
          </Field>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        <StatMini label="Min" value={`${min.toFixed(1)}`} unit="kg" />
        <StatMini label="Moy." value={avg.toFixed(1)} unit="kg" color="text-[#6495ED]" />
        <StatMini label="Max" value={`${max.toFixed(1)}`} unit="kg" />
        <StatMini label="30j" value={variation30 != null ? `${variation30 >= 0 ? "+" : ""}${variation30.toFixed(1)}` : "—"} unit="kg"
          color={variation30 != null ? (variation30 <= 0 ? "text-emerald-400" : "text-red-400") : "text-white"} />
      </div>

      {/* IMC */}
      {bmi && bmiLabel && (
        <div className="card-dark p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-500">Indice de masse corporelle</p>
            <p className={`text-2xl font-bold mt-0.5 ${bmiLabel.c}`}>{bmi.toFixed(1)}</p>
          </div>
          <span className={`text-sm font-semibold px-3 py-1 rounded-full bg-white/5 ${bmiLabel.c}`}>{bmiLabel.l}</span>
        </div>
      )}

      <div className="card-dark p-4">
        <p className="text-sm font-semibold text-white mb-3">Évolution + tendance — 30j</p>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" />
            <XAxis dataKey="date" tick={{ fill: "#555", fontSize: 9 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fill: "#555", fontSize: 10 }} tickLine={false} axisLine={false} domain={["dataMin - 0.5", "dataMax + 0.5"]} />
            <Tooltip contentStyle={{ background: "#1A1A1A", border: "1px solid #333", borderRadius: 8, fontSize: 11 }} />
            <Line type="monotone" dataKey="Poids" stroke={ACCENT} strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
            <Line type="monotone" dataKey="Tendance" stroke={ACCENT} strokeWidth={1.5} dot={false} strokeDasharray="5 3" opacity={0.5} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

// ── Onglet Calories ───────────────────────────────────────────────────────────
function CaloriesTab({ data, onSuccess }: { data: SanteData["nutrition"]; onSuccess: () => void }) {
  const [goal, setGoal] = useState(2500);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { const g = localStorage.getItem("calorie_goal"); if (g) setGoal(parseInt(g)); }, []);

  const today = format(new Date(), "yyyy-MM-dd");
  const { register, handleSubmit, watch } = useForm({
    resolver: zodResolver(nutritionSchema),
    defaultValues: { date: today, calories: 2000, protein: 150, carbs: 200, fat: 65 },
  });

  const _watchCal = watch("calories") ?? 0;
  const watchProt = watch("protein") ?? 0;
  const watchCarbs = watch("carbs") ?? 0;
  const watchFat = watch("fat") ?? 0;

  const todayData = data[data.length - 1];
  const pct = todayData ? Math.min(Math.round((todayData.calories / goal) * 100), 120) : 0;
  const avgCal = data.length ? Math.round(data.reduce((a, b) => a + b.calories, 0) / data.length) : 0;

  // Donut macros du jour d'entrée form
  const totalMacroG = Number(watchProt) + Number(watchCarbs) + Number(watchFat);
  const pieData = totalMacroG > 0 ? [
    { name: "Protéines", value: Number(watchProt), fill: "#6495ED" },
    { name: "Glucides", value: Number(watchCarbs), fill: "#f97316" },
    { name: "Lipides", value: Number(watchFat), fill: "#10b981" },
  ] : [];

  const chartData = data.map((d) => ({
    date: format(parseISO(d.date), "EEE", { locale: fr }),
    Calories: d.calories,
    Objectif: goal,
  }));

  async function onSubmit(values: any) {
    const res = await fetch("/api/nutrition", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
    if (res.ok) { toast.success("Nutrition enregistrée !"); onSuccess(); } else toast.error("Erreur");
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/nutrition/import", { method: "POST", body: formData });
    setImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (res.ok) {
      const { imported, skipped } = await res.json();
      toast.success(`${imported} entrée(s) importée(s)${skipped > 0 ? `, ${skipped} ignorée(s)` : ""}`);
      onSuccess();
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Erreur d'import");
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="card-dark p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-white">Entrée du jour</p>
          <button type="button" onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 text-xs text-[#6495ED] hover:text-[#9bb9f3] transition-colors">
            <Upload size={12} /> {importing ? "Import…" : "Importer Yazio"}
          </button>
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleImport} className="hidden" />
        </div>
        <Field label="Date"><Input type="date" {...register("date")} className="input-dark" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Calories (kcal)"><Input type="number" {...register("calories")} className="input-dark" /></Field>
          <Field label="Protéines (g)"><Input type="number" step="0.1" {...register("protein")} className="input-dark" /></Field>
          <Field label="Glucides (g)"><Input type="number" step="0.1" {...register("carbs")} className="input-dark" /></Field>
          <Field label="Lipides (g)"><Input type="number" step="0.1" {...register("fat")} className="input-dark" /></Field>
        </div>
        <Button type="submit" className="w-full bg-[#6495ED] hover:bg-[#4a7de8] text-white rounded-xl h-10">Enregistrer</Button>
      </form>

      {/* Objectif calorique */}
      <div className="card-dark p-4 space-y-2">
        <div className="flex justify-between items-center">
          <p className="text-sm font-semibold text-white">Objectif calorique</p>
          <Input type="number" defaultValue={goal} onChange={(e) => { const v = parseInt(e.target.value); if (v > 500) { setGoal(v); localStorage.setItem("calorie_goal", String(v)); }}}
            className="input-dark w-24 h-8 text-right text-sm" />
        </div>
        {todayData && (
          <>
            <div className="flex justify-between text-xs text-zinc-500">
              <span>{todayData.calories} kcal</span><span>{goal} kcal</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(pct, 100)}%`, background: pct > 110 ? "#ef4444" : pct > 95 ? "#f97316" : "#6495ED" }} />
            </div>
            <p className="text-xs text-zinc-500 text-right">{pct}% de l'objectif</p>
          </>
        )}
      </div>

      {/* Donut macros */}
      {pieData.length > 0 && (
        <div className="card-dark p-4">
          <p className="text-sm font-semibold text-white mb-3">Répartition macros (entrée)</p>
          <div className="flex items-center gap-4">
            <PieChart width={120} height={120}>
              <Pie data={pieData} cx={55} cy={55} innerRadius={35} outerRadius={55} paddingAngle={2} dataKey="value">
                {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
            </PieChart>
            <div className="space-y-2">
              {pieData.map((d) => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.fill }} />
                  <span className="text-xs text-zinc-400">{d.name}</span>
                  <span className="text-xs font-semibold text-white ml-auto pl-4">{d.value}g</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Graphique 7j */}
      <div className="card-dark p-4">
        <div className="flex justify-between items-center mb-3">
          <p className="text-sm font-semibold text-white">7 jours</p>
          <span className="text-xs text-zinc-500">Moy. {avgCal} kcal</span>
        </div>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -22 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: "#555", fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: "#555", fontSize: 10 }} tickLine={false} axisLine={false} domain={[1200, "dataMax + 200"]} />
            <Tooltip contentStyle={{ background: "#1A1A1A", border: "1px solid #333", borderRadius: 8, fontSize: 11 }} />
            <ReferenceLine y={goal} stroke={ACCENT} strokeDasharray="4 3" opacity={0.6} />
            <Bar dataKey="Calories" fill={ACCENT} radius={[4, 4, 0, 0]} opacity={0.85} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

// ── Onglet Sommeil ────────────────────────────────────────────────────────────
function SleepTab({ data, onSuccess }: { data: SanteData["sleep"]; onSuccess: () => void }) {
  const [quality, setQuality] = useState(4);
  const today = format(new Date(), "yyyy-MM-dd");
  const { register, handleSubmit } = useForm({
    resolver: zodResolver(sleepSchema),
    defaultValues: { date: today, bedtime: "23:00", wakeTime: "07:00" },
  });

  const recent7 = data.slice(-7);
  const avgDur = recent7.length ? (recent7.reduce((a, b) => a + b.duration, 0) / recent7.length).toFixed(1) : "—";
  const avgScore = recent7.length ? Math.round(recent7.reduce((a, b) => a + ((b.duration / 8) * 0.6 + (b.quality / 5) * 0.4) * 100, 0) / recent7.length) : null;

  const chartData = data.map((d) => ({
    date: format(parseISO(d.date), "d MMM", { locale: fr }),
    Durée: d.duration,
    Qualité: d.quality,
    Score: Math.round((d.duration / 8 * 0.6 + d.quality / 5 * 0.4) * 100),
  }));

  async function onSubmit(values: any) {
    const res = await fetch("/api/sleep", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, quality }),
    });
    if (res.ok) { toast.success("Sommeil enregistré !"); onSuccess(); } else toast.error("Erreur");
  }

  return (
    <>
      <div className="card-dark p-4 space-y-3">
        <p className="text-sm font-semibold text-white">Nuit du jour</p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <Field label="Date"><Input type="date" {...register("date")} className="input-dark" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Coucher"><Input type="time" {...register("bedtime")} className="input-dark" /></Field>
            <Field label="Réveil"><Input type="time" {...register("wakeTime")} className="input-dark" /></Field>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400">Qualité : {quality}/5</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((v) => (
                <button key={v} type="button" onClick={() => setQuality(v)}
                  className={`flex-1 h-9 rounded-xl text-sm font-bold transition-colors ${quality >= v ? "bg-[#6495ED] text-white" : "bg-white/5 text-zinc-600"}`}>
                  {v}
                </button>
              ))}
            </div>
          </div>
          <Button type="submit" className="w-full bg-[#6495ED] hover:bg-[#4a7de8] text-white rounded-xl h-10">Enregistrer</Button>
        </form>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="card-dark p-4">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Durée moy. 7j</p>
          <p className="text-2xl font-bold text-[#6495ED] mt-1">{avgDur}h</p>
        </div>
        <div className="card-dark p-4">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Score moy. 7j</p>
          <p className={`text-2xl font-bold mt-1 ${avgScore != null ? (avgScore >= 70 ? "text-emerald-400" : avgScore >= 50 ? "text-amber-400" : "text-red-400") : "text-white"}`}>
            {avgScore ?? "—"}{avgScore != null ? "/100" : ""}
          </p>
        </div>
      </div>

      <div className="card-dark p-4">
        <p className="text-sm font-semibold text-white mb-3">14 jours</p>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -22 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: "#555", fontSize: 9 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fill: "#555", fontSize: 10 }} tickLine={false} axisLine={false} domain={[4, 10]} />
            <Tooltip contentStyle={{ background: "#1A1A1A", border: "1px solid #333", borderRadius: 8, fontSize: 11 }} formatter={(v: any, n: any) => [n === "Durée" ? `${v}h` : v, n]} />
            <ReferenceLine y={8} stroke="#3b82f6" strokeDasharray="4 3" opacity={0.4} />
            <Bar dataKey="Durée" fill="#3b82f6" radius={[4, 4, 0, 0]} opacity={0.8} />
            <Line dataKey="Qualité" stroke="#f97316" strokeWidth={2} dot={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

function StatMini({ label, value, unit, color = "text-white" }: { label: string; value: string; unit: string; color?: string }) {
  return (
    <div className="card-dark p-3">
      <p className="text-[9px] text-zinc-500 uppercase">{label}</p>
      <p className={`text-base font-bold mt-0.5 ${color}`}>{value}<span className="text-[10px] ml-0.5 text-zinc-500">{unit}</span></p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><label className="text-xs text-zinc-400 font-medium">{label}</label>{children}</div>;
}
