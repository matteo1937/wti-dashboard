import { useState } from "react";
import { ApiError, submitPublicRequest } from "../../lib/api";
import Reveal from "./Reveal";
import { CheckCircleIcon } from "./icons";

export default function RequestForm() {
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

  function handleReset() {
    setTitle("");
    setClient("");
    setContact("");
    setLocation("");
    setEventDate("");
    setEventTime("");
    setNotes("");
    setDone(false);
  }

  return (
    <div className="pub-section-wrap alt" id="anfrage">
      <section className="pub-section">
        <Reveal className="pub-center">
          <p className="pub-eyebrow">Anfrage</p>
          <h2 className="pub-heading">Jetzt anfragen</h2>
          <p className="pub-lede">
            Ihr plant eine Hochzeit, ein Vereinsfest oder eine andere Feier und sucht musikalische
            Unterhaltung? Schickt uns hier eure Anfrage — wir melden uns so schnell wie möglich.
          </p>
        </Reveal>

        <Reveal delay={100} className="pub-form-card">
          {done ? (
            <div className="pub-thankyou">
              <CheckCircleIcon className="pub-thankyou-icon" />
              <h3 style={{ marginTop: 0 }}>Danke!</h3>
              <p>
                Deine Anfrage ist bei uns eingegangen. Wir schauen sie an und melden uns so bald
                wie möglich bei dir.
              </p>
              <button type="button" className="pub-btn pub-btn-outline" onClick={handleReset}>
                Weitere Anfrage senden
              </button>
            </div>
          ) : (
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

              {error && <div className="error-box">{error}</div>}

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
                  <input
                    id="eventDate"
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="eventTime">Uhrzeit</label>
                  <input
                    id="eventTime"
                    type="time"
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                  />
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

              <button type="submit" className="pub-btn pub-btn-primary pub-btn-block" disabled={submitting}>
                {submitting ? "Wird gesendet …" : "Anfrage senden"}
              </button>
            </form>
          )}
        </Reveal>
      </section>
    </div>
  );
}
