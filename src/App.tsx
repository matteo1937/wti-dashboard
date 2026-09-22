import { useEffect, useState } from "react";
import { CameraCapture } from "./components/CameraCapture";
import { ProductCard } from "./components/ProductCard";
import { recognizeProduct } from "./lib/api";
import type { ProductRecognition } from "./types";

type Status = "idle" | "loading" | "success" | "error";

export default function App() {
  const [status, setStatus] = useState<Status>("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<ProductRecognition | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function handleCapture(file: File) {
    setStatus("loading");
    setError(null);
    setResult(null);
    setPreviewUrl(URL.createObjectURL(file));

    try {
      const recognized = await recognizeProduct(file);
      setResult(recognized);
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler bei der Erkennung.");
      setStatus("error");
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Elektro Scanner</h1>
        <p>Produkt fotografieren – KI erkennt Hersteller, Typ und Verwendung.</p>
      </header>

      <main className="app-main">
        <CameraCapture disabled={status === "loading"} onCapture={handleCapture} />

        {previewUrl && (
          <img className="preview-image" src={previewUrl} alt="Aufgenommenes Produkt" />
        )}

        {status === "loading" && <p className="status-message">🔍 Produkt wird erkannt …</p>}

        {status === "error" && error && <p className="status-message error">❌ {error}</p>}

        {status === "success" && result && <ProductCard result={result} />}
      </main>
    </div>
  );
}
