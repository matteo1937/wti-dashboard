import { useEffect, useState } from "react";
import { BarcodeScanner } from "./components/BarcodeScanner";
import { CameraCapture } from "./components/CameraCapture";
import { ProductCard } from "./components/ProductCard";
import { lookupProductByBarcode, recognizeProduct, saveProductForBarcode } from "./lib/api";
import type { ProductRecognition, RecognitionSource } from "./types";

type Mode = "foto" | "barcode";
type Status = "idle" | "scanning" | "loading" | "success" | "not_found" | "error";
type SaveState = "idle" | "saving" | "saved" | "error";

export default function App() {
  const [mode, setMode] = useState<Mode>("foto");
  const [status, setStatus] = useState<Status>("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<ProductRecognition | null>(null);
  const [source, setSource] = useState<RecognitionSource | null>(null);
  const [pendingEan, setPendingEan] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function resetResult() {
    setStatus("idle");
    setResult(null);
    setSource(null);
    setError(null);
    setSaveState("idle");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  }

  function switchMode(nextMode: Mode) {
    setMode(nextMode);
    setPendingEan(null);
    resetResult();
  }

  async function handleCapture(file: File) {
    setStatus("loading");
    setError(null);
    setResult(null);
    setSaveState("idle");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));

    try {
      const scan = await recognizeProduct(file);
      setResult(scan.result);
      setSource(scan.source);
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler bei der Erkennung.");
      setStatus("error");
    }
  }

  async function handleBarcodeDetected(code: string) {
    setStatus("loading");
    setError(null);
    setResult(null);
    setPendingEan(null);
    setSaveState("idle");

    try {
      const scan = await lookupProductByBarcode(code);
      if (scan) {
        setResult(scan.result);
        setSource(scan.source);
        setStatus("success");
      } else {
        setPendingEan(code);
        setStatus("not_found");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler beim Barcode-Abgleich.");
      setStatus("error");
    }
  }

  async function handleSaveForBarcode() {
    if (!pendingEan || !result) return;
    setSaveState("saving");
    try {
      await saveProductForBarcode(pendingEan, result);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Elektro Scanner</h1>
        <p>Produkt fotografieren oder Barcode scannen – KI erkennt Hersteller, Typ und Verwendung.</p>
      </header>

      <main className="app-main">
        <div className="mode-tabs">
          <button
            type="button"
            className={`mode-tab ${mode === "barcode" ? "active" : ""}`}
            onClick={() => switchMode("barcode")}
          >
            🔳 Barcode / QR
          </button>
          <button
            type="button"
            className={`mode-tab ${mode === "foto" ? "active" : ""}`}
            onClick={() => switchMode("foto")}
          >
            📷 Foto
          </button>
        </div>

        {mode === "barcode" && status !== "success" && status !== "not_found" && (
          <BarcodeScanner onDetected={handleBarcodeDetected} />
        )}

        {mode === "foto" && (
          <CameraCapture disabled={status === "loading"} onCapture={handleCapture} />
        )}

        {status === "not_found" && pendingEan && (
          <div className="not-found-box">
            <p>
              📦 Barcode <strong>{pendingEan}</strong> ist noch nicht in der lokalen Datenbank.
              <br />
              Bitte jetzt ein Foto machen – die Erkennung wird danach für dieses Barcode gespeichert.
            </p>
            <CameraCapture disabled={false} onCapture={handleCapture} />
          </div>
        )}

        {previewUrl && (
          <img className="preview-image" src={previewUrl} alt="Aufgenommenes Produkt" />
        )}

        {status === "loading" && <p className="status-message">🔍 Wird geprüft …</p>}

        {status === "error" && error && <p className="status-message error">❌ {error}</p>}

        {status === "success" && result && source && (
          <>
            <ProductCard result={result} source={source} />

            {pendingEan && source === "foto_ki" && (
              <button
                type="button"
                className="save-button"
                disabled={saveState === "saving" || saveState === "saved"}
                onClick={handleSaveForBarcode}
              >
                {saveState === "saved"
                  ? "✅ Gespeichert – nächstes Mal direkter Treffer"
                  : saveState === "saving"
                  ? "Speichere …"
                  : `💾 Für Barcode ${pendingEan} speichern`}
              </button>
            )}
          </>
        )}
      </main>
    </div>
  );
}
