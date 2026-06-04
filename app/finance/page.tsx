import { prisma } from "@/lib/prisma";
import FinanceClient from "./_components/FinanceClient";

async function getFinanceData() {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  ninetyDaysAgo.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const [snapshots, investments, latest, week7, month30] = await Promise.all([
    prisma.financeSnapshot.findMany({ where: { date: { gte: ninetyDaysAgo } }, orderBy: { date: "asc" } }),
    prisma.investment.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.financeSnapshot.findFirst({ orderBy: { date: "desc" } }),
    prisma.financeSnapshot.findFirst({ where: { date: { lte: sevenDaysAgo } }, orderBy: { date: "desc" } }),
    prisma.financeSnapshot.findFirst({ where: { date: { lte: thirtyDaysAgo } }, orderBy: { date: "desc" } }),
  ]);

  const n = (v: any) => v ? Number(v) : 0;

  return {
    snapshots: snapshots.map((s) => ({
      date: s.date.toISOString().split("T")[0],
      bankBalance: n(s.bankBalance),
      totalInvested: n(s.totalInvested),
      totalValue: n(s.totalValue),
      total: n(s.bankBalance) + n(s.totalValue),
    })),
    investments: investments.map((i) => ({
      id: i.id, ticker: i.ticker, name: i.name, type: i.type,
      quantity: n(i.quantity), avgBuyPrice: n(i.avgBuyPrice), currentPrice: n(i.currentPrice),
      lastUpdated: i.lastUpdated.toISOString(),
    })),
    latest: latest ? {
      bankBalance: n(latest.bankBalance),
      totalInvested: n(latest.totalInvested),
      totalValue: n(latest.totalValue),
      total: n(latest.bankBalance) + n(latest.totalValue),
    } : null,
    variation7j: latest && week7 ? (n(latest.bankBalance) + n(latest.totalValue)) - (n(week7.bankBalance) + n(week7.totalValue)) : null,
    variation30j: latest && month30 ? (n(latest.bankBalance) + n(latest.totalValue)) - (n(month30.bankBalance) + n(month30.totalValue)) : null,
  };
}

export default async function FinancePage() {
  const data = await getFinanceData();
  return <FinanceClient data={data} />;
}
