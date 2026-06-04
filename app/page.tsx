import { prisma } from "@/lib/prisma";
import DashboardClient from "./_components/DashboardClient";

async function getDashboardData() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30); thirtyDaysAgo.setHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); sevenDaysAgo.setHours(0, 0, 0, 0);
  const sevenDaysAgoFinance = new Date(); sevenDaysAgoFinance.setDate(sevenDaysAgoFinance.getDate() - 7); sevenDaysAgoFinance.setHours(0, 0, 0, 0);

  const [latestWeight, todayNutrition, latestSleep, nextTask, weightHistory, caloriesHistory, recentWorkouts, latestFinance, financeWeekAgo] =
    await Promise.all([
      prisma.bodyMetric.findFirst({ orderBy: { date: "desc" } }),
      prisma.nutritionLog.findFirst({ where: { date: today } }),
      prisma.sleepLog.findFirst({ orderBy: { date: "desc" } }),
      prisma.task.findFirst({ where: { scope: "DAY", completed: false }, orderBy: { priority: "desc" } }),
      prisma.bodyMetric.findMany({ where: { date: { gte: thirtyDaysAgo } }, orderBy: { date: "asc" } }),
      prisma.nutritionLog.findMany({ where: { date: { gte: sevenDaysAgo } }, orderBy: { date: "asc" } }),
      prisma.workoutSession.findMany({
        where: { date: { gte: new Date(Date.now() - 35 * 86400000) } },
        orderBy: { date: "desc" },
        include: { cardioLog: true, exercises: true },
        take: 30,
      }),
      prisma.financeSnapshot.findFirst({ orderBy: { date: "desc" } }),
      prisma.financeSnapshot.findFirst({ where: { date: { lte: sevenDaysAgoFinance } }, orderBy: { date: "desc" } }),
    ]);

  // Streak calcul
  let streak = 0;
  const workoutDates = new Set(recentWorkouts.map((w) => w.date.toISOString().split("T")[0]));
  for (let i = 0; i <= 35; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    if (workoutDates.has(key)) streak++;
    else if (i > 0) break;
  }

  // Dernière session
  const lastSession = recentWorkouts[0] ?? null;

  // Moyenne mobile 7j poids
  const wHistory = weightHistory.map((w) => ({ date: w.date.toISOString().split("T")[0], weight: Number(w.weight) }));
  const with7jMA = wHistory.map((_, i) => {
    const slice = wHistory.slice(Math.max(0, i - 6), i + 1);
    const ma = slice.reduce((s, d) => s + d.weight, 0) / slice.length;
    return { ...wHistory[i], ma: parseFloat(ma.toFixed(2)) };
  });

  return {
    latestWeight: latestWeight ? { date: latestWeight.date.toISOString(), weight: Number(latestWeight.weight) } : null,
    todayNutrition: todayNutrition ? { calories: todayNutrition.calories } : null,
    latestSleep: latestSleep ? { duration: Number(latestSleep.duration), quality: latestSleep.quality } : null,
    nextTask: nextTask ? { title: nextTask.title, priority: nextTask.priority } : null,
    workoutStreak: streak,
    lastSession: lastSession ? {
      date: lastSession.date.toISOString().split("T")[0],
      type: lastSession.type,
      sessionLabel: lastSession.sessionLabel,
      duration: lastSession.duration,
      distanceKm: lastSession.cardioLog?.distanceKm ? Number(lastSession.cardioLog.distanceKm) : null,
      volume: lastSession.exercises.reduce((total, ex) => {
        const sets = (ex.sets as any[]);
        return total + sets.reduce((s: number, set: any) => s + (set.reps ?? 0) * (set.weightKg ?? 0), 0);
      }, 0),
    } : null,
    finance: latestFinance ? {
      bankBalance: Number(latestFinance.bankBalance),
      totalValue: Number(latestFinance.totalValue),
      total: Number(latestFinance.bankBalance) + Number(latestFinance.totalValue),
      variation7j: financeWeekAgo
        ? (Number(latestFinance.bankBalance) + Number(latestFinance.totalValue)) -
          (Number(financeWeekAgo.bankBalance) + Number(financeWeekAgo.totalValue))
        : null,
    } : null,
    weightHistory: with7jMA,
    caloriesHistory: caloriesHistory.map((c) => ({ date: c.date.toISOString().split("T")[0], calories: c.calories })),
  };
}

export default async function DashboardPage() {
  const data = await getDashboardData();
  return <DashboardClient data={data} />;
}
