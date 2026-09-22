import "dotenv/config";
import { readFileSync } from "node:fs";
import { parse } from "csv-parse/sync";
import { pool, upsertCatalogRow, type CatalogImportRow } from "../db";
import { GROSSISTEN, type Grossist } from "../types";

const DEFAULT_PRIORITY: Record<Grossist, number> = {
  EM: 10,
  Sonepar: 20,
  "Otto Fischer": 30,
  Bugnard: 40
};

function parseBool(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return v === "true" || v === "1" || v === "ja" || v === "yes";
}

function parseNumber(value: string | undefined): number | null {
  if (!value || value.trim() === "") return null;
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function isGrossist(value: string): value is Grossist {
  return (GROSSISTEN as string[]).includes(value);
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Nutzung: npm run import:catalog -- <pfad-zur-csv>");
    console.error("Spalten: hersteller,bezeichnung,typ,kategorie,eldas_nummer,ean_barcode,beschreibung,grossist,prioritaet,shop_url,verfuegbar,preis_chf");
    process.exit(1);
  }

  const content = readFileSync(filePath, "utf-8");
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  }) as Record<string, string>[];

  let imported = 0;
  let skipped = 0;

  for (const [index, record] of records.entries()) {
    const lineNo = index + 2; // Header-Zeile + 1-indexiert

    const eldasNummer = record.eldas_nummer?.trim();
    if (!eldasNummer) {
      console.warn(`Zeile ${lineNo}: eldas_nummer fehlt – übersprungen.`);
      skipped++;
      continue;
    }

    const grossist = record.grossist?.trim() ?? "";
    if (!isGrossist(grossist)) {
      console.warn(
        `Zeile ${lineNo}: unbekannter Grossist "${record.grossist}" (erlaubt: ${GROSSISTEN.join(", ")}) – übersprungen.`
      );
      skipped++;
      continue;
    }

    const row: CatalogImportRow = {
      hersteller: record.hersteller?.trim() || null,
      bezeichnung: record.bezeichnung?.trim() || null,
      typ: record.typ?.trim() || null,
      kategorie: record.kategorie?.trim() || null,
      eldasNummer,
      eanBarcode: record.ean_barcode?.trim() || null,
      beschreibung: record.beschreibung?.trim() || null,
      grossist,
      prioritaet: record.prioritaet?.trim() ? Number(record.prioritaet) : DEFAULT_PRIORITY[grossist],
      shopUrl: record.shop_url?.trim() || null,
      verfuegbar: parseBool(record.verfuegbar),
      preisChf: parseNumber(record.preis_chf)
    };

    await upsertCatalogRow(row);
    imported++;
  }

  console.log(`Import abgeschlossen: ${imported} Zeilen importiert, ${skipped} übersprungen.`);
  await pool.end();
}

main().catch((err) => {
  console.error("Import fehlgeschlagen:", err);
  process.exit(1);
});
