import { useState } from "react";
import { CorrectionForm } from "./CorrectionForm";
import type { GrossistMatch, ProductRecognition, RecognitionSource } from "../types";

const KONFIDENZ_LABEL: Record<ProductRecognition["konfidenz"], string> = {
  hoch: "Hohe Zuverlässigkeit",
  mittel: "Mittlere Zuverlässigkeit",
  niedrig: "Niedrige Zuverlässigkeit"
};

const SOURCE_LABEL: Record<RecognitionSource, string> = {
  datenbank: "🗄️ Bereits erfasst (Team-Datenbank)",
  foto_ki: "🤖 KI-Foto-Erkennung"
};

interface ProductCardProps {
  result: ProductRecognition;
  source: RecognitionSource;
  grossist: GrossistMatch | null;
  savedByUserName?: string;
  manuellKorrigiert?: boolean;
  canCorrect?: boolean;
  onCorrect?: (product: ProductRecognition) => Promise<void>;
}

function GrossistBox({ grossist }: { grossist: GrossistMatch | null }) {
  if (!grossist) {
    return (
      <div className="grossist-box grossist-box-empty">
        <h3>🏬 Grossist</h3>
        <p>
          Kein Katalogtreffer. Entweder ist der Produktkatalog noch nicht importiert, oder dieses
          Produkt ist (noch) nicht darin gelistet.
        </p>
      </div>
    );
  }

  return (
    <div className={`grossist-box grossist-${grossist.grossist === "EM" ? "em" : "other"}`}>
      <div className="grossist-header">
        <span className="grossist-badge">{grossist.grossist}</span>
        <span className={grossist.verfuegbar ? "availability ok" : "availability out"}>
          {grossist.verfuegbar ? "✅ Verfügbar" : "❌ Nicht verfügbar"}
        </span>
      </div>

      <dl className="product-details">
        <dt>Eldas-Nummer</dt>
        <dd>{grossist.eldasNummer}</dd>

        {grossist.preisChf != null && (
          <>
            <dt>Preis</dt>
            <dd>CHF {grossist.preisChf.toFixed(2)}</dd>
          </>
        )}
      </dl>

      {grossist.shopUrl && (
        <a className="shop-link" href={grossist.shopUrl} target="_blank" rel="noopener noreferrer">
          Zum Angebot bei {grossist.grossist} →
        </a>
      )}

      {grossist.matchQuality === "fuzzy" && (
        <p className="fuzzy-notice">
          ⚠️ Automatisch anhand Hersteller/Typ zugeordnet – bitte vor Bestellung prüfen.
        </p>
      )}
    </div>
  );
}

export function ProductCard({
  result,
  source,
  grossist,
  savedByUserName,
  manuellKorrigiert,
  canCorrect,
  onCorrect
}: ProductCardProps) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className="product-card">
        <CorrectionForm
          initial={result}
          onCancel={() => setEditing(false)}
          onSubmit={async (product) => {
            await onCorrect?.(product);
            setEditing(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="product-card">
      <div className="badge-row">
        <div className={`confidence-badge confidence-${result.konfidenz}`}>
          {KONFIDENZ_LABEL[result.konfidenz]}
        </div>
        <div className="source-badge">{SOURCE_LABEL[source]}</div>
      </div>

      {source === "datenbank" && savedByUserName && (
        <p className="team-notice">
          {manuellKorrigiert ? "✅" : "🧑‍🔧"} {manuellKorrigiert ? "Korrigiert" : "Erfasst"} von{" "}
          <strong>{savedByUserName}</strong>
        </p>
      )}

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

      <GrossistBox grossist={grossist} />

      <div className="replacement-box">
        <h3>🔁 Such-Kriterien für Ersatzprodukt</h3>
        <p>{result.ersatzSuchkriterien}</p>
      </div>

      {canCorrect && (
        <button type="button" className="correct-button" onClick={() => setEditing(true)}>
          ✏️ Korrigieren
        </button>
      )}

      <div className="future-notice">
        Automatische Ersatzprodukt-Vorschläge aus dem Katalog (kompatible Alternativen anderer
        Hersteller) folgen in einer späteren Ausbaustufe.
      </div>
    </div>
  );
}
