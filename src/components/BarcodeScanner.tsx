import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

const ELEMENT_ID = "barcode-reader";

interface BarcodeScannerProps {
  onDetected: (code: string) => void;
}

export function BarcodeScanner({ onDetected }: BarcodeScannerProps) {
  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;

  useEffect(() => {
    const scanner = new Html5Qrcode(ELEMENT_ID, { verbose: false });
    let stopped = false;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          if (stopped) return;
          stopped = true;
          onDetectedRef.current(decodedText);
          scanner.stop().catch(() => undefined);
        },
        () => {
          // per-Frame "kein Code gefunden" – bewusst ignoriert
        }
      )
      .catch((err) => {
        console.error("Kamera konnte nicht gestartet werden:", err);
      });

    return () => {
      stopped = true;
      scanner.stop().catch(() => undefined);
    };
  }, []);

  return (
    <div className="barcode-scanner">
      <div id={ELEMENT_ID} className="barcode-reader" />
      <p className="barcode-hint">Barcode oder QR-Code vor die Kamera halten.</p>
    </div>
  );
}
