import type { ProductRecognition } from "../types";

const KONFIDENZ_LABEL: Record<ProductRecognition["konfidenz"], string> = {
  hoch: "Hohe Zuverlässigkeit",
  mittel: "Mittlere Zuverlässigkeit",
  niedrig: "Niedrige Zuverlässigkeit"
};

export function ProductCard({ result }: { result: ProductRecognition }) {
  return (
    <div className="product-card">
      <div className={`confidence-badge confidence-${result.konfidenz}`}>
        {KONFIDENZ_LABEL[result.konfidenz]}
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

      <div className="future-notice">
        Eldas-Nummer, Ersatzprodukte und Grossisten-Verfügbarkeit (EM / Sonepar) folgen in einer
        späteren Ausbaustufe.
      </div>
    </div>
  );
}
