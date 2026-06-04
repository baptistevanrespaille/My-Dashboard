import { prisma } from "@/lib/prisma";
import SportClient from "./_components/SportClient";

async function getSportData() {
  const eightWeeksAgo = new Date();
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
  eightWeeksAgo.setHours(0, 0, 0, 0);

  const sessions = await prisma.workoutSession.findMany({
    where: { date: { gte: eightWeeksAgo } },
    include: { exercises: true, cardioLog: true },
    orderBy: { date: "desc" },
  });

  return sessions.map((s) => ({
    id: s.id,
    date: s.date.toISOString().split("T")[0],
    type: s.type as string,
    sessionLabel: s.sessionLabel,
    duration: s.duration,
    notes: s.notes,
    exercises: s.exercises.map((e) => ({
      id: e.id,
      exerciseName: e.exerciseName,
      sets: (e.sets ?? []) as { setNumber: number; reps: number; weightKg: number }[],
      notes: e.notes,
    })),
    cardioLog: s.cardioLog ? {
      distanceKm: s.cardioLog.distanceKm ? Number(s.cardioLog.distanceKm) : null,
      avgPaceMinPerKm: s.cardioLog.avgPaceMinPerKm ? Number(s.cardioLog.avgPaceMinPerKm) : null,
      avgHeartRate: s.cardioLog.avgHeartRate,
      route: s.cardioLog.route,
    } : null,
    createdAt: s.createdAt.toISOString(),
  }));
}

export default async function SportPage() {
  const sessions = await getSportData();
  return <SportClient sessions={sessions} />;
}
