import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  completed: z.boolean().optional(),
  title: z.string().min(1).max(200).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    const data: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.completed === true) data.completedAt = new Date();
    if (parsed.data.completed === false) data.completedAt = null;
    const task = await prisma.task.update({ where: { id: params.id }, data });
    return NextResponse.json({ ...task, dueDate: task.dueDate ? task.dueDate.toISOString().split("T")[0] : null });
  } catch (e) {
    console.error("[tasks PATCH]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.task.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[tasks DELETE]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
