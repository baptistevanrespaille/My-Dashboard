import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  calories: z.coerce.number().int().min(0).max(10000),
  protein: z.coerce.number().min(0).max(500),
  carbs: z.coerce.number().min(0).max(1000),
  fat: z.coerce.number().min(0).max(500),
  notes: z.string().max(500).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const days = Math.min(parseInt(searchParams.get("days") ?? "7"), 90);
    const from = new Date();
    from.setDate(from.getDate() - days);
    from.setHours(0, 0, 0, 0);
    const data = await prisma.nutritionLog.findMany({
      where: { date: { gte: from } },
      orderBy: { date: "asc" },
    });
    return NextResponse.json(data.map((d) => ({
      ...d, protein: Number(d.protein), carbs: Number(d.carbs), fat: Number(d.fat),
    })));
  } catch (e) {
    console.error("[nutrition GET]", e);
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
    const { date, ...rest } = parsed.data;
    const dateObj = new Date(date + "T00:00:00Z");
    const record = await prisma.nutritionLog.upsert({
      where: { date: dateObj },
      update: rest,
      create: { date: dateObj, ...rest },
    });
    return NextResponse.json({ ...record, protein: Number(record.protein), carbs: Number(record.carbs), fat: Number(record.fat) });
  } catch (e) {
    console.error("[nutrition POST]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
