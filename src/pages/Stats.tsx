import { useEffect, useState } from "react";
import { ApiError, getStats } from "../lib/api";
import type { SiteStats } from "../lib/api";

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="card" style={{ textAlign: "center" }}>
      <p className="hint" style={{ marginTop: 0 }}>
        {label}
      </p>
      <p style={{ fontSize: "2rem", fontWeight: 700, margin: 0 }}>{value}</p>
    </div>
  );
}

export default function Stats() {
  const [stats, setStats] = useState<SiteStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getStats()
      .then(setStats)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Statistik konnte nicht geladen werden."));
  }, []);

  if (error) return <div className="error-box">{error}</div>;
  if (!stats) return <p>Lade …</p>;

  const conversion30d = stats.views30d > 0 ? Math.round((stats.requests30d / stats.views30d) * 100) : 0;
  const conversionTotal = stats.totalViews > 0 ? Math.round((stats.totalRequests / stats.totalViews) * 100) : 0;

  return (
    <div>
      <h1>Statistik</h1>
      <p className="hint">
        Zählt nur Seitenaufrufe der öffentlichen Website (keine Cookies, keine IP-Adressen) — rein zur
        groben Einschätzung, wie gut die Seite Anfragen generiert.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginTop: 16 }}>
        <StatTile label="Besuche gesamt" value={String(stats.totalViews)} />
        <StatTile label="Besuche (30 Tage)" value={String(stats.views30d)} />
        <StatTile label="Anfragen gesamt" value={String(stats.totalRequests)} />
        <StatTile label="Anfragen (30 Tage)" value={String(stats.requests30d)} />
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>Conversion-Rate</h2>
        <p>
          Letzte 30 Tage: <strong>{conversion30d}%</strong> der Besuche führten zu einer Anfrage
        </p>
        <p className="hint">Gesamt seit Start der Zählung: {conversionTotal}%</p>
      </div>
    </div>
  );
}
