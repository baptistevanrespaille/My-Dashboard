import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

const setSchema = z.object({
  setNumber: z.number().int().min(1),
  reps: z.number().int().min(0),
  weightKg: z.number().min(0),
});

const exerciseSchema = z.object({
  exerciseName: z.string().min(1),
  sets: z.array(setSchema).min(1),
  notes: z.string().optional(),
});

const strengthSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.literal("STRENGTH"),
  sessionLabel: z.string().optional(),
  duration: z.coerce.number().int().min(1),
  notes: z.string().optional(),
  exercises: z.array(exerciseSchema).min(1),
});

const cardioSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.enum(["RUNNING", "OTHER"]),
  sessionLabel: z.string().optional(),
  duration: z.coerce.number().int().min(1),
  notes: z.string().optional(),
  distanceKm: z.coerce.number().min(0).optional(),
  avgPaceMinPerKm: z.coerce.number().min(0).optional(),
  avgHeartRate: z.coerce.number().int().min(0).optional(),
  route: z.string().optional(),
});

const schema = z.union([strengthSchema, cardioSchema]);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const days = Math.min(parseInt(searchParams.get("days") ?? "60"), 365);
    const from = new Date();
    from.setDate(from.getDate() - days);
    from.setHours(0, 0, 0, 0);
    const sessions = await prisma.workoutSession.findMany({
      where: { date: { gte: from } },
      include: { exercises: true, cardioLog: true },
      orderBy: { date: "desc" },
    });
    return NextResponse.json(sessions.map((s) => ({
      ...s,
      date: s.date.toISOString(),
      exercises: s.exercises.map((e) => ({ ...e, sets: e.sets as any[] })),
      cardioLog: s.cardioLog ? {
        ...s.cardioLog,
        distanceKm: s.cardioLog.distanceKm ? Number(s.cardioLog.distanceKm) : null,
        avgPaceMinPerKm: s.cardioLog.avgPaceMinPerKm ? Number(s.cardioLog.avgPaceMinPerKm) : null,
      } : null,
    })));
  } catch (e) {
    console.error("[workouts GET]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const { date, type, sessionLabel, duration, notes } = parsed.data;
    const dateObj = new Date(date + "T00:00:00Z");

    if (parsed.data.type === "STRENGTH") {
      const { exercises } = parsed.data;
      const session = await prisma.workoutSession.create({
        data: {
          date: dateObj, type, sessionLabel, duration, notes,
          exercises: { create: exercises.map((e) => ({ exerciseName: e.exerciseName, sets: e.sets, notes: e.notes })) },
        },
        include: { exercises: true },
      });
      return NextResponse.json(session);
    } else {
      const { distanceKm, avgPaceMinPerKm, avgHeartRate, route } = parsed.data as any;
      const cardioLabel = sessionLabel ?? "RUNNING";
      const session = await prisma.workoutSession.create({
        data: {
          date: dateObj, type: "RUNNING", sessionLabel: cardioLabel, duration, notes,
          cardioLog: { create: { distanceKm, avgPaceMinPerKm, avgHeartRate, route } },
        },
        include: { cardioLog: true },
      });
      return NextResponse.json(session);
    }
  } catch (e) {
    console.error("[workouts POST]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
