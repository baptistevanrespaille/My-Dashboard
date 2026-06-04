import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 30; // Vercel max 30s for hobby plan

// Mapping des tickers BDD → tickers Yahoo Finance
const TICKER_MAP: Record<string, string> = {
  "MSCI WORLD": "CW8.PA",
  "S&P500": "500.PA",
  "PAEEM": "PAEEM.PA",
  "AAPL": "AAPL",
  "NVDA": "NVDA",
  "LVMH": "MC.PA",
};

export async function GET() {
  try {
    const investments = await prisma.investment.findMany();
    if (investments.length === 0) {
      return NextResponse.json({ message: "Aucune position à mettre à jour", updated: 0 });
    }

    // Import dynamique pour éviter les problèmes de build
    const { default: yahooFinance } = await import("yahoo-finance2");

    const results: { ticker: string; oldPrice: number; newPrice: number | null; error?: string }[] = [];
    let updated = 0;

    for (const inv of investments) {
      const yahooTicker = TICKER_MAP[inv.ticker] ?? inv.ticker;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const quote: any = await yahooFinance.quote(yahooTicker);
        const newPrice: number | null =
          (quote as any)?.regularMarketPrice ??
          (quote as any)?.bid ??
          null;

        if (newPrice && newPrice > 0) {
          await prisma.investment.update({
            where: { id: inv.id },
            data: { currentPrice: newPrice, lastUpdated: new Date() },
          });
          results.push({ ticker: inv.ticker, oldPrice: Number(inv.currentPrice), newPrice });
          updated++;
        } else {
          results.push({ ticker: inv.ticker, oldPrice: Number(inv.currentPrice), newPrice: null, error: "Prix indisponible" });
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Erreur Yahoo Finance";
        results.push({ ticker: inv.ticker, oldPrice: Number(inv.currentPrice), newPrice: null, error: msg });
      }
    }

    return NextResponse.json({ success: true, updated, total: investments.length, results });
  } catch (e) {
    console.error("[finance/refresh-prices]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
