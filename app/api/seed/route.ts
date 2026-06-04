import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { WorkoutType, TaskScope, TaskPriority } from "@prisma/client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function daysAgo(n: number): Date {
  const d = new Date(); d.setDate(d.getDate() - n); d.setHours(0, 0, 0, 0); return d;
}
function timeOf(h: number, m: number): Date { return new Date(1970, 0, 1, h, m, 0); }
function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function rand(min: number, max: number) { return Math.random() * (max - min) + min; }

export async function POST() {
  try {
    // Clear all data
    await prisma.$executeRawUnsafe("TRUNCATE TABLE cardio_logs, workout_exercises, workout_sessions, sleep_logs, nutrition_logs, body_metrics, finance_snapshots, investments, tasks CASCADE");

    // BodyMetrics
    const baseWeight = 78.5;
    for (let i = 30; i >= 0; i--) {
      await prisma.bodyMetric.create({
        data: { date: daysAgo(i), weight: parseFloat((baseWeight - i * 0.02 + (Math.random() - 0.5) * 0.6).toFixed(1)) },
      });
    }

    // NutritionLogs
    for (let i = 30; i >= 0; i--) {
      const cheat = i % 7 === 0;
      await prisma.nutritionLog.create({
        data: {
          date: daysAgo(i),
          calories: cheat ? randInt(2400, 2900) : randInt(1900, 2300),
          protein: parseFloat(rand(140, 185).toFixed(1)),
          carbs: parseFloat(rand(180, 270).toFixed(1)),
          fat: parseFloat(rand(55, 85).toFixed(1)),
          notes: cheat ? "Cheat day 🍕" : null,
        },
      });
    }

    // SleepLogs
    for (let i = 30; i >= 0; i--) {
      const bedH = Math.random() > 0.5 ? 23 : 0;
      const bedM = randInt(0, 59);
      const wakeH = randInt(6, 7);
      const wakeM = randInt(0, 59);
      const duration = bedH === 0 ? wakeH + wakeM / 60 : (24 - bedH - bedM / 60) + wakeH + wakeM / 60;
      await prisma.sleepLog.create({
        data: { date: daysAgo(i), bedtime: timeOf(bedH, bedM), wakeTime: timeOf(wakeH, wakeM), duration: parseFloat(duration.toFixed(2)), quality: randInt(3, 5) },
      });
    }

    // WorkoutSessions
    const exercisesByLabel: Record<string, string[]> = {
      PUSH: ["Développé couché", "Développé incliné", "Overhead Press", "Élévations latérales", "Dips", "Triceps corde"],
      PULL: ["Tractions", "Rowing barre", "Tirage vertical", "Face pull", "Curl biceps barre", "Curl marteau"],
      LEGS: ["Squat", "Presse à cuisses", "Leg curl", "Leg extension", "Hip thrust", "Mollets debout"],
    };
    const pplLabels = ["PUSH", "PULL", "LEGS"] as const;
    const strengthDays = [28, 26, 24, 21, 19, 17, 14, 12, 10, 7, 5, 3, 1, 0];
    const cardioDays = [27, 23, 20, 16, 13, 9, 6, 2];

    for (let idx = 0; idx < strengthDays.length; idx++) {
      const label = pplLabels[idx % 3];
      const exercises = exercisesByLabel[label];
      const session = await prisma.workoutSession.create({ data: { date: daysAgo(strengthDays[idx]), type: WorkoutType.STRENGTH, sessionLabel: label, duration: randInt(55, 90) } });
      for (const exName of [...exercises].sort(() => Math.random() - 0.5).slice(0, randInt(3, 5))) {
        const sets = Array.from({ length: randInt(3, 4) }, (_, i) => ({ setNumber: i + 1, reps: randInt(8, 12), weightKg: Math.floor(rand(60, 90) / 2.5) * 2.5 }));
        await prisma.workoutExercise.create({ data: { workoutSessionId: session.id, exerciseName: exName, sets } });
      }
    }
    for (const day of cardioDays) {
      const distance = parseFloat(rand(6, 12).toFixed(2));
      const pace = parseFloat(rand(4.8, 5.8).toFixed(2));
      const session = await prisma.workoutSession.create({ data: { date: daysAgo(day), type: WorkoutType.RUNNING, sessionLabel: "RUNNING", duration: Math.floor(distance * pace) } });
      await prisma.cardioLog.create({ data: { workoutSessionId: session.id, distanceKm: distance, avgPaceMinPerKm: pace, avgHeartRate: randInt(150, 172) } });
    }

    // Finance
    let bank = 8500, invested = 10000, value = 10000;
    for (let i = 90; i >= 0; i -= 3) {
      bank += (Math.random() - 0.3) * 200;
      invested += Math.random() > 0.8 ? rand(200, 500) : 0;
      value = invested * (1 + (90 - i) * 0.001 + (Math.random() - 0.4) * 0.015);
      await prisma.financeSnapshot.create({ data: { date: daysAgo(i), bankBalance: parseFloat(bank.toFixed(2)), totalInvested: parseFloat(invested.toFixed(2)), totalValue: parseFloat(value.toFixed(2)) } });
    }

    const investments = [
      { ticker: "MSCI WORLD", name: "Amundi MSCI World ETF", type: "ETF", quantity: 45.5, avgBuyPrice: 42.50, currentPrice: 48.90 },
      { ticker: "S&P500", name: "iShares Core S&P 500 ETF", type: "ETF", quantity: 20.0, avgBuyPrice: 95.00, currentPrice: 108.50 },
      { ticker: "AAPL", name: "Apple Inc.", type: "STOCK", quantity: 8.0, avgBuyPrice: 145.00, currentPrice: 178.50 },
      { ticker: "NVDA", name: "Nvidia Corp.", type: "STOCK", quantity: 5.0, avgBuyPrice: 220.00, currentPrice: 485.00 },
      { ticker: "PAEEM", name: "Amundi Pays Émergents ETF", type: "ETF", quantity: 30.0, avgBuyPrice: 33.20, currentPrice: 31.80 },
    ];
    for (const inv of investments) await prisma.investment.create({ data: inv });

    // Tasks
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tasks = [
      { title: "Préparer la réunion de demain", scope: TaskScope.DAY, priority: TaskPriority.HIGH, completed: false },
      { title: "Faire les courses alimentaires", scope: TaskScope.DAY, priority: TaskPriority.MEDIUM, completed: true },
      { title: "Lire 30 minutes", scope: TaskScope.DAY, priority: TaskPriority.LOW, completed: false },
      { title: "Appeler le médecin", scope: TaskScope.WEEK, priority: TaskPriority.HIGH, completed: false },
      { title: "Finir le rapport Q2", scope: TaskScope.WEEK, priority: TaskPriority.HIGH, completed: false },
      { title: "Réviser le budget mensuel", scope: TaskScope.WEEK, priority: TaskPriority.MEDIUM, completed: true },
    ];
    for (const t of tasks) await prisma.task.create({ data: { ...t, dueDate: today, completedAt: t.completed ? new Date() : null } });

    return NextResponse.json({ success: true, message: "Seed réinitialisé avec succès" });
  } catch (e) {
    console.error("[seed POST]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
