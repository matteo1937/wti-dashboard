import "dotenv/config";
import cors from "cors";
import express from "express";
import { isSupportedMediaType, recognizeProductFromImage } from "./claude";
import { findProductByEan, saveProduct } from "./db";
import type { ProductRecognition } from "./types";

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
    res.json({ result, source: "foto_ki" });
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

  res.json({ result: stored.product, source: "datenbank", eanBarcode: stored.eanBarcode });
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
  res.status(201).json({ result: stored.product, source: "datenbank", eanBarcode: stored.eanBarcode });
});

const port = Number(process.env.PORT ?? 8787);
app.listen(port, () => {
  console.log(`Elektro-Scanner API läuft auf http://localhost:${port}`);
});
