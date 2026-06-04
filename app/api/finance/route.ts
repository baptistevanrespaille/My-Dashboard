import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

const snapshotSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  bankBalance: z.coerce.number().min(0),
  totalInvested: z.coerce.number().min(0),
  totalValue: z.coerce.number().min(0),
  notes: z.string().max(500).optional(),
});

const investmentSchema = z.object({
  action: z.literal("upsert_investment"),
  ticker: z.string().min(1).max(20),
  name: z.string().min(1),
  type: z.enum(["ETF", "STOCK"]),
  quantity: z.coerce.number().min(0),
  avgBuyPrice: z.coerce.number().min(0),
  currentPrice: z.coerce.number().min(0),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const days = Math.min(parseInt(searchParams.get("days") ?? "90"), 365);
    const from = new Date();
    from.setDate(from.getDate() - days);
    from.setHours(0, 0, 0, 0);

    const [snapshots, investments] = await Promise.all([
      prisma.financeSnapshot.findMany({ where: { date: { gte: from } }, orderBy: { date: "asc" } }),
      prisma.investment.findMany({ orderBy: { createdAt: "asc" } }),
    ]);

    return NextResponse.json({
      snapshots: snapshots.map((s) => ({
        ...s,
        bankBalance: Number(s.bankBalance),
        totalInvested: Number(s.totalInvested),
        totalValue: Number(s.totalValue),
        date: s.date.toISOString().split("T")[0],
      })),
      investments: investments.map((i) => ({
        ...i,
        quantity: Number(i.quantity),
        avgBuyPrice: Number(i.avgBuyPrice),
        currentPrice: Number(i.currentPrice),
      })),
    });
  } catch (e) {
    console.error("[finance GET]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Handle investment upsert
    if (body.action === "upsert_investment") {
      const parsed = investmentSchema.safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
      const { action: _, ...data } = parsed.data;
      const inv = await prisma.investment.upsert({
        where: { ticker: data.ticker },
        update: data,
        create: data,
      });
      return NextResponse.json({ ...inv, quantity: Number(inv.quantity), avgBuyPrice: Number(inv.avgBuyPrice), currentPrice: Number(inv.currentPrice) });
    }

    // Handle snapshot
    const parsed = snapshotSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    const { date, ...rest } = parsed.data;
    const dateObj = new Date(date + "T00:00:00Z");
    const record = await prisma.financeSnapshot.upsert({
      where: { date: dateObj },
      update: rest,
      create: { date: dateObj, ...rest },
    });
    return NextResponse.json({ ...record, bankBalance: Number(record.bankBalance), totalInvested: Number(record.totalInvested), totalValue: Number(record.totalValue) });
  } catch (e) {
    console.error("[finance POST]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
