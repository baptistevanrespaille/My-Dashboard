import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  bedtime: z.string().regex(/^\d{2}:\d{2}$/),
  wakeTime: z.string().regex(/^\d{2}:\d{2}$/),
  quality: z.coerce.number().int().min(1).max(5),
  notes: z.string().max(500).optional(),
});

function parseDuration(bedtime: string, wakeTime: string): number {
  const [bh, bm] = bedtime.split(":").map(Number);
  const [wh, wm] = wakeTime.split(":").map(Number);
  const bed = bh * 60 + bm;
  const wake = wh * 60 + wm;
  const diff = wake >= bed ? wake - bed : 1440 - bed + wake;
  return parseFloat((diff / 60).toFixed(2));
}

function timeToDate(t: string): Date {
  const [h, m] = t.split(":").map(Number);
  return new Date(1970, 0, 1, h, m, 0);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const days = Math.min(parseInt(searchParams.get("days") ?? "14"), 90);
    const from = new Date();
    from.setDate(from.getDate() - days);
    from.setHours(0, 0, 0, 0);
    const data = await prisma.sleepLog.findMany({
      where: { date: { gte: from } },
      orderBy: { date: "asc" },
    });
    return NextResponse.json(data.map((d) => ({ ...d, duration: Number(d.duration) })));
  } catch (e) {
    console.error("[sleep GET]", e);
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
    const { date, bedtime, wakeTime, quality, notes } = parsed.data;
    const dateObj = new Date(date + "T00:00:00Z");
    const duration = parseDuration(bedtime, wakeTime);
    const record = await prisma.sleepLog.upsert({
      where: { date: dateObj },
      update: { bedtime: timeToDate(bedtime), wakeTime: timeToDate(wakeTime), duration, quality, notes },
      create: { date: dateObj, bedtime: timeToDate(bedtime), wakeTime: timeToDate(wakeTime), duration, quality, notes },
    });
    return NextResponse.json({ ...record, duration: Number(record.duration) });
  } catch (e) {
    console.error("[sleep POST]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
