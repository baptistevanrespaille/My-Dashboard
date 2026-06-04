"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { TrendingUp, TrendingDown, Plus, RefreshCw, Upload, X } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart } from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import Card3D from "@/components/Card3D";
import PulsingGlow from "@/components/PulsingGlow";
import FlipNumber from "@/components/FlipNumber";

const ACCENT  = "#00E5FF";
const GOLD    = "#C9A84C";
const SUCCESS = "#00E676";
const DANGER  = "#FF3D57";
const SPRING  = { type: "spring", stiffness: 380, damping: 35 } as const;

type Snapshot = { date: string; bankBalance: number; totalInvested: number; totalValue: number; total: number };
type Investment = { id: string; ticker: string; name: string; type: string; quantity: number; avgBuyPrice: number; currentPrice: number; lastUpdated?: string };
type FinanceData = {
  snapshots: Snapshot[];
  investments: Investment[];
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

function fmtEuro(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

// Tooltip
function FinTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "rgba(12,12,18,0.97)", border: `1px solid ${ACCENT}35`, borderRadius: 10, padding: "8px 12px", backdropFilter: "blur(8px)" }}>
      <p style={{ fontSize: 10, color: "rgba(240,238,232,0.4)", marginBottom: 4 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: p.stroke }}>{fmtEuro(p.value)}</p>
      ))}
    </div>
  );
}

