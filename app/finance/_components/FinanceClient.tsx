"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { TrendingUp, TrendingDown, Wallet, PiggyBank, Landmark, Plus, RefreshCw, Upload } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PageHeader from "@/components/PageHeader";

type Snapshot = { date: string; bankBalance: number; totalInvested: number; totalValue: number; total: number };
type Investment = { id: string; ticker: string; name: string; type: string; quantity: number; avgBuyPrice: number; currentPrice: number };

type FinanceData = {
  snapshots: Snapshot[];
  investments: (Investment & { lastUpdated?: string })[];
  latest: { bankBalance: number; totalInvested: number; totalValue: number; total: number } | null;
  variation7j: number | null;
  variation30j: number | null;
};

const snapshotSchema = z.object({
  date: z.string(),
  bankBalance: z.coerce.number().min(0),
  totalInvested: z.coerce.number().min(0),
  totalValue: z.coerce.number().min(0),
  notes: z.string().optional(),
});

const invSchema = z.object({
  ticker: z.string().min(1).max(20),
  name: z.string().min(1),
  type: z.enum(["ETF", "STOCK"]),
  quantity: z.coerce.number().min(0),
  avgBuyPrice: z.coerce.number().min(0),
  currentPrice: z.coerce.number().min(0),
});

const ACCENT = "#6495ED";

