import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

const schema = z.object({
  type: z.enum(["weight", "sleep", "nutrition"]),
  data: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format date: YYYY-MM-DD"),
    value: z.number(),
    unit: z.enum(["kg", "hours", "kcal"]),
  }),
});

export async function POST(req: NextRequest) {
  // Auth via secret header
  const secret = req.headers.get("x-webhook-secret");
  if (!secret || secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { type, data } = parsed.data;
    const dateObj = new Date(data.date + "T00:00:00Z");
    let created: unknown;

    if (type === "weight") {
      created = await prisma.bodyMetric.upsert({
        where: { date: dateObj },
        update: { weight: data.value },
        create: { date: dateObj, weight: data.value },
      });
      return NextResponse.json({ success: true, type: "weight", created });
    }

    if (type === "sleep") {
      // value = durée en heures, on crée un log avec horaires approximatifs
      const duration = data.value;
      const wakeH = 7; const wakeM = 0;
      const bedTotalMin = wakeH * 60 + wakeM - duration * 60;
      const bedH = Math.floor(((bedTotalMin % 1440) + 1440) % 1440 / 60);
      const bedM = Math.floor(((bedTotalMin % 1440) + 1440) % 1440 % 60);
      created = await prisma.sleepLog.upsert({
        where: { date: dateObj },
        update: {
          duration: data.value,
          bedtime: new Date(1970, 0, 1, bedH, bedM),
          wakeTime: new Date(1970, 0, 1, wakeH, wakeM),
          quality: 3,
        },
        create: {
          date: dateObj,
          duration: data.value,
          bedtime: new Date(1970, 0, 1, bedH, bedM),
          wakeTime: new Date(1970, 0, 1, wakeH, wakeM),
          quality: 3,
        },
      });
      return NextResponse.json({ success: true, type: "sleep", created });
    }

    if (type === "nutrition") {
      created = await prisma.nutritionLog.upsert({
        where: { date: dateObj },
        update: { calories: Math.round(data.value) },
        create: {
          date: dateObj,
          calories: Math.round(data.value),
          protein: 0,
          carbs: 0,
          fat: 0,
        },
      });
      return NextResponse.json({ success: true, type: "nutrition", created });
    }
  } catch (e) {
    console.error("[webhook/health]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
