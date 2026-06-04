import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Format CSV BNP Paribas :
// Date;Libellé;Montant;Devise  (export standard)
// ou : Date;Libellé;Débit;Crédit;Solde (export détaillé)
// Les montants utilisent la virgule comme séparateur décimal

function parseAmount(s: string): number {
  if (!s || s.trim() === "") return 0;
  return parseFloat(s.replace(/\s/g, "").replace(",", ".")) || 0;
}

function normalizeHeader(h: string): string {
  const lower = h.toLowerCase().trim().replace(/[^a-z]/g, "");
  if (lower.includes("dat")) return "date";
  if (lower.includes("lib") || lower.includes("label") || lower.includes("motif")) return "label";
  if (lower.includes("deb")) return "debit";
  if (lower.includes("cred")) return "credit";
  if (lower.includes("sold") || lower.includes("balance")) return "solde";
  if (lower.includes("mont") || lower.includes("amount")) return "montant";
  return lower;
}

function parseDate(raw: string): Date | null {
  const s = raw.trim();
  // DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [d, m, y] = s.split("/");
    return new Date(`${y}-${m}-${d}T00:00:00Z`);
  }
  // DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
    const [d, m, y] = s.split("-");
    return new Date(`${y}-${m}-${d}T00:00:00Z`);
  }
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return new Date(s + "T00:00:00Z");
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });

    const text = await file.text();
    // BNP uses semicolons
    const sep = text.includes(";") ? ";" : ",";
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return NextResponse.json({ error: "Fichier vide ou invalide" }, { status: 400 });

    // Skip BNP header rows (lines before the actual CSV header that start with non-date content)
    let headerLineIdx = 0;
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const cols = lines[i].split(sep).map(c => c.replace(/"/g, "").trim());
      const normalized = cols.map(normalizeHeader);
      if (normalized.includes("date") && (normalized.includes("solde") || normalized.includes("montant") || normalized.includes("debit"))) {
        headerLineIdx = i;
        break;
      }
    }

    const rawHeaders = lines[headerLineIdx].split(sep).map(h => h.replace(/"/g, "").trim());
    const headers = rawHeaders.map(normalizeHeader);

    const idx = {
      date: headers.indexOf("date"),
      solde: headers.indexOf("solde"),
      montant: headers.indexOf("montant"),
      debit: headers.indexOf("debit"),
      credit: headers.indexOf("credit"),
    };

    if (idx.date === -1) {
      return NextResponse.json({ error: "Colonne 'Date' non trouvée. Format attendu : Date;Libellé;Débit;Crédit;Solde" }, { status: 400 });
    }

    // Track solde par date (on garde le dernier solde de chaque journée)
    const soldeByDate = new Map<string, number>();

    for (let i = headerLineIdx + 1; i < lines.length; i++) {
      const cols = lines[i].split(sep).map(c => c.replace(/"/g, "").trim());
      if (cols.length < 2) continue;

      const dateObj = parseDate(cols[idx.date] ?? "");
      if (!dateObj || isNaN(dateObj.getTime())) continue;

      const dateKey = dateObj.toISOString().split("T")[0];
      let solde = 0;

      if (idx.solde !== -1 && cols[idx.solde]) {
        solde = parseAmount(cols[idx.solde]);
      } else if (idx.montant !== -1 && cols[idx.montant]) {
        solde = parseAmount(cols[idx.montant]);
      } else if (idx.credit !== -1 || idx.debit !== -1) {
        // On ne peut pas reconstituer le solde depuis débit/crédit sans solde initial
        // On skip ces lignes
        continue;
      }

      if (solde !== 0) {
        soldeByDate.set(dateKey, solde);
      }
    }

    if (soldeByDate.size === 0) {
      return NextResponse.json({ error: "Aucun solde trouvé. Le fichier doit contenir une colonne 'Solde' ou 'Montant'." }, { status: 400 });
    }

    // Créer les snapshots Finance (on ne met à jour que bankBalance)
    let imported = 0;
    for (const [dateKey, bankBalance] of Array.from(soldeByDate.entries())) {
      const dateObj = new Date(dateKey + "T00:00:00Z");
      const existing = await prisma.financeSnapshot.findFirst({ where: { date: dateObj } });
      if (existing) {
        await prisma.financeSnapshot.update({
          where: { id: existing.id },
          data: { bankBalance },
        });
      } else {
        await prisma.financeSnapshot.create({
          data: { date: dateObj, bankBalance, totalInvested: 0, totalValue: 0 },
        });
      }
      imported++;
    }

    return NextResponse.json({ success: true, imported, dates: soldeByDate.size });
  } catch (e) {
    console.error("[finance/import POST]", e);
    return NextResponse.json({ error: "Erreur lors du parsing" }, { status: 500 });
  }
}
