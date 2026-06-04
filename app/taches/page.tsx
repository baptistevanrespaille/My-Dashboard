import { prisma } from "@/lib/prisma";
import TachesClient from "./_components/TachesClient";

async function getTasks() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tasks = await prisma.task.findMany({
    orderBy: [{ completed: "asc" }, { priority: "desc" }, { createdAt: "asc" }],
  });

  return tasks.map((t) => ({
    ...t,
    dueDate: t.dueDate ? t.dueDate.toISOString().split("T")[0] : null,
    completedAt: t.completedAt ? t.completedAt.toISOString() : null,
    createdAt: t.createdAt.toISOString(),
  }));
}

export default async function TachesPage() {
  const tasks = await getTasks();
  return <TachesClient tasks={tasks} />;
}