export default function FinanceClient({ data }: { data: FinanceData }) {
  const router = useRouter();
  const [invModal, setInvModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [importingBnp, setImportingBnp] = useState(false);
  const bnpFileRef = useRef<HTMLInputElement>(null);
  const today = format(new Date(), "yyyy-MM-dd");

  const { register, handleSubmit } = useForm({
    resolver: zodResolver(snapshotSchema),
    defaultValues: {
      date: today,
      bankBalance: data.latest?.bankBalance ?? 0,
      totalInvested: data.latest?.totalInvested ?? 0,
      totalValue: data.latest?.totalValue ?? 0,
    },
  });

  async function onSnapshot(values: any) {
    const res = await fetch("/api/finance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
    if (res.ok) { toast.success("Snapshot enregistré !"); router.refresh(); } else toast.error("Erreur");
  }

  async function handleRefreshPrices() {
    setRefreshing(true);
    const res = await fetch("/api/finance/refresh-prices");
    setRefreshing(false);
    if (res.ok) {
      const { updated, total, results } = await res.json();
      const errors = results?.filter((r: any) => r.error).length ?? 0;
      toast.success(`${updated}/${total} prix mis à jour${errors > 0 ? ` (${errors} erreur(s))` : ""}`);
      router.refresh();
    } else toast.error("Erreur lors de la mise à jour des prix");
  }

  async function handleBnpImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportingBnp(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/finance/import", { method: "POST", body: formData });
    setImportingBnp(false);
    if (bnpFileRef.current) bnpFileRef.current.value = "";
    if (res.ok) {
      const { imported } = await res.json();
      toast.success(`${imported} snapshot(s) BNP importé(s) !`);
      router.refresh();
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Erreur d'import BNP");
    }
  }

  const fmtEuro = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
  const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;

  const chartData = data.snapshots.map((s) => ({
    date: format(parseISO(s.date), "d MMM", { locale: fr }),
    Banque: s.bankBalance,
    Portefeuille: s.totalValue,
    Total: s.total,
  }));

  const totalInvested = data.investments.reduce((s, i) => s + i.quantity * i.avgBuyPrice, 0);
  const totalValue = data.investments.reduce((s, i) => s + i.quantity * i.currentPrice, 0);
  const totalPnL = totalValue - totalInvested;

  return (
    <div className="px-4 space-y-4">
      <PageHeader title="Finance" subtitle="Patrimoine personnel" />

      {/* Cards résumé */}
      <div className="grid grid-cols-2 gap-3">
        <FinCard icon={<Landmark size={16} className="text-emerald-400" />} bg="bg-emerald-500/15"
          label="Banque" value={data.latest ? fmtEuro(data.latest.bankBalance) : "—"} />
        <FinCard icon={<PiggyBank size={16} className="text-[#6495ED]" />} bg="bg-[#6495ED]/15"
          label="Portefeuille" value={data.latest ? fmtEuro(data.latest.totalValue) : "—"} />
        <FinCard icon={<Wallet size={16} className="text-amber-400" />} bg="bg-amber-500/15"
          label="Patrimoine total" value={data.latest ? fmtEuro(data.latest.total) : "—"}
          sub={data.variation7j != null ? `${data.variation7j >= 0 ? "+" : ""}${fmtEuro(data.variation7j)} / 7j` : undefined}
          subColor={data.variation7j != null ? (data.variation7j >= 0 ? "text-emerald-400" : "text-red-400") : undefined} />
        <FinCard
          icon={totalPnL >= 0 ? <TrendingUp size={16} className="text-emerald-400" /> : <TrendingDown size={16} className="text-red-400" />}
          bg={totalPnL >= 0 ? "bg-emerald-500/15" : "bg-red-500/15"}
          label="Plus-value latente" value={fmtEuro(totalPnL)}
          sub={totalInvested > 0 ? fmtPct((totalPnL / totalInvested) * 100) : undefined}
          subColor={totalPnL >= 0 ? "text-emerald-400" : "text-red-400"} />
      </div>

      {/* Graphique 90j */}
      <div className="card-dark p-4">
        <p className="text-sm font-semibold text-white mb-3">Évolution — 90 jours</p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" />
            <XAxis dataKey="date" tick={{ fill: "#555", fontSize: 9 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fill: "#555", fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
            <Tooltip contentStyle={{ background: "#1A1A1A", border: "1px solid #333", borderRadius: 8, fontSize: 11 }} formatter={(v: any) => [fmtEuro(v)]} />
            <Legend wrapperStyle={{ fontSize: 10, color: "#777" }} />
            <Line type="monotone" dataKey="Total" stroke={ACCENT} strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="Banque" stroke="#10b981" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
            <Line type="monotone" dataKey="Portefeuille" stroke="#f97316" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Portefeuille */}
      <div className="card-dark overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
          <p className="text-sm font-semibold text-white">Positions</p>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefreshPrices}
              disabled={refreshing}
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors"
            >
              <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "Actualisation…" : "Actualiser"}
            </button>
            <button onClick={() => setInvModal(true)} className="flex items-center gap-1 text-xs text-[#6495ED] hover:text-[#9bb9f3] transition-colors">
              <Plus size={13} /> Ajouter
            </button>
          </div>
        </div>
        {data.investments.length === 0 ? (
          <div className="py-8 text-center text-zinc-600 text-sm">Aucune position enregistrée</div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {data.investments.map((inv) => {
              const invested = inv.quantity * inv.avgBuyPrice;
              const current = inv.quantity * inv.currentPrice;
              const pnl = current - invested;
              const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
              const lastUpdated = inv.lastUpdated ? formatDistanceToNow(new Date(inv.lastUpdated), { addSuffix: true, locale: fr }) : null;
              return (
                <div key={inv.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white">{inv.ticker}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${inv.type === "ETF" ? "bg-[#6495ED]/20 text-[#9bb9f3]" : "bg-amber-500/20 text-amber-300"}`}>{inv.type}</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 truncate">{inv.name}</p>
                    {lastUpdated && <p className="text-[9px] text-zinc-700">{lastUpdated}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">{fmtEuro(current)}</p>
                    <p className={`text-[10px] font-semibold ${pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {pnl >= 0 ? "+" : ""}{fmtEuro(pnl)} ({fmtPct(pnlPct)})
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Formulaire snapshot + import BNP */}
      <form onSubmit={handleSubmit(onSnapshot)} className="card-dark p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-white">Mise à jour du jour</p>
          <button type="button" onClick={() => bnpFileRef.current?.click()}
            className="flex items-center gap-1.5 text-xs text-[#6495ED] hover:text-[#9bb9f3] transition-colors">
            <Upload size={12} /> {importingBnp ? "Import…" : "Relevé BNP"}
          </button>
          <input ref={bnpFileRef} type="file" accept=".csv" onChange={handleBnpImport} className="hidden" />
        </div>
        <Field label="Date"><Input type="date" {...register("date")} className="input-dark" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Solde bancaire (€)"><Input type="number" step="0.01" {...register("bankBalance")} className="input-dark" /></Field>
          <Field label="Total investi (€)"><Input type="number" step="0.01" {...register("totalInvested")} className="input-dark" /></Field>
          <Field label="Valeur actuelle (€)" className="col-span-2"><Input type="number" step="0.01" {...register("totalValue")} className="input-dark" /></Field>
        </div>
        <Button type="submit" className="w-full bg-[#6495ED] hover:bg-[#4a7de8] text-white rounded-xl h-10">Enregistrer le snapshot</Button>
      </form>

      <InvestmentModal open={invModal} onClose={() => setInvModal(false)} onSave={() => { setInvModal(false); router.refresh(); }} />
    </div>
  );
}

function InvestmentModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: () => void }) {
  const { register, handleSubmit, reset } = useForm({ resolver: zodResolver(invSchema), defaultValues: { type: "ETF" as const } });
  const [saving, setSaving] = useState(false);

  async function onSubmit(values: any) {
    setSaving(true);
    const res = await fetch("/api/finance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "upsert_investment", ...values }) });
    setSaving(false);
    if (res.ok) { toast.success("Position enregistrée !"); reset(); onSave(); } else toast.error("Erreur");
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-[#1A1A1A] border-white/10 text-white max-w-sm mx-auto rounded-2xl p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-white/[0.08]">
          <DialogTitle className="text-base font-bold">Ajouter une position</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="px-5 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ticker"><Input {...register("ticker")} placeholder="MSCI WORLD" className="input-dark" /></Field>
            <Field label="Type">
              <select {...register("type")} className="input-dark">
                <option value="ETF">ETF</option>
                <option value="STOCK">Action</option>
              </select>
            </Field>
            <Field label="Nom" className="col-span-2"><Input {...register("name")} placeholder="Amundi MSCI World…" className="input-dark" /></Field>
            <Field label="Quantité"><Input type="number" step="0.0001" {...register("quantity")} className="input-dark" /></Field>
            <Field label="PRU (€)"><Input type="number" step="0.01" {...register("avgBuyPrice")} className="input-dark" /></Field>
            <Field label="Prix actuel (€)" className="col-span-2"><Input type="number" step="0.01" {...register("currentPrice")} className="input-dark" /></Field>
          </div>
          <Button type="submit" disabled={saving} className="w-full bg-[#6495ED] hover:bg-[#4a7de8] text-white rounded-xl h-10">
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FinCard({ icon, bg, label, value, sub, subColor }: { icon: React.ReactNode; bg: string; label: string; value: string; sub?: string; subColor?: string }) {
  return (
    <div className="card-dark p-3.5">
      <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center mb-2`}>{icon}</div>
      <p className="text-[10px] text-zinc-500 uppercase tracking-wide">{label}</p>
      <p className="text-base font-bold text-white mt-0.5">{value}</p>
      {sub && <p className={`text-[10px] font-medium mt-0.5 ${subColor ?? "text-zinc-500"}`}>{sub}</p>}
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={`space-y-1 ${className}`}><label className="text-xs text-zinc-400 font-medium">{label}</label>{children}</div>;
}
