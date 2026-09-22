import "dotenv/config";
import cors from "cors";
import express from "express";
import { isSupportedMediaType, recognizeProductFromImage } from "./claude";

const app = express();
app.use(cors());
app.use(express.json({ limit: "15mb" }));

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
    res.json({ result });
  } catch (err) {
    console.error("Fehler bei Produkterkennung:", err);
    const message = err instanceof Error ? err.message : "Unbekannter Fehler bei der Erkennung.";
    res.status(500).json({ error: message });
  }
});

const port = Number(process.env.PORT ?? 8787);
app.listen(port, () => {
  console.log(`Elektro-Scanner API läuft auf http://localhost:${port}`);
});
