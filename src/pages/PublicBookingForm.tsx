import { useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, submitPublicRequest } from "../lib/api";

export default function PublicBookingForm() {
  const [title, setTitle] = useState("");
  const [client, setClient] = useState("");
  const [contact, setContact] = useState("");
  const [location, setLocation] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [notes, setNotes] = useState("");
  const [website, setWebsite] = useState(""); // Honeypot

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !client.trim() || !contact.trim()) {
      setError("Bitte alle Pflichtfelder ausfüllen.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitPublicRequest({
        title: title.trim(),
        client: client.trim(),
        contact: contact.trim(),
        location: location.trim(),
        eventDate,
        eventTime,
        notes: notes.trim(),
        website
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Senden fehlgeschlagen. Bitte später erneut versuchen.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <div className="login-logo">🎶</div>
          <h1>Danke!</h1>
          <p>
            Deine Anfrage ist bei uns eingegangen. Wir schauen sie an und melden uns so bald wie
            möglich bei dir.
          </p>
          <Link to="/" className="btn btn-secondary btn-block" style={{ marginTop: 16 }}>
            Weitere Anfrage senden
          </Link>
          <p className="hint" style={{ textAlign: "center", marginTop: 20 }}>
            <Link to="/intern/login">Für Bandmitglieder</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-screen">
      <div className="login-card" style={{ maxWidth: 460, textAlign: "left" }}>
        <div style={{ textAlign: "center" }}>
          <div className="login-logo">🏔️</div>
          <h1>Tal-Echo</h1>
          <p className="hint">Ländlertrio für eure Veranstaltung</p>
        </div>

        <p style={{ marginTop: 16 }}>
          Ihr plant eine Hochzeit, ein Vereinsfest oder eine andere Feier und sucht musikalische
          Unterhaltung? Schickt uns hier eure Anfrage — wir melden uns so schnell wie möglich.
        </p>

        {error && <div className="error-box">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Honeypot: für Menschen unsichtbar */}
          <div style={{ position: "absolute", left: "-9999px" }} aria-hidden="true">
            <label htmlFor="website">Website</label>
            <input
              id="website"
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="title">Worum geht's? *</label>
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. Hochzeit, Vereinsfest, Geburtstag"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="client">Dein Name *</label>
            <input
              id="client"
              value={client}
              onChange={(e) => setClient(e.target.value)}
              placeholder="Vor- und Nachname"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="contact">Telefon oder E-Mail *</label>
            <input
              id="contact"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Damit wir dir antworten können"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="location">Ort der Veranstaltung</label>
            <input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="z.B. 3800 Interlaken, Gasthaus Rössli"
            />
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="eventDate">Datum (falls bekannt)</label>
              <input id="eventDate" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="eventTime">Uhrzeit</label>
              <input id="eventTime" type="time" value={eventTime} onChange={(e) => setEventTime(e.target.value)} />
            </div>
          </div>

          <div className="field">
            <label htmlFor="notes">Nachricht</label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Erzähl uns kurz mehr - Dauer, Anzahl Gäste, besondere Wünsche …"
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? "Wird gesendet …" : "Anfrage senden"}
          </button>
        </form>

        <p className="hint" style={{ textAlign: "center", marginTop: 20 }}>
          <Link to="/intern/login">Für Bandmitglieder</Link>
        </p>
      </div>
    </div>
  );
}
