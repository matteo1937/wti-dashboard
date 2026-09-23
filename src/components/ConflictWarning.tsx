import { Link } from "react-router-dom";
import type { BookingRequest } from "../types";

function formatConflictLine(r: BookingRequest): string {
  const parts = [r.title];
  if (r.eventTime) parts.push(r.eventEndTime ? `${r.eventTime}–${r.eventEndTime} Uhr` : `ab ${r.eventTime} Uhr`);
  parts.push(r.status === "confirmed" ? "bestätigt" : "offen");
  return parts.join(" · ");
}

export default function ConflictWarning({ conflicts }: { conflicts: BookingRequest[] }) {
  if (conflicts.length === 0) return null;

  return (
    <div className="warning-box">
      <strong>⚠️ Mögliche Terminüberschneidung:</strong>
      <ul>
        {conflicts.map((r) => (
          <li key={r.id}>
            <Link to={`/intern/anfragen/${r.id}`}>{formatConflictLine(r)}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
