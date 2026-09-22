import type { ProductRecognition, RecognitionSource } from "../types";

const KONFIDENZ_LABEL: Record<ProductRecognition["konfidenz"], string> = {
  hoch: "Hohe Zuverlässigkeit",
  mittel: "Mittlere Zuverlässigkeit",
  niedrig: "Niedrige Zuverlässigkeit"
};

const SOURCE_LABEL: Record<RecognitionSource, string> = {
  datenbank: "🗄️ Bereits erfasst (lokale Datenbank)",
  foto_ki: "🤖 KI-Foto-Erkennung"
};

interface ProductCardProps {
  result: ProductRecognition;
  source: RecognitionSource;
}

export function ProductCard({ result, source }: ProductCardProps) {
  return (
    <div className="product-card">
      <div className="badge-row">
        <div className={`confidence-badge confidence-${result.konfidenz}`}>
          {KONFIDENZ_LABEL[result.konfidenz]}
        </div>
        <div className="source-badge">{SOURCE_LABEL[source]}</div>
      </div>

      {result.unsicher && (
        <p className="uncertain-notice">
          ⚠️ Die KI ist sich bei diesem Produkt nicht sicher. Bitte Angaben vor Bestellung prüfen.
        </p>
      )}

      <h2>{result.produktname ?? "Produkt unbekannt"}</h2>
      <p className="manufacturer">{result.hersteller ?? "Hersteller unbekannt"}</p>

      <dl className="product-details">
        <dt>Kategorie</dt>
        <dd>{result.kategorie}</dd>

        {result.typBezeichnung && (
          <>
            <dt>Typ / Bezeichnung</dt>
            <dd>{result.typBezeichnung}</dd>
          </>
        )}

        <dt>Verwendung</dt>
        <dd>{result.verwendungszweck}</dd>
      </dl>

      {result.merkmale.length > 0 && (
        <ul className="feature-list">
          {result.merkmale.map((merkmal) => (
            <li key={merkmal}>{merkmal}</li>
          ))}
        </ul>
      )}

      <div className="replacement-box">
        <h3>🔁 Such-Kriterien für Ersatzprodukt</h3>
        <p>{result.ersatzSuchkriterien}</p>
      </div>

      <div className="future-notice">
        Konkretes Ersatzprodukt mit Eldas-Nummer und Grossisten-Verfügbarkeit (EM / Sonepar) folgt in
        einer späteren Ausbaustufe – die Kriterien oben helfen dir schon jetzt beim manuellen Suchen.
      </div>
    </div>
  );
}
