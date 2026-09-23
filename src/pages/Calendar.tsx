import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRequests } from "../context/RequestsContext";
import RequestCard from "../components/RequestCard";
import { useAuth } from "../context/AuthContext";
import { getCalendarToken } from "../lib/api";
import type { BookingRequest } from "../types";

function CalendarSubscribe() {
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getCalendarToken()
      .then((data) => setToken(data.token))
      .catch(() => setToken(null));
  }, []);

  if (!token) return null;

  const httpsUrl = `${window.location.origin}/api/calendar/feed.ics?token=${token}`;
  const webcalUrl = httpsUrl.replace(/^https?:\/\//, "webcal://");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(httpsUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Zwischenablage evtl. nicht verfügbar (z.B. kein HTTPS) - kein Problem,
      // die URL steht ja sichtbar im Feld.
    }
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h2 style={{ marginTop: 0 }}>Kalender abonnieren</h2>
      <p className="hint">
        Abonniere diesen Link in Google/Apple/Outlook-Kalender, dann erscheinen bestätigte Termine
        automatisch auch in deinem persönlichen Kalender.
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <a href={webcalUrl} className="btn btn-primary btn-sm">
          Direkt abonnieren
        </a>
        <button type="button" className="btn btn-secondary btn-sm" onClick={handleCopy}>
          {copied ? "Kopiert ✓" : "Link kopieren"}
        </button>
      </div>
      <input readOnly value={httpsUrl} onFocus={(e) => e.target.select()} style={{ marginTop: 8 }} />
    </div>
  );
}

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildMonthGrid(monthStart: Date): Date[] {
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  // Montag = 0 ... Sonntag = 6
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - startOffset);

  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    days.push(new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i));
  }
  return days;
}

export default function Calendar() {
  const { requests, loading } = useRequests();
  const { member } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<"month" | "list">("month");
  const [monthStart, setMonthStart] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const confirmed = useMemo(
    () =>
      requests
        .filter((r) => r.status === "confirmed")
        .sort((a, b) => (a.eventDate ?? "9999").localeCompare(b.eventDate ?? "9999")),
    [requests]
  );

  const eventsByDate = useMemo(() => {
    const map = new Map<string, BookingRequest[]>();
    for (const r of confirmed) {
      if (!r.eventDate) continue;
      const list = map.get(r.eventDate) ?? [];
      list.push(r);
      map.set(r.eventDate, list);
    }
    return map;
  }, [confirmed]);

  const grid = useMemo(() => buildMonthGrid(monthStart), [monthStart]);
  const todayIso = isoDate(new Date());

  if (loading && requests.length === 0) {
    return <p>Lade Kalender …</p>;
  }

  return (
    <div>
      <h1>Kalender</h1>

      <CalendarSubscribe />

      <div className="view-toggle">
        <button
          className={`btn btn-sm ${view === "month" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setView("month")}
        >
          Monat
        </button>
        <button
          className={`btn btn-sm ${view === "list" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setView("list")}
        >
          Liste
        </button>
      </div>

      {view === "month" ? (
        <>
          <div className="calendar-header">
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setMonthStart(new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1))}
            >
              ‹
            </button>
            <strong>{monthStart.toLocaleDateString("de-CH", { month: "long", year: "numeric" })}</strong>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setMonthStart(new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1))}
            >
              ›
            </button>
          </div>

          <div className="calendar-grid">
            {WEEKDAYS.map((d) => (
              <div className="calendar-weekday" key={d}>
                {d}
              </div>
            ))}
            {grid.map((day) => {
              const iso = isoDate(day);
              const outside = day.getMonth() !== monthStart.getMonth();
              const events = eventsByDate.get(iso) ?? [];
              return (
                <div
                  key={iso}
                  className={`calendar-day${outside ? " outside" : ""}${iso === todayIso ? " today" : ""}`}
                >
                  <span className="calendar-day-num">{day.getDate()}</span>
                  {events.slice(0, 2).map((ev) => (
                    <button
                      key={ev.id}
                      className="calendar-event-dot"
                      style={{ border: "none", cursor: "pointer" }}
                      onClick={() => navigate(`/intern/anfragen/${ev.id}`)}
                      title={ev.title}
                    >
                      {ev.title}
                    </button>
                  ))}
                  {events.length > 2 && <span className="calendar-event-dot">+{events.length - 2} mehr</span>}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div>
          {confirmed.length === 0 ? (
            <p className="empty-state">Noch keine bestätigten Termine.</p>
          ) : (
            confirmed.map((r) => <RequestCard key={r.id} request={r} currentMemberId={member?.id} />)
          )}
        </div>
      )}
    </div>
  );
}
