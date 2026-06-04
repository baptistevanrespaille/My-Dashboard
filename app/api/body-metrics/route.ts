import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format date invalide"),
  weight: z.coerce.number().min(20, "Poids trop faible").max(300, "Poids trop élevé"),
  notes: z.string().max(500).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const days = Math.min(parseInt(searchParams.get("days") ?? "30"), 365);
    const from = new Date();
    from.setDate(from.getDate() - days);
    from.setHours(0, 0, 0, 0);
    const data = await prisma.bodyMetric.findMany({
      where: { date: { gte: from } },
      orderBy: { date: "asc" },
    });
    return NextResponse.json(data.map((d) => ({ ...d, weight: Number(d.weight) })));
  } catch (e) {
    console.error("[body-metrics GET]", e);
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
    const { date, weight, notes } = parsed.data;
    const dateObj = new Date(date + "T00:00:00Z");
    const record = await prisma.bodyMetric.upsert({
      where: { date: dateObj },
      update: { weight, notes },
      create: { date: dateObj, weight, notes },
    });
    return NextResponse.json({ ...record, weight: Number(record.weight) });
  } catch (e) {
    console.error("[body-metrics POST]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
