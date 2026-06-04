import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Format CSV Yazio attendu :
// Date,Calories,Protéines,Glucides,Lipides
// ou : Date,Calories,Protein,Carbs,Fat
// Séparateur : , ou ;

function parseFloat2(s: string): number {
  return parseFloat(s.replace(",", ".").replace(/[^0-9.-]/g, "")) || 0;
}

function normalizeHeader(h: string): string {
  const lower = h.toLowerCase().trim().replace(/[^a-z]/g, "");
  if (lower.includes("dat")) return "date";
  if (lower.includes("cal")) return "calories";
  if (lower.includes("prot")) return "protein";
  if (lower.includes("gluc") || lower.includes("carb")) return "carbs";
  if (lower.includes("lip") || lower.includes("fat") || lower.includes("gras")) return "fat";
  return lower;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });

    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return NextResponse.json({ error: "Fichier vide ou invalide" }, { status: 400 });

    // Détecter le séparateur
    const sep = lines[0].includes(";") ? ";" : ",";

    // Parser les headers
    const rawHeaders = lines[0].split(sep).map((h) => h.replace(/"/g, "").trim());
    const headers = rawHeaders.map(normalizeHeader);

    const idx = {
      date: headers.indexOf("date"),
      calories: headers.indexOf("calories"),
      protein: headers.indexOf("protein"),
      carbs: headers.indexOf("carbs"),
      fat: headers.indexOf("fat"),
    };

    if (idx.date === -1 || idx.calories === -1) {
      return NextResponse.json({
        error: "Format CSV non reconnu. Colonnes attendues : Date, Calories, Protéines, Glucides, Lipides",
      }, { status: 400 });
    }

    let imported = 0;
    let skipped = 0;

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(sep).map((c) => c.replace(/"/g, "").trim());
      if (cols.length < 2) continue;

      const rawDate = cols[idx.date];
      // Essayer différents formats de date : DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD
      let dateObj: Date | null = null;
      if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
        dateObj = new Date(rawDate + "T00:00:00Z");
      } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(rawDate)) {
        const [d, m, y] = rawDate.split("/");
        dateObj = new Date(`${y}-${m}-${d}T00:00:00Z`);
      } else if (/^\d{2}-\d{2}-\d{4}$/.test(rawDate)) {
        const [d, m, y] = rawDate.split("-");
        dateObj = new Date(`${y}-${m}-${d}T00:00:00Z`);
      }

      if (!dateObj || isNaN(dateObj.getTime())) { skipped++; continue; }

      const calories = Math.round(parseFloat2(cols[idx.calories]));
      if (calories === 0) { skipped++; continue; }

      const protein = idx.protein !== -1 ? parseFloat2(cols[idx.protein]) : 0;
      const carbs = idx.carbs !== -1 ? parseFloat2(cols[idx.carbs]) : 0;
      const fat = idx.fat !== -1 ? parseFloat2(cols[idx.fat]) : 0;

      await prisma.nutritionLog.upsert({
        where: { date: dateObj },
        update: { calories, protein, carbs, fat },
        create: { date: dateObj, calories, protein, carbs, fat },
      });
      imported++;
    }

    return NextResponse.json({ success: true, imported, skipped, total: lines.length - 1 });
  } catch (e) {
    console.error("[nutrition/import POST]", e);
    return NextResponse.json({ error: "Erreur lors du parsing" }, { status: 500 });
  }
}
