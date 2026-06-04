import "dotenv/config";
import { PrismaClient, WorkoutType, TaskScope, TaskPriority } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as any);

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}
function timeOf(h: number, m: number): Date {
  return new Date(1970, 0, 1, h, m, 0);
}
function rand(min: number, max: number) { return Math.random() * (max - min) + min; }
function randInt(min: number, max: number) { return Math.floor(rand(min, max + 1)); }

async function main() {
  console.log("🌱 Seeding database...");

  // ── BodyMetrics (30j) ─────────────────────────────────────────────────────
  const baseWeight = 78.5;
  for (let i = 30; i >= 0; i--) {
    await prisma.bodyMetric.upsert({
      where: { date: daysAgo(i) },
      update: {},
      create: {
        date: daysAgo(i),
        weight: parseFloat((baseWeight - i * 0.02 + (Math.random() - 0.5) * 0.6).toFixed(1)),
        notes: i === 0 ? "Après sport" : null,
      },
    });
  }
  console.log("  ✓ BodyMetrics");

  // ── NutritionLogs (30j) ───────────────────────────────────────────────────
  for (let i = 30; i >= 0; i--) {
    const cheat = i % 7 === 0;
    await prisma.nutritionLog.upsert({
      where: { date: daysAgo(i) },
      update: {},
      create: {
        date: daysAgo(i),
        calories: cheat ? randInt(2400, 2900) : randInt(1900, 2300),
        protein: parseFloat(rand(140, 185).toFixed(1)),
        carbs: parseFloat(rand(180, 270).toFixed(1)),
        fat: parseFloat(rand(55, 85).toFixed(1)),
        notes: cheat ? "Cheat day 🍕" : null,
      },
    });
  }
  console.log("  ✓ NutritionLogs");

  // ── SleepLogs (30j) ───────────────────────────────────────────────────────
  for (let i = 30; i >= 0; i--) {
    const bedH = Math.random() > 0.5 ? 23 : 0;
    const bedM = randInt(0, 59);
    const wakeH = randInt(6, 7);
    const wakeM = randInt(0, 59);
    const duration = bedH === 0
      ? wakeH + wakeM / 60
      : (24 - bedH - bedM / 60) + wakeH + wakeM / 60;
    await prisma.sleepLog.upsert({
      where: { date: daysAgo(i) },
      update: {},
      create: {
        date: daysAgo(i),
        bedtime: timeOf(bedH, bedM),
        wakeTime: timeOf(wakeH, wakeM),
        duration: parseFloat(duration.toFixed(2)),
        quality: randInt(3, 5),
        notes: null,
      },
    });
  }
  console.log("  ✓ SleepLogs");

  // ── WorkoutSessions ───────────────────────────────────────────────────────
  const pplLabels = ["PUSH", "PULL", "LEGS"] as const;
  const pushExercises = ["Développé couché", "Développé incliné", "Overhead Press", "Élévations latérales", "Dips", "Triceps corde"];
  const pullExercises = ["Tractions", "Rowing barre", "Tirage vertical", "Face pull", "Curl biceps barre", "Curl marteau"];
  const legsExercises = ["Squat", "Presse à cuisses", "Leg curl", "Leg extension", "Hip thrust", "Mollets debout"];

  const exercisesByLabel: Record<string, string[]> = {
    PUSH: pushExercises,
    PULL: pullExercises,
    LEGS: legsExercises,
    FULL_BODY: ["Soulevé de terre", "Développé couché", "Squat", "Tractions", "Dips"],
    OTHER: ["Soulevé de terre", "Squat", "Développé couché"],
  };

  const strengthDays = [28, 26, 24, 21, 19, 17, 14, 12, 10, 7, 5, 3, 1, 0];
  const cardioDays = [27, 23, 20, 16, 13, 9, 6, 2];
  const cardioParcours = ["Parc de la Tête d'Or", "Berges du Rhône", "Parc Blandan", "Tour presqu'île"];

  for (let idx = 0; idx < strengthDays.length; idx++) {
    const day = strengthDays[idx];
    const label = pplLabels[idx % 3];
    const exercises = exercisesByLabel[label];
    const exCount = randInt(3, 5);
    const shuffled = [...exercises].sort(() => Math.random() - 0.5).slice(0, exCount);

    const session = await prisma.workoutSession.create({
      data: {
        date: daysAgo(day),
        type: WorkoutType.STRENGTH,
        sessionLabel: label,
        duration: randInt(55, 90),
      },
    });

    for (const exName of shuffled) {
      const setCount = randInt(3, 4);
      const sets = Array.from({ length: setCount }, (_, i) => ({
        setNumber: i + 1,
        reps: randInt(8, 12),
        weightKg: parseFloat((Math.floor(rand(60, 90) / 2.5) * 2.5).toFixed(1)),
      }));
      await prisma.workoutExercise.create({
        data: { workoutSessionId: session.id, exerciseName: exName, sets },
      });
    }
  }

  for (const day of cardioDays) {
    const distance = parseFloat(rand(6, 12).toFixed(2));
    const pace = parseFloat(rand(4.8, 5.8).toFixed(2));
    const session = await prisma.workoutSession.create({
      data: {
        date: daysAgo(day),
        type: WorkoutType.RUNNING,
        sessionLabel: "RUNNING",
        duration: Math.floor(distance * pace),
      },
    });
    await prisma.cardioLog.create({
      data: {
        workoutSessionId: session.id,
        distanceKm: distance,
        avgPaceMinPerKm: pace,
        avgHeartRate: randInt(150, 172),
        route: cardioParcours[randInt(0, 3)],
      },
    });
  }
  console.log("  ✓ WorkoutSessions + Exercises + CardioLogs");

  // ── FinanceSnapshots (90j) ────────────────────────────────────────────────
  let bank = 8500;
  let invested = 10000;
  let value = 10000;
  for (let i = 90; i >= 0; i -= 3) {
    bank += (Math.random() - 0.3) * 200;
    invested += Math.random() > 0.8 ? rand(200, 500) : 0;
    value = invested * (1 + (90 - i) * 0.001 + (Math.random() - 0.4) * 0.015);
    await prisma.financeSnapshot.upsert({
      where: { date: daysAgo(i) },
      update: {},
      create: {
        date: daysAgo(i),
        bankBalance: parseFloat(bank.toFixed(2)),
        totalInvested: parseFloat(invested.toFixed(2)),
        totalValue: parseFloat(value.toFixed(2)),
      },
    });
  }
  console.log("  ✓ FinanceSnapshots");

  // ── Investments ───────────────────────────────────────────────────────────
  const investments = [
    { ticker: "MSCI WORLD", name: "Amundi MSCI World ETF", type: "ETF", quantity: 45.5, avgBuyPrice: 42.50, currentPrice: 48.90 },
    { ticker: "S&P500", name: "iShares Core S&P 500 ETF", type: "ETF", quantity: 20.0, avgBuyPrice: 95.00, currentPrice: 108.50 },
    { ticker: "AAPL", name: "Apple Inc.", type: "STOCK", quantity: 8.0, avgBuyPrice: 145.00, currentPrice: 178.50 },
    { ticker: "NVDA", name: "Nvidia Corp.", type: "STOCK", quantity: 5.0, avgBuyPrice: 220.00, currentPrice: 485.00 },
    { ticker: "PAEEM", name: "Amundi Pays Émergents ETF", type: "ETF", quantity: 30.0, avgBuyPrice: 33.20, currentPrice: 31.80 },
  ];
  for (const inv of investments) {
    await prisma.investment.upsert({
      where: { ticker: inv.ticker },
      update: { currentPrice: inv.currentPrice },
      create: inv,
    });
  }
  console.log("  ✓ Investments");

  // ── Tasks ─────────────────────────────────────────────────────────────────
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tasks = [
    { title: "Préparer la réunion de demain", scope: TaskScope.DAY, priority: TaskPriority.HIGH, completed: false },
    { title: "Faire les courses alimentaires", scope: TaskScope.DAY, priority: TaskPriority.MEDIUM, completed: true },
    { title: "Lire 30 minutes", scope: TaskScope.DAY, priority: TaskPriority.LOW, completed: false },
    { title: "Répondre aux emails", scope: TaskScope.DAY, priority: TaskPriority.MEDIUM, completed: true },
    { title: "Appeler le médecin", scope: TaskScope.WEEK, priority: TaskPriority.HIGH, completed: false },
    { title: "Finir le rapport Q2", scope: TaskScope.WEEK, priority: TaskPriority.HIGH, completed: false },
    { title: "Planifier les vacances", scope: TaskScope.WEEK, priority: TaskPriority.LOW, completed: false },
    { title: "Réviser le budget mensuel", scope: TaskScope.WEEK, priority: TaskPriority.MEDIUM, completed: true },
    { title: "Nettoyer l'appartement", scope: TaskScope.WEEK, priority: TaskPriority.MEDIUM, completed: false },
  ];
  for (const t of tasks) {
    await prisma.task.create({
      data: { ...t, dueDate: today, completedAt: t.completed ? new Date() : null },
    });
  }
  console.log("  ✓ Tasks");
  console.log("✅ Seed terminé !");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
