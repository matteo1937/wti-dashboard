import type { RequestStatus } from "../types";

const LABELS: Record<RequestStatus, string> = {
  open: "In Abstimmung",
  confirmed: "Bestätigt",
  declined: "Abgesagt"
};

export default function StatusBadge({ status }: { status: RequestStatus }) {
  return <span className={`status-pill status-${status}`}>{LABELS[status]}</span>;
}
