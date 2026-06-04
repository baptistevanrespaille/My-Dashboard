"use client";

import { useTransition, useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Trash2, CheckCircle2, Circle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

let confetti: any = null;
if (typeof window !== "undefined") {
  import("canvas-confetti").then((m) => { confetti = m.default; });
}

const ACCENT  = "#FFFFFF";
const GOLD    = "#FFFFFF";
const SUCCESS = "#FFFFFF";
const DANGER  = "rgba(255,255,255,0.5)";
const WARNING = "#FFFFFF";
const SPRING  = { type: "spring", stiffness: 380, damping: 35 } as const;

type Task = {
  id: string; title: string; scope: string; priority: string;
  completed: boolean; completedAt: string | null; createdAt: string;
};

const schema = z.object({
  title: z.string().min(1, "Titre requis"),
  scope: z.enum(["DAY", "WEEK"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
});

const PRIORITY: Record<string, { label: string; color: string; indicator: string; bg: string }> = {
  HIGH:   { label: "HAUTE",   color: DANGER,  indicator: DANGER,  bg: `${DANGER}15`  },
  MEDIUM: { label: "MOY.",    color: WARNING, indicator: WARNING, bg: `${WARNING}15` },
  LOW:    { label: "BASSE",   color: "rgba(248,248,255,0.3)", indicator: "rgba(248,248,255,0.12)", bg: "rgba(255,255,255,0.04)" },
};

function SegControl({ value, onChange, tabs }: { value: string; onChange: (v: string) => void; tabs: { key: string; label: string }[] }) {
  return (
    <div style={{ display: "flex", background: "var(--surface-2)", borderRadius: 14, padding: 4 }}>
      {tabs.map((t) => {
        const active = t.key === value;
        return (
          <button key={t.key} onClick={() => onChange(t.key)} style={{
            flex: 1, padding: "10px 4px", borderRadius: 10, fontSize: 11,
            fontWeight: 700, letterSpacing: "0.08em", border: "none", cursor: "pointer",
            fontFamily: "var(--font-space)", minHeight: 40,
            background: active ? ACCENT : "transparent",
            color: active ? "#050508" : "rgba(248,248,255,0.3)",
            boxShadow: active ? `0 0 12px ${ACCENT}40` : "none",
            transition: "all 0.22s cubic-bezier(0.32,0.72,0,1)",
          }}>{t.label}</button>
        );
      })}
    </div>
  );
}

function ProgressCircle({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? done / total : 0;
  const r = 27;
  const circ = 2 * Math.PI * r;
  const isComplete = total > 0 && done === total;
  const strokeColor = isComplete ? GOLD : ACCENT;

  return (
    <div style={{ position: "relative", width: 64, height: 64, flexShrink: 0 }}>
      <svg width={64} height={64} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={32} cy={32} r={r} stroke="var(--surface-3)" strokeWidth={4} fill="none" />
        <motion.circle
          cx={32} cy={32} r={r}
          stroke={strokeColor} strokeWidth={4} fill="none"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ * (1 - pct) }}
          transition={{ duration: 1, ease: [0.32, 0.72, 0, 1], delay: 0.2 }}
          style={{ filter: `drop-shadow(0 0 6px ${strokeColor}80)` }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: "var(--font-space)", fontSize: 12, fontWeight: 700, color: strokeColor, lineHeight: 1 }}>
          {done}/{total}
        </span>
      </div>
    </div>
  );
}

export default function TachesClient({ tasks: initialTasks }: { tasks: Task[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [tab, setTab] = useState("day");
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [celebrationVisible, setCelebrationVisible] = useState(false);

  const { register, handleSubmit, reset, setValue } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { title: "", scope: "DAY" as const, priority: "MEDIUM" as const },
  });

  const dayTasks = initialTasks.filter((t) => t.scope === "DAY");
  const weekTasks = initialTasks.filter((t) => t.scope === "WEEK");
  const allDayDone = dayTasks.length > 0 && dayTasks.every((t) => t.completed);

  useEffect(() => {
    if (allDayDone) {
      confetti?.({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: [ACCENT, GOLD, SUCCESS, "#fff"] });
      setCelebrationVisible(true);
      const t = setTimeout(() => setCelebrationVisible(false), 3000);
      return () => clearTimeout(t);
    }
  }, [allDayDone]);

  async function onSubmit(values: any) {
    const res = await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, dueDate: new Date().toISOString().split("T")[0] }) });
    if (res.ok) { toast.success("Tâche ajoutée !"); reset(); setAddOpen(false); startTransition(() => router.refresh()); }
    else toast.error("Erreur");
  }

  async function toggleTask(id: string, completed: boolean) {
    await fetch(`/api/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ completed: !completed }) });
    startTransition(() => router.refresh());
  }

  async function deleteTask(id: string) {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    toast.success("Supprimée");
    startTransition(() => router.refresh());
  }

  async function saveEdit(id: string) {
    if (!editValue.trim()) { setEditingId(null); return; }
    await fetch(`/api/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: editValue.trim() }) });
    setEditingId(null);
    startTransition(() => router.refresh());
  }

  const tasks = tab === "day" ? dayTasks : weekTasks;
  const doneTasks = tasks.filter((t) => t.completed);
  const todoTasks = tasks.filter((t) => !t.completed);

  return (
    <div style={{ padding: "0 20px 20px" }}>

      {/* CELEBRATION OVERLAY */}
      <AnimatePresence>
        {celebrationVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, pointerEvents: "none" }}
          >
            <motion.p
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              style={{ fontFamily: "var(--font-orbitron)", fontSize: 40, color: GOLD, letterSpacing: "0.05em", textShadow: `0 0 40px ${GOLD}` }}
            >
              TOUT ACCOMPLI
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }} style={{ paddingTop: 60, paddingBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-orbitron)", fontSize: 56, letterSpacing: "0.05em", color: "var(--text-primary)", lineHeight: 1 }}>TÂCHES</h1>
            <p style={{ fontSize: 13, color: "rgba(248,248,255,0.45)", marginTop: 6, fontFamily: "var(--font-space)" }}>
              {format(new Date(), "d MMMM yyyy", { locale: fr }).toUpperCase()}
            </p>
          </div>
          <ProgressCircle done={doneTasks.length} total={tasks.length} />
        </div>
        <div style={{ height: 1, marginTop: 16, background: `linear-gradient(90deg, transparent, ${ACCENT}33, transparent)` }} />
      </motion.div>

      {/* TABS */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }} style={{ marginBottom: 20 }}>
        <SegControl
          value={tab} onChange={setTab}
          tabs={[
            { key: "day", label: "AUJOURD'HUI" },
            { key: "week", label: "CETTE SEMAINE" },
          ]}
        />
      </motion.div>

      {/* TASK LISTS */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
          style={{ display: "flex", flexDirection: "column", gap: 8 }}
        >
          {/* All done celebration */}
          {allDayDone && tab === "day" && tasks.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ background: `${SUCCESS}12`, border: `1px solid ${SUCCESS}30`, borderRadius: 20, padding: 20, textAlign: "center" }}
            >
              <p style={{ fontFamily: "var(--font-orbitron)", fontSize: 24, letterSpacing: "0.05em", color: SUCCESS }}>TOUT ACCOMPLI 🎉</p>
              <p style={{ fontSize: 13, color: "rgba(248,248,255,0.45)", marginTop: 4 }}>Excellent travail, Baptiste !</p>
            </motion.div>
          )}

          {/* To-do */}
          {todoTasks.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {todoTasks.map((task, i) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  index={i}
                  onToggle={() => toggleTask(task.id, task.completed)}
                  onDelete={() => deleteTask(task.id)}
                  editingId={editingId}
                  setEditingId={setEditingId}
                  editValue={editValue}
                  setEditValue={setEditValue}
                  onSaveEdit={saveEdit}
                />
              ))}
            </div>
          )}

          {/* Completed section */}
          {doneTasks.length > 0 && (
            <div>
              <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(248,248,255,0.2)", margin: "12px 0 8px" }}>
                COMPLÉTÉES · {doneTasks.length}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {doneTasks.map((task, i) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    index={i}
                    onToggle={() => toggleTask(task.id, task.completed)}
                    onDelete={() => deleteTask(task.id)}
                    editingId={editingId}
                    setEditingId={setEditingId}
                    editValue={editValue}
                    setEditValue={setEditValue}
                    onSaveEdit={saveEdit}
                  />
                ))}
              </div>
            </div>
          )}

          {tasks.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <CheckCircle2 size={36} style={{ color: "rgba(248,248,255,0.12)", display: "block", margin: "0 auto 12px" }} />
              <p style={{ color: "rgba(248,248,255,0.25)", fontSize: 14 }}>Aucune tâche ici</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ADD BUTTON */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setAddOpen(true)}
        className="shimmer-btn"
        style={{
          display: "flex", alignItems: "center", gap: 8,
          marginTop: 20,
          background: `linear-gradient(135deg, ${ACCENT}, rgba(255,255,255,0.8))`,
          color: "#050508", borderRadius: 14, height: 52,
          width: "100%", fontWeight: 700, fontSize: 13, letterSpacing: "0.08em",
          border: "none", cursor: "pointer", fontFamily: "var(--font-space)",
          justifyContent: "center",
          boxShadow: `0 4px 24px ${ACCENT}25`,
        }}
      >
        <Plus size={16} strokeWidth={2.5} /> NOUVELLE TÂCHE
      </motion.button>

      {/* ADD SHEET */}
      <AnimatePresence>
        {addOpen && (
          <>
            <motion.div className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setAddOpen(false)} />
            <motion.div className="fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto" style={{ background: "rgba(5,5,8,0.97)", borderRadius: "24px 24px 0 0", border: `1px solid ${ACCENT}12`, borderBottom: "none", backdropFilter: "blur(30px)", paddingBottom: "env(safe-area-inset-bottom)" }} initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={SPRING}>
              <div style={{ width: 40, height: 4, borderRadius: 999, background: "rgba(248,248,255,0.15)", margin: "12px auto 0" }} />
              <div className="flex items-center justify-between px-5 pt-5 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ fontFamily: "var(--font-orbitron)", fontSize: 22, color: "var(--text-primary)", letterSpacing: "0.05em" }}>NOUVELLE TÂCHE</span>
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setAddOpen(false)} style={{ color: "rgba(248,248,255,0.4)", background: "none", border: "none", cursor: "pointer", minWidth: 44, minHeight: 44 }}><X size={18} /></motion.button>
              </div>
              <form onSubmit={handleSubmit(onSubmit)} style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ borderBottom: `1px solid ${ACCENT}35`, paddingBottom: 8 }}>
                  <input {...register("title")} autoFocus placeholder="Titre de la tâche…" style={{ background: "none", border: "none", outline: "none", color: "var(--text-primary)", fontSize: 16, width: "100%", fontFamily: "var(--font-space)" }} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["DAY", "WEEK"] as const).map((s) => (
                    <motion.button key={s} type="button" whileTap={{ scale: 0.95 }} onClick={() => setValue("scope", s)} style={{
                      flex: 1, padding: "9px 4px", borderRadius: 10, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                      border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer", fontFamily: "var(--font-space)", minHeight: 40,
                      background: "var(--surface-3)", color: "rgba(248,248,255,0.5)",
                    }}>
                      {s === "DAY" ? "AUJOURD'HUI" : "SEMAINE"}
                    </motion.button>
                  ))}
                </div>
                {/* Priority */}
                <div style={{ display: "flex", gap: 8 }}>
                  {(["HIGH", "MEDIUM", "LOW"] as const).map((p) => {
                    const s = PRIORITY[p];
                    return (
                      <motion.button key={p} type="button" whileTap={{ scale: 0.95 }} onClick={() => setValue("priority", p)} style={{
                        flex: 1, padding: "9px 4px", borderRadius: 10, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
                        background: s.bg, color: s.color, border: `1px solid ${s.indicator}40`,
                        cursor: "pointer", fontFamily: "var(--font-space)", minHeight: 40,
                        transition: "all 0.18s cubic-bezier(0.32,0.72,0,1)",
                      }}>
                        {s.label}
                      </motion.button>
                    );
                  })}
                </div>
                <motion.button type="submit" whileTap={{ scale: 0.97 }} className="shimmer-btn" style={{ background: `linear-gradient(135deg, ${ACCENT}, rgba(255,255,255,0.8))`, color: "#050508", borderRadius: 12, height: 50, fontWeight: 700, fontSize: 13, letterSpacing: "0.08em", border: "none", cursor: "pointer", fontFamily: "var(--font-space)" }}>
                  AJOUTER
                </motion.button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function TaskCard({ task, index, onToggle, onDelete, editingId, setEditingId, editValue, setEditValue, onSaveEdit }: {
  task: Task; index: number;
  onToggle: () => void; onDelete: () => void;
  editingId: string | null; setEditingId: (id: string | null) => void;
  editValue: string; setEditValue: (v: string) => void;
  onSaveEdit: (id: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editingId === task.id) inputRef.current?.focus(); }, [editingId, task.id]);
  const p = PRIORITY[task.priority];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: task.completed ? 0.4 : 1, x: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 35, delay: index * 0.04 }}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.05)",
        borderRadius: 16, padding: "13px 14px",
        position: "relative", overflow: "hidden",
      }}
    >
      {/* Left indicator */}
      <div style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", width: 3, height: 22, borderRadius: "0 2px 2px 0", background: p.indicator }} />

      {/* Checkbox */}
      <motion.button whileTap={{ scale: 0.8 }} onClick={onToggle} style={{ flexShrink: 0, marginLeft: 4, background: "none", border: "none", cursor: "pointer", minWidth: 28, minHeight: 28 }}>
        {task.completed
          ? <CheckCircle2 size={22} style={{ color: ACCENT }} />
          : <Circle size={22} style={{ color: `${ACCENT}55` }} />}
      </motion.button>

      {/* Title */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {editingId === task.id ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => onSaveEdit(task.id)}
            onKeyDown={(e) => { if (e.key === "Enter") onSaveEdit(task.id); if (e.key === "Escape") setEditingId(null); }}
            style={{ background: "none", border: "none", outline: "none", borderBottom: `1px solid ${ACCENT}`, color: "var(--text-primary)", fontSize: 14, fontFamily: "var(--font-space)", width: "100%", paddingBottom: 2 }}
          />
        ) : (
          <p
            onDoubleClick={() => { setEditingId(task.id); setEditValue(task.title); }}
            style={{ fontSize: 14, fontWeight: 500, color: task.completed ? "rgba(248,248,255,0.3)" : "var(--text-primary)", textDecoration: task.completed ? "line-through" : "none", transition: "all 0.25s", cursor: "text" }}
          >
            {task.title}
          </p>
        )}
      </div>

      {/* Priority badge */}
      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", background: p.bg, color: p.color, padding: "3px 7px", borderRadius: 6, flexShrink: 0 }}>
        {p.label}
      </span>

      {/* Delete */}
      <motion.button whileTap={{ scale: 0.8 }} onClick={onDelete} style={{ color: "rgba(248,248,255,0.18)", flexShrink: 0, background: "none", border: "none", cursor: "pointer", minWidth: 28, minHeight: 28 }}>
        <Trash2 size={13} />
      </motion.button>
    </motion.div>
  );
}
