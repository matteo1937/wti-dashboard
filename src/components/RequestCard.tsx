import { Link } from "react-router-dom";
import type { BookingRequest } from "../types";
import StatusBadge from "./StatusBadge";

function formatDate(iso: string | null): string {
  if (!iso) return "Datum offen";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("de-CH", { weekday: "short", day: "2-digit", month: "long", year: "numeric" });
}

export default function RequestCard({
  request,
  currentMemberId,
  highlightMissingVote
}: {
  request: BookingRequest;
  currentMemberId?: number;
  highlightMissingVote?: boolean;
}) {
  const myVote = currentMemberId
    ? request.votes.find((v) => v.memberId === currentMemberId)?.vote ?? null
    : null;
  const missingMyVote = highlightMissingVote && !myVote;

  return (
    <Link to={`/intern/anfragen/${request.id}`} className="card" style={{ display: "block", textDecoration: "none" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div>
          <p className="card-title">{request.title}</p>
          <p className="card-meta">
            {formatDate(request.eventDate)}
            {request.eventTime ? ` · ${request.eventTime} Uhr` : ""}
          </p>
        </div>
        {missingMyVote ? (
          <span className="status-pill status-waiting">Deine Stimme fehlt</span>
        ) : (
          <StatusBadge status={request.status} />
        )}
      </div>
      {request.source === "public" && <span className="status-pill status-external">🌐 Website-Anfrage</span>}
      {request.location && <p className="card-meta">📍 {request.location}</p>}
      {request.client && <p className="card-meta">Von: {request.client}</p>}
      <div className="member-votes">
        {request.votes.map((v) => (
          <div className="member-vote-item" key={v.memberId}>
            <span className={`vote-icon${v.vote ? ` ${v.vote}` : ""}`}>
              {v.vote === "yes" ? "👍" : v.vote === "no" ? "👎" : v.vote === "unsure" ? "🤷" : "…"}
            </span>
            <span>{v.memberName}</span>
          </div>
        ))}
      </div>
    </Link>
  );
}