export default function FinanceClient({ data }: { data: FinanceData }) {
  const router = useRouter();
  const [invModal, setInvModal] = useState(false);
  const [snapshotModal, setSnapshotModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const bnpRef = useRef<HTMLInputElement>(null);
  const today = format(new Date(), "yyyy-MM-dd");

  const { register: regSnap, handleSubmit: submitSnap } = useForm({
    resolver: zodResolver(snapshotSchema),
    defaultValues: { date: today, bankBalance: data.latest?.bankBalance ?? 0, totalInvested: data.latest?.totalInvested ?? 0, totalValue: data.latest?.totalValue ?? 0 },
  });
  const { register: regInv, handleSubmit: submitInv, reset: resetInv } = useForm({ resolver: zodResolver(invSchema) });

  const total = data.latest?.total ?? 0;
  const bank = data.latest?.bankBalance ?? 0;
  const invested = data.latest?.totalValue ?? 0;
  const v7 = data.variation7j;
  const v7pct = total > 0 && v7 != null ? (v7 / (total - v7)) * 100 : null;

  const chartData = data.snapshots.slice(-30).map((s) => ({
    date: format(parseISO(s.date), "d MMM", { locale: fr }),
    Banque: s.bankBalance,
    Investissements: s.totalValue,
  }));

  async function onSnapshot(values: any) {
    const res = await fetch("/api/finance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
    if (res.ok) { toast.success("Snapshot enregistré !"); setSnapshotModal(false); router.refresh(); } else toast.error("Erreur");
  }

  async function onAddInvestment(values: any) {
    const res = await fetch("/api/finance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "investment", ...values }) });
    if (res.ok) { toast.success("Position ajoutée !"); setInvModal(false); resetInv(); router.refresh(); } else toast.error("Erreur");
  }

  async function handleRefresh() {
    setRefreshing(true);
    const res = await fetch("/api/finance/refresh-prices");
    setRefreshing(false);
    if (res.ok) {
      const { updated, total: tot } = await res.json();
      toast.success(`${updated}/${tot} prix mis à jour`);
      router.refresh();
    } else toast.error("Erreur refresh");
  }

  async function handleBnpImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/finance/import", { method: "POST", body: formData });
    if (res.ok) { toast.success("Import BNP réussi !"); router.refresh(); } else toast.error("Erreur import");
  }

  return (
    <div style={{ padding: "0 20px 20px" }}>

      {/* HEADER */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }} style={{ paddingTop: 60, paddingBottom: 20 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 56, letterSpacing: "0.05em", color: "var(--text-primary)", lineHeight: 1 }}>FINANCE</h1>
        <p style={{ fontSize: 13, color: "rgba(240,238,232,0.45)", marginTop: 6 }}>Patrimoine · Investissements · Suivi</p>
        <div style={{ height: 1, marginTop: 16, background: `linear-gradient(90deg, transparent, ${GOLD}33, transparent)` }} />
      </motion.div>

      {/* HERO PATRIMOINE */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.45, ease: [0.32, 0.72, 0, 1] }} style={{ marginBottom: 20 }}>
        <PulsingGlow intensity="medium">
          <Card3D maxRotation={8} className="carbon" style={{ borderRadius: 22 }}>
            <div style={{
              background: `linear-gradient(135deg, rgba(201,168,76,0.06) 0%, var(--surface-1) 50%, var(--surface-2) 100%)`,
              border: `1px solid ${GOLD}30`,
              borderRadius: 22, padding: 24,
              boxShadow: `0 0 40px rgba(201,168,76,0.06)`,
            }}>
              <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: GOLD, marginBottom: 12 }}>PATRIMOINE TOTAL</p>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, marginBottom: 8 }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 56, lineHeight: 1, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
                  <FlipNumber value={total > 0 ? String(Math.floor(total)) : "0"} />
                </span>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 28, color: GOLD, opacity: 0.7, paddingBottom: 4 }}>€</span>
              </div>

              {/* Variation 7j */}
              {v7 != null && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 999, background: v7 >= 0 ? `${SUCCESS}15` : `${DANGER}15`, border: `1px solid ${v7 >= 0 ? SUCCESS : DANGER}30` }}>
                  {v7 >= 0 ? <TrendingUp size={13} style={{ color: SUCCESS }} /> : <TrendingDown size={13} style={{ color: DANGER }} />}
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: v7 >= 0 ? SUCCESS : DANGER }}>
                    {v7 >= 0 ? "+" : ""}{fmtEuro(v7)}
                    {v7pct != null && ` (${v7pct >= 0 ? "+" : ""}${v7pct.toFixed(1)}%)`}
                  </span>
                  <span style={{ fontSize: 10, color: "rgba(240,238,232,0.35)" }}>7 jours</span>
                </div>
              )}

              {/* Split banque / investissements */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 20 }}>
                {[
                  { label: "BANQUE", value: bank, color: ACCENT },
                  { label: "INVESTISSEMENTS", value: invested, color: GOLD },
                ].map((s) => (
                  <div key={s.label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: "12px 14px", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", color: s.color, marginBottom: 6 }}>{s.label}</p>
                    <p style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 16, color: "var(--text-primary)" }}>{fmtEuro(s.value)}</p>
                    {total > 0 && (
                      <p style={{ fontSize: 10, color: "rgba(240,238,232,0.35)", marginTop: 3 }}>
                        {Math.round((s.value / total) * 100)}% du total
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* CTA row */}
              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <motion.button whileTap={{ scale: 0.96 }} onClick={() => setSnapshotModal(true)} className="shimmer-btn" style={{ flex: 1, background: `linear-gradient(135deg, ${GOLD}, #A88930)`, color: "#050508", borderRadius: 12, height: 42, fontWeight: 700, fontSize: 11, letterSpacing: "0.08em", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                  + SNAPSHOT
                </motion.button>
                <motion.button whileTap={{ scale: 0.96 }} onClick={() => bnpRef.current?.click()} style={{ padding: "0 14px", background: "var(--surface-3)", color: "rgba(240,238,232,0.5)", borderRadius: 12, height: 42, border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", fontFamily: "var(--font-sans)" }}>
                  <Upload size={13} /> BNP
                </motion.button>
                <input ref={bnpRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleBnpImport} />
              </div>
            </div>
          </Card3D>
        </PulsingGlow>
      </motion.div>

      {/* GRAPHIQUE */}
      {chartData.length > 1 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14, duration: 0.45, ease: [0.32, 0.72, 0, 1] }} style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(0,229,255,0.15)", borderRadius: 20, padding: 20, marginBottom: 20 }}>
          <p style={{ fontFamily: "var(--font-display)", fontSize: 20, letterSpacing: "0.03em", color: "var(--text-primary)", marginBottom: 8 }}>ÉVOLUTION</p>
          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            {[["Banque", ACCENT], ["Investissements", GOLD]].map(([l, c]) => (
              <div key={l as string} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 12, height: 3, borderRadius: 1, background: c as string }} />
                <span style={{ fontSize: 10, color: "rgba(240,238,232,0.35)" }}>{l as string}</span>
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="bankGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ACCENT} stopOpacity={0.15} /><stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="invGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={GOLD} stopOpacity={0.12} /><stop offset="100%" stopColor={GOLD} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tick={{ fill: "rgba(240,238,232,0.25)", fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <Tooltip content={<FinTip />} cursor={{ stroke: `${ACCENT}40`, strokeWidth: 1, strokeDasharray: "4 4" }} />
              <Area type="monotone" dataKey="Banque" stroke={ACCENT} strokeWidth={2} fill="url(#bankGrad)" dot={false} activeDot={{ r: 4, fill: "#fff", stroke: ACCENT, strokeWidth: 2 }} />
              <Area type="monotone" dataKey="Investissements" stroke={GOLD} strokeWidth={2} strokeDasharray="8 3" fill="url(#invGrad)" dot={false} activeDot={{ r: 4, fill: "#fff", stroke: GOLD, strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* PORTEFEUILLE */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.45, ease: [0.32, 0.72, 0, 1] }} style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(0,229,255,0.15)", borderRadius: 20, padding: 20, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <p style={{ fontFamily: "var(--font-display)", fontSize: 22, letterSpacing: "0.03em", color: "var(--text-primary)" }}>PORTEFEUILLE</p>
          <div style={{ display: "flex", gap: 8 }}>
            <motion.button whileTap={{ scale: 0.92 }} onClick={handleRefresh} style={{ background: "var(--surface-3)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(240,238,232,0.5)" }}>
              <motion.div animate={{ rotate: refreshing ? 360 : 0 }} transition={{ duration: 1, repeat: refreshing ? Infinity : 0, ease: "linear" }}>
                <RefreshCw size={15} />
              </motion.div>
            </motion.button>
            <motion.button whileTap={{ scale: 0.96 }} onClick={() => setInvModal(true)} className="shimmer-btn" style={{ background: `linear-gradient(135deg, ${ACCENT}, #00B8CC)`, color: "#050508", borderRadius: 10, height: 38, padding: "0 14px", fontWeight: 700, fontSize: 11, letterSpacing: "0.08em", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", display: "flex", alignItems: "center", gap: 5 }}>
              <Plus size={13} /> AJOUTER
            </motion.button>
          </div>
        </div>

        {/* Table header */}
        {data.investments.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 8, padding: "0 0 8px", borderBottom: "1px solid rgba(255,255,255,0.05)", marginBottom: 4 }}>
            {["TICKER", "PRIX", "PnL", "VALEUR"].map((h) => (
              <p key={h} style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", color: "rgba(240,238,232,0.25)", textAlign: h === "VALEUR" ? "right" : "left" }}>{h}</p>
            ))}
          </div>
        )}

        {data.investments.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 0", color: "rgba(240,238,232,0.25)", fontSize: 13 }}>
            Aucune position. Ajoutez vos investissements.
          </div>
        ) : (
          data.investments.map((inv, i) => {
            const pnl = inv.currentPrice > 0 && inv.avgBuyPrice > 0
              ? ((inv.currentPrice - inv.avgBuyPrice) / inv.avgBuyPrice) * 100
              : null;
            const value = inv.currentPrice * inv.quantity;
            const isPos = pnl != null && pnl >= 0;
            const pnlColor = pnl == null ? "rgba(240,238,232,0.3)" : isPos ? SUCCESS : DANGER;

            return (
              <motion.div
                key={inv.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.05, duration: 0.3 }}
                style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 8, padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", alignItems: "center" }}
              >
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{inv.ticker}</p>
                  <p style={{ fontSize: 11, color: "rgba(240,238,232,0.35)", marginTop: 2 }}>{inv.name.length > 16 ? inv.name.slice(0, 16) + "…" : inv.name}</p>
                </div>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-primary)" }}>
                  {inv.currentPrice > 0 ? `${inv.currentPrice.toFixed(2)}€` : "—"}
                </p>
                {pnl != null ? (
                  <span style={{ background: `${pnlColor}18`, color: pnlColor, border: `1px solid ${pnlColor}35`, fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)", padding: "3px 7px", borderRadius: 6, display: "inline-block" }}>
                    {isPos ? "+" : ""}{pnl.toFixed(1)}%
                  </span>
                ) : <span style={{ color: "rgba(240,238,232,0.25)", fontSize: 11 }}>—</span>}
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-primary)", textAlign: "right" }}>
                  {value > 0 ? fmtEuro(value) : "—"}
                </p>
              </motion.div>
            );
          })
        )}
      </motion.div>

      {/* MODAL ADD INVESTMENT */}
      <AnimatePresence>
        {invModal && (
          <>
            <motion.div className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setInvModal(false)} />
            <motion.div className="fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto" style={{ background: "rgba(5,5,8,0.97)", borderRadius: "24px 24px 0 0", border: `1px solid ${ACCENT}15`, borderBottom: "none", backdropFilter: "blur(30px)", paddingBottom: "env(safe-area-inset-bottom)" }} initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={SPRING}>
              <div style={{ width: 40, height: 4, borderRadius: 999, background: "rgba(240,238,232,0.15)", margin: "12px auto 0" }} />
              <div className="flex items-center justify-between px-5 pt-5 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--text-primary)", letterSpacing: "0.05em" }}>NOUVELLE POSITION</span>
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setInvModal(false)} style={{ color: "rgba(240,238,232,0.4)", background: "none", border: "none", cursor: "pointer", minWidth: 44, minHeight: 44 }}><X size={18} /></motion.button>
              </div>
              <form onSubmit={submitInv(onAddInvestment)} style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <input {...regInv("ticker")} placeholder="Ticker (ex: IWDA)" className="input-dark" style={{ flex: 1 }} />
                  <select {...regInv("type")} className="input-dark" style={{ flex: 1, cursor: "pointer" }}>
                    <option value="ETF">ETF</option>
                    <option value="STOCK">Action</option>
                  </select>
                </div>
                <input {...regInv("name")} placeholder="Nom complet" className="input-dark" />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  <input {...regInv("quantity")} type="number" step="0.01" placeholder="Qté" className="input-dark" />
                  <input {...regInv("avgBuyPrice")} type="number" step="0.01" placeholder="Prix achat" className="input-dark" />
                  <input {...regInv("currentPrice")} type="number" step="0.01" placeholder="Prix actuel" className="input-dark" />
                </div>
                <motion.button whileTap={{ scale: 0.97 }} type="submit" className="shimmer-btn" style={{ background: `linear-gradient(135deg, ${ACCENT}, #00B8CC)`, color: "#050508", borderRadius: 12, height: 48, fontWeight: 700, fontSize: 13, letterSpacing: "0.08em", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", marginTop: 4 }}>
                  AJOUTER LA POSITION
                </motion.button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* MODAL SNAPSHOT */}
      <AnimatePresence>
        {snapshotModal && (
          <>
            <motion.div className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSnapshotModal(false)} />
            <motion.div className="fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto" style={{ background: "rgba(5,5,8,0.97)", borderRadius: "24px 24px 0 0", border: `1px solid ${GOLD}20`, borderBottom: "none", backdropFilter: "blur(30px)", paddingBottom: "env(safe-area-inset-bottom)" }} initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={SPRING}>
              <div style={{ width: 40, height: 4, borderRadius: 999, background: "rgba(240,238,232,0.15)", margin: "12px auto 0" }} />
              <div className="flex items-center justify-between px-5 pt-5 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--text-primary)", letterSpacing: "0.05em" }}>NOUVEAU SNAPSHOT</span>
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setSnapshotModal(false)} style={{ color: "rgba(240,238,232,0.4)", background: "none", border: "none", cursor: "pointer", minWidth: 44, minHeight: 44 }}><X size={18} /></motion.button>
              </div>
              <form onSubmit={submitSnap(onSnapshot)} style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 10 }}>
                <input {...regSnap("date")} type="date" className="input-dark" />
                <input {...regSnap("bankBalance")} type="number" step="0.01" placeholder="Solde banque (€)" className="input-dark" />
                <input {...regSnap("totalInvested")} type="number" step="0.01" placeholder="Capital investi (€)" className="input-dark" />
                <input {...regSnap("totalValue")} type="number" step="0.01" placeholder="Valeur actuelle portefeuille (€)" className="input-dark" />
                <motion.button whileTap={{ scale: 0.97 }} type="submit" className="shimmer-btn" style={{ background: `linear-gradient(135deg, ${GOLD}, #A88930)`, color: "#050508", borderRadius: 12, height: 48, fontWeight: 700, fontSize: 13, letterSpacing: "0.08em", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", marginTop: 4 }}>
                  ENREGISTRER
                </motion.button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
