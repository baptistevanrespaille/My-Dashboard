"use client";

import { useTransition, useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Trash2, CheckCircle2, Circle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/PageHeader";
import { cn } from "@/lib/utils";
// canvas-confetti chargé dynamiquement pour éviter l'erreur SSR
let confetti: any = null;
if (typeof window !== "undefined") {
  import("canvas-confetti").then((m) => { confetti = m.default; });
}

type Task = {
  id: string; title: string; scope: string; priority: string;
  completed: boolean; completedAt: string | null; createdAt: string;
};

const schema = z.object({
  title: z.string().min(1, "Titre requis"),
  scope: z.enum(["DAY", "WEEK"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
});

const PRIORITY: Record<string, { label: string; color: string; dot: string; badge: string }> = {
  HIGH:   { label: "Haute",   color: "text-red-400",     dot: "bg-red-400",     badge: "bg-red-500/15 text-red-300" },
  MEDIUM: { label: "Moyenne", color: "text-amber-400",   dot: "bg-amber-400",   badge: "bg-amber-500/15 text-amber-300" },
  LOW:    { label: "Basse",   color: "text-emerald-400", dot: "bg-emerald-400", badge: "bg-emerald-500/15 text-emerald-300" },
};

export default function TachesClient({ tasks: initialTasks }: { tasks: Task[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [filter, setFilter] = useState<"ALL" | "HIGH" | "MEDIUM" | "LOW">("ALL");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const { register, handleSubmit, reset, setValue } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { title: "", scope: "DAY" as const, priority: "MEDIUM" as const },
  });

  const dayTasks = initialTasks.filter((t) => t.scope === "DAY");
  const weekTasks = initialTasks.filter((t) => t.scope === "WEEK");
  const allDayDone = dayTasks.length > 0 && dayTasks.every((t) => t.completed);

  // Confetti quand toutes les tâches du jour sont complétées
  useEffect(() => {
    if (allDayDone) {
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 }, colors: ["#6495ED", "#10b981", "#f97316", "#f0f0f0"] });
    }
  }, [allDayDone]);

  async function onSubmit(values: any) {
    const res = await fetch("/api/tasks", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, dueDate: new Date().toISOString().split("T")[0] }),
    });
    if (res.ok) { toast.success("Tâche ajoutée !"); reset(); startTransition(() => router.refresh()); }
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

  const filterTask = (t: Task) => filter === "ALL" || t.priority === filter;

  return (
    <div className="px-4 space-y-4">
      <PageHeader title="Tâches" subtitle="Aujourd'hui & cette semaine" />

      {/* Formulaire rapide */}
      <form onSubmit={handleSubmit(onSubmit)} className="card-dark p-4 space-y-3">
        <Input {...register("title")} placeholder="Nouvelle tâche…" className="input-dark text-base" />
        <div className="flex gap-2">
          <Select defaultValue="DAY" onValueChange={(v) => setValue("scope", v as any)}>
            <SelectTrigger className="input-dark flex-1 h-10 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-[#1A1A1A] border-white/10 text-white">
              <SelectItem value="DAY" className="text-sm">Aujourd'hui</SelectItem>
              <SelectItem value="WEEK" className="text-sm">Cette semaine</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="MEDIUM" onValueChange={(v) => setValue("priority", v as any)}>
            <SelectTrigger className="input-dark flex-1 h-10 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-[#1A1A1A] border-white/10 text-white">
              <SelectItem value="HIGH" className="text-sm text-red-300">🔴 Haute</SelectItem>
              <SelectItem value="MEDIUM" className="text-sm text-amber-300">🟡 Moyenne</SelectItem>
              <SelectItem value="LOW" className="text-sm text-emerald-300">🟢 Basse</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" size="icon" className="bg-[#6495ED] hover:bg-[#4a7de8] rounded-xl h-10 w-10 flex-shrink-0">
            <Plus size={16} />
          </Button>
        </div>
      </form>

      {/* Filtre priorité */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(["ALL", "HIGH", "MEDIUM", "LOW"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn("flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors",
              filter === f ? "bg-[#6495ED] text-white" : "bg-white/5 text-zinc-400 hover:bg-white/10")}>
            {f === "ALL" ? "Toutes" : PRIORITY[f].label}
          </button>
        ))}
      </div>

      <Tabs defaultValue="day">
        <TabsList className="w-full bg-[#1A1A1A] border border-white/[0.08] rounded-xl p-1 h-10">
          <TabsTrigger value="day" className="flex-1 rounded-lg text-xs data-[state=active]:bg-[#6495ED] data-[state=active]:text-white text-zinc-400">
            Aujourd'hui <span className="ml-1 opacity-60">{dayTasks.filter(t=>!t.completed).length}/{dayTasks.length}</span>
          </TabsTrigger>
          <TabsTrigger value="week" className="flex-1 rounded-lg text-xs data-[state=active]:bg-[#6495ED] data-[state=active]:text-white text-zinc-400">
            Semaine <span className="ml-1 opacity-60">{weekTasks.filter(t=>!t.completed).length}/{weekTasks.length}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="day" className="mt-3 space-y-2">
          {allDayDone && dayTasks.length > 0 && (
            <div className="card-dark p-4 text-center border border-emerald-500/30">
              <p className="text-xl mb-1">🎉</p>
              <p className="text-sm font-semibold text-emerald-400">Toutes les tâches du jour sont complétées !</p>
              <p className="text-xs text-zinc-500 mt-0.5">Excellent travail, Baptiste !</p>
            </div>
          )}
          <ProgressBar tasks={dayTasks} />
          <TaskList tasks={dayTasks.filter(filterTask)} onToggle={toggleTask} onDelete={deleteTask}
            editingId={editingId} setEditingId={setEditingId} editValue={editValue} setEditValue={setEditValue} onSaveEdit={saveEdit} />
        </TabsContent>

        <TabsContent value="week" className="mt-3 space-y-2">
          <ProgressBar tasks={weekTasks} />
          <TaskList tasks={weekTasks.filter(filterTask)} onToggle={toggleTask} onDelete={deleteTask}
            editingId={editingId} setEditingId={setEditingId} editValue={editValue} setEditValue={setEditValue} onSaveEdit={saveEdit} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProgressBar({ tasks }: { tasks: Task[] }) {
  const done = tasks.filter((t) => t.completed).length;
  const total = tasks.length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="card-dark p-3">
      <div className="flex justify-between mb-1.5">
        <span className="text-xs text-zinc-400">{done}/{total} complétées</span>
        <span className="text-xs font-bold text-[#6495ED]">{pct}%</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div className="h-full bg-[#6495ED] rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function TaskList({ tasks, onToggle, onDelete, editingId, setEditingId, editValue, setEditValue, onSaveEdit }: {
  tasks: Task[]; onToggle: (id: string, completed: boolean) => void; onDelete: (id: string) => void;
  editingId: string | null; setEditingId: (id: string | null) => void;
  editValue: string; setEditValue: (v: string) => void; onSaveEdit: (id: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editingId) inputRef.current?.focus(); }, [editingId]);

  if (tasks.length === 0) return (
    <div className="card-dark p-8 text-center">
      <CheckCircle2 size={28} className="text-zinc-700 mx-auto mb-2" />
      <p className="text-zinc-600 text-sm">Aucune tâche ici</p>
    </div>
  );

  const todo = tasks.filter((t) => !t.completed);
  const done = tasks.filter((t) => t.completed);

  return (
    <div className="space-y-1.5">
      {[...todo, ...done].map((task) => {
        const p = PRIORITY[task.priority];
        return (
          <div key={task.id} className={cn("flex items-center gap-3 card-dark px-3 py-3 transition-opacity", task.completed && "opacity-45")}>
            <button onClick={() => onToggle(task.id, task.completed)} className="flex-shrink-0">
              {task.completed ? <CheckCircle2 size={20} className="text-[#6495ED]" /> : <Circle size={20} className="text-zinc-600" />}
            </button>

            <div className="flex-1 min-w-0">
              {editingId === task.id ? (
                <input ref={inputRef} value={editValue} onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => onSaveEdit(task.id)}
                  onKeyDown={(e) => { if (e.key === "Enter") onSaveEdit(task.id); if (e.key === "Escape") setEditingId(null); }}
                  className="w-full bg-transparent text-sm text-white outline-none border-b border-[#6495ED]" />
              ) : (
                <p onDoubleClick={() => { setEditingId(task.id); setEditValue(task.title); }}
                  className={cn("text-sm font-medium text-white truncate cursor-text", task.completed && "line-through text-zinc-500")}>
                  {task.title}
                </p>
              )}
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${p.badge}`}>{p.label}</span>
            </div>

            <button onClick={() => onDelete(task.id)} className="text-zinc-700 hover:text-red-400 transition-colors p-1 flex-shrink-0">
              <Trash2 size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
