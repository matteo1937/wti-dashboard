import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useRequests } from "../context/RequestsContext";
import * as api from "../lib/api";
import { ApiError } from "../lib/api";
import StatusBadge from "../components/StatusBadge";
import VoteButtons from "../components/VoteButtons";
import type { BookingRequest, VoteValue } from "../types";

const SOURCE_LABELS: Record<string, string> = {
  screenshot: "E-Mail-Screenshot",
  phone: "Telefonanruf",
  text: "Direkteingabe",
  public: "Website-Formular"
};

function formatDate(iso: string | null): string {
  if (!iso) return "Datum noch offen";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("de-CH", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

export default function RequestDetail() {
  const { id } = useParams<{ id: string }>();
  const requestId = Number(id);
  const navigate = useNavigate();
  const { member } = useAuth();
  const { refresh } = useRequests();

  const [request, setRequest] = useState<BookingRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    title: "",
    client: "",
    contact: "",
    location: "",
    eventDate: "",
    eventTime: "",
    notes: ""
  });
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const data = await api.getRequest(requestId);
      setRequest(data.request);
      setForm({
        title: data.request.title,
        client: data.request.client ?? "",
        contact: data.request.contact ?? "",
        location: data.request.location ?? "",
        eventDate: data.request.eventDate ?? "",
        eventTime: data.request.eventTime ?? "",
        notes: data.request.notes ?? ""
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Anfrage konnte nicht geladen werden.");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  async function handleVote(vote: VoteValue) {
    setBusy(true);
    try {
      const data = await api.castVote(requestId, vote);
      setRequest(data.request);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Stimme konnte nicht gespeichert werden.");
    } finally {
      setBusy(false);
    }
  }

  async function handleStatusChange(status: "open" | "declined") {
    setBusy(true);
    try {
      const data = await api.setRequestStatus(requestId, status);
      setRequest(data.request);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Status konnte nicht geändert werden.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("title", form.title.trim());
      fd.set("client", form.client.trim());
      fd.set("contact", form.contact.trim());
      fd.set("location", form.location.trim());
      fd.set("eventDate", form.eventDate);
      fd.set("eventTime", form.eventTime);
      fd.set("notes", form.notes.trim());
      const data = await api.updateRequest(requestId, fd);
      setRequest(data.request);
      setEditing(false);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Speichern fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Diese Anfrage wirklich unwiderruflich löschen?")) return;
    setBusy(true);
    try {
      await api.deleteRequest(requestId);
      await refresh();
      navigate("/intern/offene-anfragen", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Löschen fehlgeschlagen.");
      setBusy(false);
    }
  }

  if (error) return <div className="error-box">{error}</div>;
  if (!request) return <p>Lade …</p>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <h1>{request.title}</h1>
        <StatusBadge status={request.status} />
      </div>

      {!editing ? (
        <div className="card">
          {request.source === "public" && (
            <span className="status-pill status-external">🌐 Website-Anfrage</span>
          )}
          <p className="card-meta">
            {formatDate(request.eventDate)}
            {request.eventTime ? ` · ${request.eventTime} Uhr` : ""}
          </p>
          {request.location && <p>📍 {request.location}</p>}
          {request.client && <p>Von: {request.client}</p>}
          {request.contact && <p>Kontakt: {request.contact}</p>}
          {request.notes && <p style={{ whiteSpace: "pre-wrap" }}>{request.notes}</p>}
          <p className="hint">
            Quelle: {SOURCE_LABELS[request.source]}
            {request.createdByName ? ` · erfasst von ${request.createdByName}` : ""}
          </p>
          {request.imagePath && (
            <img src={request.imagePath} alt="Screenshot der Anfrage" className="upload-preview" />
          )}
          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>
              Bearbeiten
            </button>
            {request.status !== "declined" ? (
              <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => handleStatusChange("declined")}>
                Anfrage absagen
              </button>
            ) : (
              <button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => handleStatusChange("open")}>
                Wieder öffnen
              </button>
            )}
            <button className="btn btn-ghost btn-sm" disabled={busy} onClick={handleDelete}>
              Löschen
            </button>
          </div>
        </div>
      ) : (
        <form className="card" onSubmit={handleSaveEdit}>
          <div className="field">
            <label>Ort / Veranstaltung</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div className="field">
            <label>Auftraggeber</label>
            <input value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} />
          </div>
          <div className="field">
            <label>Kontakt (Telefon/E-Mail)</label>
            <input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
          </div>
          <div className="field">
            <label>Adresse / Ort</label>
            <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
          <div className="field-row">
            <div className="field">
              <label>Datum</label>
              <input
                type="date"
                value={form.eventDate}
                onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Uhrzeit</label>
              <input
                type="time"
                value={form.eventTime}
                onChange={(e) => setForm({ ...form, eventTime: e.target.value })}
              />
            </div>
          </div>
          <div className="field">
            <label>Notizen</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              Speichern
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>
              Abbrechen
            </button>
          </div>
        </form>
      )}

      {request.status !== "declined" && member && (
        <div className="card">
          <h2>Abstimmung</h2>
          <VoteButtons votes={request.votes} currentMemberId={member.id} onVote={handleVote} disabled={busy} />
          {request.status === "confirmed" && (
            <p className="hint">Alle drei haben zugesagt — der Termin ist im Kalender bestätigt. 🎶</p>
          )}
        </div>
      )}
    </div>
  );
}
