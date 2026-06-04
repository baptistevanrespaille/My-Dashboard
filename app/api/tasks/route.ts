import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  scope: z.enum(["DAY", "WEEK"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const scope = searchParams.get("scope") as "DAY" | "WEEK" | null;
    const tasks = await prisma.task.findMany({
      where: scope ? { scope } : undefined,
      orderBy: [{ completed: "asc" }, { priority: "desc" }, { createdAt: "asc" }],
    });
    return NextResponse.json(tasks.map((t) => ({
      ...t,
      dueDate: t.dueDate ? t.dueDate.toISOString().split("T")[0] : null,
      completedAt: t.completedAt ? t.completedAt.toISOString() : null,
      createdAt: t.createdAt.toISOString(),
    })));
  } catch (e) {
    console.error("[tasks GET]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    const { dueDate, ...rest } = parsed.data;
    const task = await prisma.task.create({
      data: { ...rest, dueDate: dueDate ? new Date(dueDate + "T00:00:00Z") : undefined },
    });
    return NextResponse.json({ ...task, dueDate: task.dueDate ? task.dueDate.toISOString().split("T")[0] : null, createdAt: task.createdAt.toISOString() });
  } catch (e) {
    console.error("[tasks POST]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
