import { useEffect, useState } from "react";
import { fetchScanHistory, scanHistoryExportUrl, type ScanHistoryFilter } from "../lib/api";
import type { ScanHistoryEntry } from "../types";

export function HistoryView() {
  const [entries, setEntries] = useState<ScanHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projektTag, setProjektTag] = useState("");
  const [von, setVon] = useState("");
  const [bis, setBis] = useState("");

  const filter: ScanHistoryFilter = {
    projektTag: projektTag || undefined,
    von: von ? new Date(von).toISOString() : undefined,
    bis: bis ? new Date(`${bis}T23:59:59`).toISOString() : undefined
  };

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchScanHistory(filter);
      setEntries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Historie konnte nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="history-view">
      <div className="history-filters">
        <label>
          Projekt/Baustelle
          <input
            value={projektTag}
            onChange={(e) => setProjektTag(e.target.value)}
            placeholder="Filter …"
          />
        </label>
        <label>
          Von
          <input type="date" value={von} onChange={(e) => setVon(e.target.value)} />
        </label>
        <label>
          Bis
          <input type="date" value={bis} onChange={(e) => setBis(e.target.value)} />
        </label>
        <button type="button" onClick={load} disabled={loading}>
          {loading ? "Lädt …" : "🔍 Filtern"}
        </button>
      </div>

      <div className="history-export">
        <a className="export-link" href={scanHistoryExportUrl(filter, "csv")}>
          ⬇️ CSV-Export
        </a>
        <a className="export-link" href={scanHistoryExportUrl(filter, "pdf")}>
          ⬇️ PDF-Export
        </a>
      </div>

      {error && <p className="status-message error">❌ {error}</p>}

      {!loading && entries.length === 0 && <p className="status-message">Keine Scans gefunden.</p>}

      <ul className="history-list">
        {entries.map((entry) => (
          <li key={entry.id} className="history-item">
            <div className="history-item-header">
              <strong>{entry.produkt.hersteller ?? "Hersteller unbekannt"}</strong>
              <span>
                {entry.produkt.produktname ?? entry.produkt.typBezeichnung ?? entry.produkt.kategorie}
              </span>
            </div>
            <div className="history-item-meta">
              {new Date(entry.createdAt).toLocaleString("de-CH")} · {entry.userName} ·{" "}
              {entry.erkanntVia === "barcode_db" ? "Barcode" : "Foto-KI"}
              {entry.eanBarcode ? ` · EAN ${entry.eanBarcode}` : ""}
              {entry.projektTag ? ` · ${entry.projektTag}` : ""}
              {entry.manuellKorrigiert ? " · ✅ korrigiert" : ""}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
