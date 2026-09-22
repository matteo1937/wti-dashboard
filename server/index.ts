import "dotenv/config";
import cors from "cors";
import express from "express";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { isSupportedMediaType, recognizeProductFromImage } from "./claude";
import { findCatalogMatch, findProductByEan, saveProduct } from "./db";
import type { ProductRecognition } from "./types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, "../dist");

const app = express();
app.use(cors());
app.use(express.json({ limit: "15mb" }));

function isValidEan(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= 256;
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, hasApiKey: Boolean(process.env.ANTHROPIC_API_KEY) });
});

app.post("/api/recognize", async (req, res) => {
  const { imageBase64, mediaType } = req.body as { imageBase64?: string; mediaType?: string };

  if (!imageBase64 || !mediaType) {
    res.status(400).json({ error: "imageBase64 und mediaType sind erforderlich." });
    return;
  }

  if (!isSupportedMediaType(mediaType)) {
    res.status(400).json({ error: `Nicht unterstützter Bildtyp: ${mediaType}` });
    return;
  }

  try {
    const result = await recognizeProductFromImage(imageBase64, mediaType);
    const grossist = findCatalogMatch({
      hersteller: result.hersteller,
      typBezeichnung: result.typBezeichnung
    });
    res.json({ result, source: "foto_ki", grossist });
  } catch (err) {
    console.error("Fehler bei Produkterkennung:", err);
    const message = err instanceof Error ? err.message : "Unbekannter Fehler bei der Erkennung.";
    res.status(500).json({ error: message });
  }
});

app.get("/api/products/by-ean/:ean", (req, res) => {
  const ean = req.params.ean.trim();
  if (!isValidEan(ean)) {
    res.status(400).json({ error: "Ungültiger Barcode." });
    return;
  }

  const stored = findProductByEan(ean);
  if (!stored) {
    res.status(404).json({ error: "Kein Produkt für diesen Barcode in der lokalen Datenbank." });
    return;
  }

  const grossist = findCatalogMatch({
    eanBarcode: stored.eanBarcode,
    hersteller: stored.product.hersteller,
    typBezeichnung: stored.product.typBezeichnung
  });

  res.json({ result: stored.product, source: "datenbank", eanBarcode: stored.eanBarcode, grossist });
});

app.post("/api/products", (req, res) => {
  const { eanBarcode, product } = req.body as {
    eanBarcode?: string;
    product?: ProductRecognition;
  };

  if (!isValidEan(eanBarcode)) {
    res.status(400).json({ error: "eanBarcode ist erforderlich." });
    return;
  }
  if (!product || typeof product !== "object") {
    res.status(400).json({ error: "product ist erforderlich." });
    return;
  }

  const stored = saveProduct(eanBarcode.trim(), product);
  const grossist = findCatalogMatch({
    eanBarcode: stored.eanBarcode,
    hersteller: stored.product.hersteller,
    typBezeichnung: stored.product.typBezeichnung
  });
  res.status(201).json({ result: stored.product, source: "datenbank", eanBarcode: stored.eanBarcode, grossist });
});

// In Produktion liefert derselbe Prozess auch das gebaute Frontend aus
// (kein separater Vite-Dev-Server), damit ein einzelner Hosting-Service reicht.
if (process.env.NODE_ENV === "production") {
  app.use(express.static(distDir));
  app.get("*", (_req, res) => {
    res.sendFile(join(distDir, "index.html"));
  });
}

const port = Number(process.env.PORT ?? 8787);
app.listen(port, () => {
  console.log(`Elektro-Scanner API läuft auf http://localhost:${port}`);
});
