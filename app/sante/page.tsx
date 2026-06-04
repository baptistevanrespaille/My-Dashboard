import { prisma } from "@/lib/prisma";
import SanteClient from "./_components/SanteClient";

async function getSanteData() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  fourteenDaysAgo.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const [weights, nutrition, sleep] = await Promise.all([
    prisma.bodyMetric.findMany({ where: { date: { gte: thirtyDaysAgo } }, orderBy: { date: "asc" } }),
    prisma.nutritionLog.findMany({ where: { date: { gte: sevenDaysAgo } }, orderBy: { date: "asc" } }),
    prisma.sleepLog.findMany({ where: { date: { gte: fourteenDaysAgo } }, orderBy: { date: "asc" } }),
  ]);

  return {
    weights: weights.map((w) => ({ date: w.date.toISOString().split("T")[0], weight: Number(w.weight) })),
    nutrition: nutrition.map((n) => ({
      date: n.date.toISOString().split("T")[0],
      calories: n.calories,
      protein: Number(n.protein),
      carbs: Number(n.carbs),
      fat: Number(n.fat),
    })),
    sleep: sleep.map((s) => ({
      date: s.date.toISOString().split("T")[0],
      duration: Number(s.duration),
      quality: s.quality,
      bedtime: s.bedtime instanceof Date ? `${String(s.bedtime.getHours()).padStart(2,"0")}:${String(s.bedtime.getMinutes()).padStart(2,"0")}` : "23:00",
      wakeTime: s.wakeTime instanceof Date ? `${String(s.wakeTime.getHours()).padStart(2,"0")}:${String(s.wakeTime.getMinutes()).padStart(2,"0")}` : "07:00",
    })),
  };
}

export default async function SantePage() {
  const data = await getSanteData();
  return <SanteClient data={data} />;
}
