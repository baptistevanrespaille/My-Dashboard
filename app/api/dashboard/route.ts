import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [latestWeight, todayNutrition, latestSleep, todayTasks, recentWorkouts] = await Promise.all([
    prisma.bodyMetric.findFirst({ orderBy: { date: "desc" } }),
    prisma.nutritionLog.findFirst({ where: { date: today } }),
    prisma.sleepLog.findFirst({ orderBy: { date: "desc" } }),
    prisma.task.findMany({
      where: { scope: "DAY", completed: false },
      orderBy: { priority: "desc" },
      take: 1,
    }),
    prisma.workoutSession.findMany({
      where: { date: { gte: new Date(Date.now() - 35 * 86400000) } },
      orderBy: { date: "desc" },
      select: { date: true },
    }),
  ]);

  // Calcul du streak
  let streak = 0;
  const workoutDates = new Set(
    recentWorkouts.map((w) => w.date.toISOString().split("T")[0])
  );
  for (let i = 0; i <= 35; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    if (workoutDates.has(key)) streak++;
    else if (i > 0) break;
  }

  return NextResponse.json({
    latestWeight,
    todayNutrition,
    latestSleep,
    nextTask: todayTasks[0] ?? null,
    workoutStreak: streak,
  });
}
