import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, createRequest } from "../lib/api";
import { useRequests } from "../context/RequestsContext";
import ConflictWarning from "../components/ConflictWarning";
import { findConflicts } from "../lib/conflicts";
import type { OcrSuggestion } from "../lib/ocr";
import type { RequestSource } from "../types";

const SOURCE_OPTIONS: { value: RequestSource; label: string }[] = [
  { value: "screenshot", label: "📷 E-Mail-Screenshot" },
  { value: "phone", label: "📞 Telefonanruf" },
  { value: "text", label: "✍️ Direkteingabe" }
];

export default function NewRequest() {
  const navigate = useNavigate();
  const { requests, refresh } = useRequests();

  const [source, setSource] = useState<RequestSource>("text");
  const [title, setTitle] = useState("");
  const [client, setClient] = useState("");
  const [contact, setContact] = useState("");
  const [location, setLocation] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventEndTime, setEventEndTime] = useState("");
  const [notes, setNotes] = useState("");

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [ocrRunning, setOcrRunning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrResult, setOcrResult] = useState<OcrSuggestion | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const conflicts = useMemo(
    () => findConflicts({ eventDate: eventDate || null, eventTime: eventTime || null, eventEndTime: eventEndTime || null }, requests),
    [eventDate, eventTime, eventEndTime, requests]
  );

  async function handleImageSelected(file: File | null) {
    setImageFile(file);
    setOcrResult(null);
    setOcrError(null);
    if (!file) {
      setImagePreview(null);
      return;
    }
    setImagePreview(URL.createObjectURL(file));

    setOcrRunning(true);
    setOcrProgress(0);
    try {
      const { extractTextFromImage, parseBookingDetails } = await import("../lib/ocr");
      const text = await extractTextFromImage(file, setOcrProgress);
      const suggestion = parseBookingDetails(text);
      setOcrResult(suggestion);

      if (suggestion.eventDate && !eventDate) setEventDate(suggestion.eventDate);
      if (suggestion.eventTime && !eventTime) setEventTime(suggestion.eventTime);
      if (suggestion.location && !location) setLocation(suggestion.location);
      if (suggestion.client && !client) setClient(suggestion.client);
      if (suggestion.title && !title) setTitle(suggestion.title);
    } catch (err) {
      console.error(err);
      setOcrError("Texterkennung fehlgeschlagen. Bitte Angaben manuell eintragen.");
    } finally {
      setOcrRunning(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setSubmitError("Bitte Ort/Veranstaltung angeben.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const formData = new FormData();
      formData.set("title", title.trim());
      formData.set("client", client.trim());
      formData.set("contact", contact.trim());
      formData.set("location", location.trim());
      formData.set("eventDate", eventDate);
      formData.set("eventTime", eventTime);
      formData.set("eventEndTime", eventEndTime);
      formData.set("notes", notes.trim());
      formData.set("source", source);
      if (imageFile) formData.set("image", imageFile);

      const { request } = await createRequest(formData);
      await refresh();
      navigate(`/intern/anfragen/${request.id}`, { replace: true });
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Speichern fehlgeschlagen.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1>Neue Anfrage</h1>

      {submitError && <div className="error-box">{submitError}</div>}

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Quelle der Anfrage</label>
          <div className="source-choice">
            {SOURCE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={source === opt.value ? "active" : ""}
                onClick={() => setSource(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {source === "screenshot" && (
          <div className="field">
            <label htmlFor="image">Screenshot / Foto der E-Mail</label>
            <input
              id="image"
              type="file"
              accept="image/*"
              onChange={(e) => handleImageSelected(e.target.files?.[0] ?? null)}
            />
            {imagePreview && <img src={imagePreview} alt="Vorschau" className="upload-preview" />}
            {ocrRunning && <p className="ocr-status">🔎 Erkenne Text … {ocrProgress}%</p>}
            {ocrError && <p className="ocr-status">{ocrError}</p>}
            {ocrResult && !ocrRunning && (
              <div className="ocr-suggestion-box">
                <strong>Vorschlag aus dem Screenshot:</strong> Felder unten wurden automatisch
                ausgefüllt, wo möglich. Bitte vor dem Speichern prüfen und korrigieren.
              </div>
            )}
          </div>
        )}

        <div className="field">
          <label htmlFor="title">Ort / Veranstaltung *</label>
          <input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="z.B. Chilbi Musikverein Hinterdorf"
            required
          />
        </div>

        <div className="field">
          <label htmlFor="client">Auftraggeber</label>
          <input
            id="client"
            value={client}
            onChange={(e) => setClient(e.target.value)}
            placeholder="z.B. Frau Müller / Wirtin"
          />
        </div>

        <div className="field">
          <label htmlFor="contact">Kontakt (Telefon/E-Mail)</label>
          <input
            id="contact"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="Für Rückfragen"
          />
        </div>

        <div className="field">
          <label htmlFor="location">Adresse / Ort der Veranstaltung</label>
          <input
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="z.B. 3800 Interlaken, Gasthaus Rössli"
          />
        </div>

        <div className="field">
          <label htmlFor="eventDate">Datum</label>
          <input id="eventDate" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="eventTime">Von</label>
            <input id="eventTime" type="time" value={eventTime} onChange={(e) => setEventTime(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="eventEndTime">Bis</label>
            <input
              id="eventEndTime"
              type="time"
              value={eventEndTime}
              onChange={(e) => setEventEndTime(e.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="notes">Notizen (Honorar, Dauer, Wünsche …)</label>
          <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <ConflictWarning conflicts={conflicts} />

        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? "Speichern …" : "Anfrage speichern"}
        </button>
      </form>
    </div>
  );
}
