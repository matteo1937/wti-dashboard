import { useState, type FormEvent } from "react";
import { PRODUCT_CATEGORIES, type ProductCategory, type ProductRecognition } from "../types";

interface CorrectionFormProps {
  initial: ProductRecognition;
  onCancel: () => void;
  onSubmit: (product: ProductRecognition) => Promise<void>;
}

export function CorrectionForm({ initial, onCancel, onSubmit }: CorrectionFormProps) {
  const [hersteller, setHersteller] = useState(initial.hersteller ?? "");
  const [produktname, setProduktname] = useState(initial.produktname ?? "");
  const [typBezeichnung, setTypBezeichnung] = useState(initial.typBezeichnung ?? "");
  const [kategorie, setKategorie] = useState<ProductCategory>(initial.kategorie);
  const [verwendungszweck, setVerwendungszweck] = useState(initial.verwendungszweck);
  const [merkmale, setMerkmale] = useState(initial.merkmale.join(", "));
  const [ersatzSuchkriterien, setErsatzSuchkriterien] = useState(initial.ersatzSuchkriterien);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({
        hersteller: hersteller.trim() || null,
        produktname: produktname.trim() || null,
        typBezeichnung: typBezeichnung.trim() || null,
        kategorie,
        verwendungszweck: verwendungszweck.trim(),
        merkmale: merkmale
          .split(",")
          .map((m) => m.trim())
          .filter(Boolean),
        konfidenz: "hoch",
        unsicher: false,
        ersatzSuchkriterien: ersatzSuchkriterien.trim()
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="correction-form" onSubmit={handleSubmit}>
      <h3>✏️ Produkt korrigieren</h3>

      <label>
        Hersteller
        <input value={hersteller} onChange={(e) => setHersteller(e.target.value)} />
      </label>

      <label>
        Produktname
        <input value={produktname} onChange={(e) => setProduktname(e.target.value)} />
      </label>

      <label>
        Typ / Bezeichnung
        <input value={typBezeichnung} onChange={(e) => setTypBezeichnung(e.target.value)} />
      </label>

      <label>
        Kategorie
        <select value={kategorie} onChange={(e) => setKategorie(e.target.value as ProductCategory)}>
          {PRODUCT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <label>
        Verwendung
        <textarea
          value={verwendungszweck}
          onChange={(e) => setVerwendungszweck(e.target.value)}
          rows={2}
        />
      </label>

      <label>
        Merkmale (Komma-getrennt)
        <input value={merkmale} onChange={(e) => setMerkmale(e.target.value)} />
      </label>

      <label>
        Ersatz-Suchkriterien
        <input value={ersatzSuchkriterien} onChange={(e) => setErsatzSuchkriterien(e.target.value)} />
      </label>

      <div className="correction-actions">
        <button type="button" onClick={onCancel} disabled={submitting}>
          Abbrechen
        </button>
        <button type="submit" disabled={submitting}>
          {submitting ? "Speichere …" : "Speichern"}
        </button>
      </div>
    </form>
  );
}
