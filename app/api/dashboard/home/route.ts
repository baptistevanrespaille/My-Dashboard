import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const sevenDaysAgo = new Date(today); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date(today); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - ((today.getDay() + 6) % 7)); // Monday

    const [
      todayWorkoutRaw,
      lastWorkoutRaw,
      weekSessionsRaw,
      latestWeightRaw,
      prevWeightRaw,
      todayNutrition,
      lastSleepRaw,
      latestFinance,
      financeWeekAgo,
      pendingTasksRaw,
      weightHistoryRaw,
      weekNutrition,
    ] = await Promise.all([
      // Today's workout
      prisma.workoutSession.findFirst({
        where: { date: today },
        include: { exercises: true, cardioLog: true },
        orderBy: { createdAt: "desc" },
      }),
      // Last workout (any day)
      prisma.workoutSession.findFirst({
        where: { date: { lt: today } },
        include: { exercises: true, cardioLog: true },
        orderBy: { date: "desc" },
      }),
      // Sessions this week
      prisma.workoutSession.findMany({
        where: { date: { gte: weekStart } },
        select: { id: true },
      }),
      // Latest weight
      prisma.bodyMetric.findFirst({ orderBy: { date: "desc" } }),
      // Previous weight (before latest)
      prisma.bodyMetric.findMany({ orderBy: { date: "desc" }, take: 2, skip: 1 }),
      // Today's nutrition
      prisma.nutritionLog.findFirst({ where: { date: today } }),
      // Last sleep
      prisma.sleepLog.findFirst({ orderBy: { date: "desc" } }),
      // Latest finance
      prisma.financeSnapshot.findFirst({ orderBy: { date: "desc" } }),
      // Finance 7 days ago
      prisma.financeSnapshot.findFirst({ where: { date: { lte: sevenDaysAgo } }, orderBy: { date: "desc" } }),
      // Pending tasks today
      prisma.task.findMany({
        where: { scope: "DAY", completed: false },
        orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
        take: 5,
      }),
      // Weight history 30 days
      prisma.bodyMetric.findMany({
        where: { date: { gte: thirtyDaysAgo } },
        orderBy: { date: "asc" },
      }),
      // This week's calories
      prisma.nutritionLog.findMany({
        where: { date: { gte: sevenDaysAgo } },
        select: { calories: true },
      }),
    ]);

    const n = (v: any) => v ? Number(v) : null;
    const serializeWorkout = (w: any) => !w ? null : {
      type: w.type as string,
      sessionLabel: w.sessionLabel as string | null,
      duration: w.duration as number,
      exerciseCount: w.exercises?.length ?? 0,
      totalVolume: w.exercises?.reduce((t: number, ex: any) => {
        const sets = (ex.sets ?? []) as { reps: number; weightKg: number }[];
        return t + sets.reduce((s, set) => s + set.reps * set.weightKg, 0);
      }, 0) ?? 0,
      distanceKm: w.cardioLog?.distanceKm ? n(w.cardioLog.distanceKm) : null,
    };

    const latestWeightVal = n(latestWeightRaw?.weight);
    const prevWeightVal = prevWeightRaw.length > 0 ? n(prevWeightRaw[0].weight) : null;

    const sleepScore = lastSleepRaw
      ? Math.round((Number(lastSleepRaw.duration) / 8 * 0.6 + lastSleepRaw.quality / 5 * 0.4) * 100)
      : null;

    const financeTotal = latestFinance
      ? n(latestFinance.bankBalance)! + n(latestFinance.totalValue)!
      : null;
    const financeWeekAgoTotal = financeWeekAgo
      ? n(financeWeekAgo.bankBalance)! + n(financeWeekAgo.totalValue)!
      : null;

    const avgCalThisWeek = weekNutrition.length
      ? Math.round(weekNutrition.reduce((s, d) => s + d.calories, 0) / weekNutrition.length)
      : null;

    // Weight goal from reading — we can't access localStorage server side
    // We return the data, client merges with localStorage prefs
    const weightHistory = weightHistoryRaw.map((w) => ({
      date: w.date.toISOString().split("T")[0],
      value: Number(w.weight),
    }));

    // Moving average 7d for trend line
    const weightWithMA = weightHistory.map((d, i) => {
      const slice = weightHistory.slice(Math.max(0, i - 6), i + 1);
      const ma = slice.reduce((s, x) => s + x.value, 0) / slice.length;
      return { ...d, ma: parseFloat(ma.toFixed(2)) };
    });

    return NextResponse.json({
      todayWorkout: serializeWorkout(todayWorkoutRaw),
      lastWorkout: serializeWorkout(lastWorkoutRaw),
      weekSessions: weekSessionsRaw.length,
      latestWeight: latestWeightVal != null ? {
        value: latestWeightVal,
        date: latestWeightRaw!.date.toISOString().split("T")[0],
        previousValue: prevWeightVal,
      } : null,
      todayCalories: todayNutrition ? {
        calories: todayNutrition.calories,
      } : null,
      avgCalories7d: avgCalThisWeek,
      lastSleep: lastSleepRaw ? {
        duration: Number(lastSleepRaw.duration),
        quality: lastSleepRaw.quality,
        score: sleepScore,
      } : null,
      totalPatrimoine: financeTotal != null ? {
        value: financeTotal,
        change7d: financeWeekAgoTotal != null ? financeTotal - financeWeekAgoTotal : null,
      } : null,
      pendingTasks: pendingTasksRaw.map((t) => ({
        id: t.id, title: t.title, priority: t.priority, scope: t.scope,
        dueDate: t.dueDate ? t.dueDate.toISOString().split("T")[0] : null,
      })),
      weightHistory: weightWithMA,
    });
  } catch (e) {
    console.error("[dashboard/home]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
