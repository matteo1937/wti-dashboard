import { stringify } from "csv-stringify/sync";
import PDFDocument from "pdfkit";
import type { Response } from "express";
import type { ScanHistoryRow } from "./db";

export function scansToCsv(scans: ScanHistoryRow[]): string {
  const rows = scans.map((s) => ({
    zeitpunkt: s.createdAt.toLocaleString("de-CH"),
    benutzer: s.userName,
    quelle: s.erkanntVia === "barcode_db" ? "Barcode/DB" : "Foto-KI",
    barcode: s.eanBarcode ?? "",
    hersteller: s.produkt.hersteller ?? "",
    produktname: s.produkt.produktname ?? "",
    typ: s.produkt.typBezeichnung ?? "",
    kategorie: s.produkt.kategorie,
    projekt: s.projektTag ?? "",
    manuell_korrigiert: s.manuellKorrigiert ? "ja" : "nein"
  }));

  return stringify(rows, {
    header: true,
    columns: [
      "zeitpunkt",
      "benutzer",
      "quelle",
      "barcode",
      "hersteller",
      "produktname",
      "typ",
      "kategorie",
      "projekt",
      "manuell_korrigiert"
    ]
  });
}

export function streamScansPdf(scans: ScanHistoryRow[], res: Response): void {
  const doc = new PDFDocument({ margin: 40, size: "A4" });
  doc.pipe(res);

  doc.fontSize(16).text("Elektro Scanner – Scan-Liste", { align: "left" });
  doc.moveDown(0.3);
  doc
    .fontSize(9)
    .fillColor("#666")
    .text(`Exportiert am ${new Date().toLocaleString("de-CH")} – ${scans.length} Einträge`);
  doc.moveDown();

  scans.forEach((scan, index) => {
    const title = `${index + 1}. ${scan.produkt.hersteller ?? "Hersteller unbekannt"} – ${
      scan.produkt.produktname ?? scan.produkt.typBezeichnung ?? scan.produkt.kategorie
    }`;
    const meta = [
      scan.createdAt.toLocaleString("de-CH"),
      scan.userName,
      scan.erkanntVia === "barcode_db" ? "Barcode" : "Foto-KI",
      scan.eanBarcode ? `EAN ${scan.eanBarcode}` : null,
      scan.projektTag ? `Projekt: ${scan.projektTag}` : null
    ]
      .filter(Boolean)
      .join(" · ");

    doc.fontSize(11).fillColor("#000").text(title);
    doc.fontSize(9).fillColor("#444").text(meta);
    doc.moveDown(0.6);
  });

  doc.end();
}
