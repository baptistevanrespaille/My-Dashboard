"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Dumbbell, Timer, ChevronLeft } from "lucide-react";
import { format } from "date-fns";

// ─── Exercices pré-enregistrés ────────────────────────────────────────────────
const EXERCISES: Record<string, string[]> = {
  PUSH: ["Développé couché", "Développé incliné", "Développé décliné", "Overhead Press", "Élévations latérales", "Écartés", "Dips", "Triceps corde", "Triceps barre front", "Extensions triceps"],
  PULL: ["Tractions", "Rowing barre", "Rowing haltère", "Tirage vertical", "Tirage horizontal", "Face pull", "Curl biceps barre", "Curl haltères", "Curl marteau", "Shrugs"],
  LEGS: ["Squat", "Presse à cuisses", "Fentes", "Leg curl", "Leg extension", "Soulevé de terre jambes tendues", "Hip thrust", "Mollets debout", "Mollets assis", "Hack squat"],
  FULL_BODY: ["Soulevé de terre", "Développé couché", "Squat", "Tractions", "Dips", "Rowing barre"],
  OTHER: ["Soulevé de terre", "Développé couché", "Squat", "Tractions", "Dips", "Rowing barre"],
};

const PPL_LABELS = [
  { id: "PUSH", label: "Push", color: "border-blue-500/40 bg-blue-500/10 text-blue-300" },
  { id: "PULL", label: "Pull", color: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" },
  { id: "LEGS", label: "Legs", color: "border-orange-500/40 bg-orange-500/10 text-orange-300" },
  { id: "FULL_BODY", label: "Full Body", color: "border-purple-500/40 bg-purple-500/10 text-purple-300" },
  { id: "OTHER", label: "Autre", color: "border-zinc-500/40 bg-zinc-500/10 text-zinc-300" },
];

const CARDIO_LABELS = [
  { id: "RUNNING", label: "Running" }, { id: "CYCLING", label: "Vélo" },
  { id: "ROWING", label: "Rameur" }, { id: "ELLIPTICAL", label: "Elliptique" },
  { id: "OTHER", label: "Autre" },
];

// ─── Schémas ──────────────────────────────────────────────────────────────────
const setSchema = z.object({ reps: z.coerce.number().int().min(1), weightKg: z.coerce.number().min(0) });
const exerciseSchema = z.object({ exerciseName: z.string().min(1), sets: z.array(setSchema).min(1) });

const strengthSchema = z.object({
  date: z.string(), type: z.literal("STRENGTH"), sessionLabel: z.string(),
  duration: z.coerce.number().int().min(1), notes: z.string().optional(),
  exercises: z.array(exerciseSchema).min(1),
});

const cardioSchema = z.object({
  date: z.string(), type: z.literal("RUNNING"), sessionLabel: z.string(),
  duration: z.coerce.number().int().min(1), notes: z.string().optional(),
  distanceKm: z.coerce.number().min(0).optional(),
  avgHeartRate: z.coerce.number().int().optional(),
  route: z.string().optional(),
});

type Step = "main" | "ppl" | "strength_form" | "cardio_label" | "cardio_form";

export default function WorkoutModal({ open, onClose, onSave }: {
  open: boolean; onClose: () => void; onSave: (data: any) => Promise<void>;
}) {
  const [step, setStep] = useState<Step>("main");
  const [_workoutKind, setWorkoutKind] = useState<"STRENGTH" | "CARDIO" | null>(null);
  const [sessionLabel, setSessionLabel] = useState<string>("");
  const [saving, setSaving] = useState(false);

  function reset() { setStep("main"); setSessionLabel(""); }
  function handleClose() { reset(); onClose(); }

  async function handleSave(data: any) {
    setSaving(true);
    await onSave({ ...data, sessionLabel });
    setSaving(false);
    reset();
  }

  const title = step === "main" ? "Nouvelle session" : step === "ppl" ? "Type de séance" :
    step === "strength_form" ? `💪 ${PPL_LABELS.find(l => l.id === sessionLabel)?.label ?? "Musculation"}` :
    step === "cardio_label" ? "Type de cardio" : `🏃 ${CARDIO_LABELS.find(l => l.id === sessionLabel)?.label ?? "Cardio"}`;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="bg-[#1A1A1A] border-white/10 text-white max-w-sm mx-auto rounded-2xl p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            {step !== "main" && (
              <button onClick={() => { if (step === "ppl" || step === "cardio_label") setStep("main"); else if (step === "strength_form") setStep("ppl"); else if (step === "cardio_form") setStep("cardio_label"); }} className="text-zinc-500 hover:text-white transition-colors">
                <ChevronLeft size={18} />
              </button>
            )}
            <DialogTitle className="text-base font-bold">{title}</DialogTitle>
          </div>
        </DialogHeader>

        <div className="max-h-[78vh] overflow-y-auto px-5 py-4">
          {step === "main" && (
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => { setWorkoutKind("STRENGTH"); setStep("ppl"); }} className="flex flex-col items-center gap-3 p-5 bg-[#6495ED]/10 border border-[#6495ED]/30 rounded-2xl hover:bg-[#6495ED]/20 transition-colors">
                <Dumbbell size={30} className="text-[#6495ED]" />
                <span className="font-semibold text-white text-sm">Musculation</span>
              </button>
              <button onClick={() => { setWorkoutKind("CARDIO"); setStep("cardio_label"); }} className="flex flex-col items-center gap-3 p-5 bg-red-500/10 border border-red-500/30 rounded-2xl hover:bg-red-500/20 transition-colors">
                <Timer size={30} className="text-red-400" />
                <span className="font-semibold text-white text-sm">Cardio</span>
              </button>
            </div>
          )}

          {step === "ppl" && (
            <div className="grid grid-cols-2 gap-2.5">
              {PPL_LABELS.map((l) => (
                <button key={l.id} onClick={() => { setSessionLabel(l.id); setStep("strength_form"); }}
                  className={`p-4 border rounded-xl text-sm font-semibold transition-colors ${l.color}`}>
                  {l.label}
                </button>
              ))}
            </div>
          )}

          {step === "cardio_label" && (
            <div className="grid grid-cols-2 gap-2.5">
              {CARDIO_LABELS.map((l) => (
                <button key={l.id} onClick={() => { setSessionLabel(l.id); setStep("cardio_form"); }}
                  className="p-4 border border-red-500/30 bg-red-500/10 rounded-xl text-sm font-semibold text-red-300 hover:bg-red-500/20 transition-colors">
                  {l.label}
                </button>
              ))}
            </div>
          )}

          {step === "strength_form" && (
            <StrengthForm sessionLabel={sessionLabel} onSave={handleSave} saving={saving} />
          )}

          {step === "cardio_form" && (
            <CardioForm sessionLabel={sessionLabel} onSave={handleSave} saving={saving} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StrengthForm({ sessionLabel, onSave, saving }: { sessionLabel: string; onSave: (d: any) => void; saving: boolean }) {
  const exercises = EXERCISES[sessionLabel] ?? EXERCISES.OTHER;
  const today = format(new Date(), "yyyy-MM-dd");

  const { register, control, handleSubmit, watch } = useForm({
    resolver: zodResolver(strengthSchema),
    defaultValues: {
      date: today, type: "STRENGTH" as const, sessionLabel,
      duration: 60, notes: "",
      exercises: [{ exerciseName: exercises[0], sets: [{ reps: 10, weightKg: 60 }] }],
    },
  });

  const { fields: exFields, append: addEx, remove: rmEx } = useFieldArray({ control, name: "exercises" });

  const allExercises = watch("exercises");
  const totalVolume = allExercises.reduce((t, ex) =>
    t + ex.sets.reduce((s, set) => s + (Number(set.reps) || 0) * (Number(set.weightKg) || 0), 0), 0);

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date"><Input type="date" {...register("date")} className="input-dark" /></Field>
        <Field label="Durée (min)"><Input type="number" {...register("duration")} className="input-dark" /></Field>
      </div>

      <div className="space-y-3">
        {exFields.map((ex, ei) => (
          <ExerciseBlock key={ex.id} control={control} register={register} index={ei} onRemove={() => rmEx(ei)} exerciseList={exercises} watch={watch} />
        ))}
        <button type="button" onClick={() => addEx({ exerciseName: exercises[0], sets: [{ reps: 10, weightKg: 60 }] })}
          className="w-full flex items-center justify-center gap-2 border border-dashed border-[#6495ED]/40 rounded-xl py-3 text-sm text-[#6495ED] hover:bg-[#6495ED]/5 transition-colors">
          <Plus size={14} /> Ajouter un exercice
        </button>
      </div>

      {totalVolume > 0 && (
        <div className="bg-[#6495ED]/10 border border-[#6495ED]/20 rounded-xl p-3 text-center">
          <p className="text-xs text-zinc-400">Volume total de la session</p>
          <p className="text-lg font-bold text-[#6495ED]">{totalVolume.toLocaleString("fr-FR")} kg</p>
        </div>
      )}

      <Button type="submit" disabled={saving} className="w-full bg-[#6495ED] hover:bg-[#4a7de8] text-white rounded-xl h-11">
        {saving ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </form>
  );
}

function ExerciseBlock({ control, register, index, onRemove, exerciseList, watch }: any) {
  const { fields, append, remove } = useFieldArray({ control, name: `exercises.${index}.sets` });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const currentName = watch(`exercises.${index}.exerciseName`);

  const sets = watch(`exercises.${index}.sets`) ?? [];
  const exVol = sets.reduce((s: number, set: any) => s + (Number(set.reps) || 0) * (Number(set.weightKg) || 0), 0);

  return (
    <div className="bg-[#111] border border-white/[0.06] rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Input {...register(`exercises.${index}.exerciseName`)} placeholder="Exercice" className="input-dark" onFocus={() => setShowSuggestions(true)} onBlur={() => setTimeout(() => setShowSuggestions(false), 150)} />
          {showSuggestions && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-[#1A1A1A] border border-white/10 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
              {exerciseList.filter((e: string) => e.toLowerCase().includes((currentName ?? "").toLowerCase())).map((e: string) => (
                <button key={e} type="button" onMouseDown={() => { register(`exercises.${index}.exerciseName`).onChange({ target: { value: e, name: `exercises.${index}.exerciseName` } }); setShowSuggestions(false); }}
                  className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-white/5 transition-colors">{e}</button>
              ))}
            </div>
          )}
        </div>
        {exVol > 0 && <span className="text-xs text-zinc-500 flex-shrink-0">{exVol}kg</span>}
        <button type="button" onClick={onRemove} className="text-zinc-700 hover:text-red-400 p-1 flex-shrink-0"><Trash2 size={14} /></button>
      </div>

      <div className="space-y-1.5">
        {fields.map((set, si) => (
          <div key={set.id} className="flex items-center gap-2">
            <span className="text-[11px] text-zinc-600 w-4 text-right">{si + 1}</span>
            <Input type="number" {...register(`exercises.${index}.sets.${si}.reps`)} placeholder="Reps" className="input-dark flex-1 text-center h-9" />
            <span className="text-xs text-zinc-600">×</span>
            <Input type="number" step="0.5" {...register(`exercises.${index}.sets.${si}.weightKg`)} placeholder="kg" className="input-dark flex-1 text-center h-9" />
            <span className="text-xs text-zinc-600">kg</span>
            {fields.length > 1 && <button type="button" onClick={() => remove(si)} className="text-zinc-700 hover:text-red-400 p-1"><Trash2 size={11} /></button>}
          </div>
        ))}
        <button type="button" onClick={() => append({ reps: 10, weightKg: 60 })} className="text-xs text-[#6495ED] hover:text-[#9bb9f3] flex items-center gap-1 pl-5 transition-colors">
          <Plus size={11} /> Série
        </button>
      </div>
    </div>
  );
}

function CardioForm({ sessionLabel, onSave, saving }: { sessionLabel: string; onSave: (d: any) => void; saving: boolean }) {
  const today = format(new Date(), "yyyy-MM-dd");
  const { register, handleSubmit, watch } = useForm({
    resolver: zodResolver(cardioSchema),
    defaultValues: { date: today, type: "RUNNING" as const, sessionLabel, duration: 35, distanceKm: undefined as any, avgHeartRate: undefined as any, route: "" },
  });

  const distance = watch("distanceKm");
  const duration = watch("duration");
  const pace = distance && duration ? (Number(duration) / Number(distance)).toFixed(2) : null;
  const hasDistance = ["RUNNING", "CYCLING", "ROWING"].includes(sessionLabel);

  return (
    <form onSubmit={handleSubmit((d) => onSave({ ...d, avgPaceMinPerKm: pace ? parseFloat(pace) : undefined }))} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date"><Input type="date" {...register("date")} className="input-dark" /></Field>
        <Field label="Durée (min)"><Input type="number" {...register("duration")} className="input-dark" /></Field>
        {hasDistance && (
          <Field label="Distance (km)"><Input type="number" step="0.01" {...register("distanceKm")} placeholder="Optionnel" className="input-dark" /></Field>
        )}
        <Field label="FC moy. (bpm)"><Input type="number" {...register("avgHeartRate")} placeholder="Optionnel" className="input-dark" /></Field>
      </div>

      {pace && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
          <p className="text-xs text-zinc-400">Allure calculée</p>
          <p className="text-lg font-bold text-red-300">{pace} min/km</p>
        </div>
      )}

      <Field label="Parcours / notes"><Input {...register("route")} placeholder="Parc de la Tête d'Or…" className="input-dark" /></Field>

      <Button type="submit" disabled={saving} className="w-full bg-[#6495ED] hover:bg-[#4a7de8] text-white rounded-xl h-11">
        {saving ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><label className="text-xs text-zinc-400 font-medium">{label}</label>{children}</div>;
}
