import "dotenv/config";
import cors from "cors";
import express from "express";
import { clerkMiddleware, requireAdmin, requireOrgAuth } from "./auth";
import { isSupportedMediaType, recognizeProductFromImage } from "./claude";
import { findCatalogMatch, findProductByEan, listScans, logScan, saveProduct } from "./db";
import { scansToCsv, streamScansPdf } from "./export";
import type { ProductRecognition } from "./types";

const app = express();
app.use(cors());
app.use(express.json({ limit: "15mb" }));

function isValidEan(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= 256;
}

// Health-Check bleibt bewusst vor der Clerk-Middleware: er darf nie an
// Clerk-Konfiguration/-Erreichbarkeit hängen (z.B. für Monitoring/Load-Balancer).
app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    hasApiKey: Boolean(process.env.ANTHROPIC_API_KEY),
    hasDatabase: Boolean(process.env.DATABASE_URL),
    hasClerkKeys: Boolean(process.env.CLERK_SECRET_KEY && process.env.CLERK_PUBLISHABLE_KEY)
  });
});

app.use(clerkMiddleware());
app.use("/api", requireOrgAuth);

app.get("/api/me", (req, res) => {
  res.json(req.appAuth);
});

app.post("/api/recognize", async (req, res) => {
  const { imageBase64, mediaType, projektTag } = req.body as {
    imageBase64?: string;
    mediaType?: string;
    projektTag?: string;
  };

  if (!imageBase64 || !mediaType) {
    res.status(400).json({ error: "imageBase64 und mediaType sind erforderlich." });
    return;
  }

  if (!isSupportedMediaType(mediaType)) {
    res.status(400).json({ error: `Nicht unterstützter Bildtyp: ${mediaType}` });
    return;
  }

  const auth = req.appAuth!;

  try {
    const result = await recognizeProductFromImage(imageBase64, mediaType);
    const grossist = await findCatalogMatch({
      hersteller: result.hersteller,
      typBezeichnung: result.typBezeichnung
    });

    await logScan({
      orgId: auth.orgId,
      userId: auth.userId,
      userName: auth.userName,
      erkanntVia: "foto_ki",
      eanBarcode: null,
      produkt: result,
      projektTag: projektTag?.trim() || null,
      manuellKorrigiert: false
    });

    res.json({ result, source: "foto_ki", grossist });
  } catch (err) {
    console.error("Fehler bei Produkterkennung:", err);
    const message = err instanceof Error ? err.message : "Unbekannter Fehler bei der Erkennung.";
    res.status(500).json({ error: message });
  }
});

app.get("/api/products/by-ean/:ean", async (req, res) => {
  const ean = req.params.ean.trim();
  const projektTag = typeof req.query.projektTag === "string" ? req.query.projektTag : undefined;

  if (!isValidEan(ean)) {
    res.status(400).json({ error: "Ungültiger Barcode." });
    return;
  }

  const auth = req.appAuth!;
  const stored = await findProductByEan(auth.orgId, ean);
  if (!stored) {
    res.status(404).json({ error: "Kein Produkt für diesen Barcode in der lokalen Datenbank." });
    return;
  }

  const grossist = await findCatalogMatch({
    eanBarcode: stored.eanBarcode,
    hersteller: stored.product.hersteller,
    typBezeichnung: stored.product.typBezeichnung
  });

  await logScan({
    orgId: auth.orgId,
    userId: auth.userId,
    userName: auth.userName,
    erkanntVia: "barcode_db",
    eanBarcode: stored.eanBarcode,
    produkt: stored.product,
    projektTag: projektTag?.trim() || null,
    manuellKorrigiert: stored.manuellKorrigiert
  });

  res.json({
    result: stored.product,
    source: "datenbank",
    eanBarcode: stored.eanBarcode,
    grossist,
    savedByUserName: stored.savedByUserName,
    manuellKorrigiert: stored.manuellKorrigiert
  });
});

app.post("/api/products", async (req, res) => {
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

  const auth = req.appAuth!;
  const stored = await saveProduct({
    orgId: auth.orgId,
    ean: eanBarcode.trim(),
    product,
    userId: auth.userId,
    userName: auth.userName
  });
  const grossist = await findCatalogMatch({
    eanBarcode: stored.eanBarcode,
    hersteller: stored.product.hersteller,
    typBezeichnung: stored.product.typBezeichnung
  });

  res.status(201).json({
    result: stored.product,
    source: "datenbank",
    eanBarcode: stored.eanBarcode,
    grossist,
    savedByUserName: stored.savedByUserName,
    manuellKorrigiert: stored.manuellKorrigiert
  });
});

app.patch("/api/products/:ean", requireAdmin, async (req, res) => {
  const ean = req.params.ean.trim();
  const { product } = req.body as { product?: ProductRecognition };

  if (!isValidEan(ean)) {
    res.status(400).json({ error: "Ungültiger Barcode." });
    return;
  }
  if (!product || typeof product !== "object") {
    res.status(400).json({ error: "product ist erforderlich." });
    return;
  }

  const auth = req.appAuth!;
  const existing = await findProductByEan(auth.orgId, ean);
  if (!existing) {
    res.status(404).json({ error: "Kein bestehender Eintrag für dieses Barcode – kann nicht korrigiert werden." });
    return;
  }

  const stored = await saveProduct({
    orgId: auth.orgId,
    ean,
    product,
    userId: auth.userId,
    userName: auth.userName,
    manuellKorrigiert: true
  });
  const grossist = await findCatalogMatch({
    eanBarcode: stored.eanBarcode,
    hersteller: stored.product.hersteller,
    typBezeichnung: stored.product.typBezeichnung
  });

  res.json({
    result: stored.product,
    source: "datenbank",
    eanBarcode: stored.eanBarcode,
    grossist,
    savedByUserName: stored.savedByUserName,
    manuellKorrigiert: stored.manuellKorrigiert
  });
});

app.get("/api/scans", async (req, res) => {
  const auth = req.appAuth!;
  const { userId, projektTag, von, bis } = req.query as Record<string, string | undefined>;

  const scans = await listScans({ orgId: auth.orgId, userId, projektTag, von, bis });
  res.json({ scans });
});

app.get("/api/scans/export", async (req, res) => {
  const auth = req.appAuth!;
  const { userId, projektTag, von, bis, format } = req.query as Record<string, string | undefined>;

  const scans = await listScans({ orgId: auth.orgId, userId, projektTag, von, bis });

  if (format === "pdf") {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="scan-liste.pdf"');
    streamScansPdf(scans, res);
    return;
  }

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="scan-liste.csv"');
  res.send(scansToCsv(scans));
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unerwarteter Fehler:", err);
  res.status(500).json({ error: "Interner Serverfehler." });
});

const port = Number(process.env.PORT ?? 8787);
app.listen(port, () => {
  console.log(`Elektro-Scanner API läuft auf http://localhost:${port}`);
});
