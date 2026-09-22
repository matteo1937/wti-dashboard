import { useAuth } from "../context/AuthContext";
import { useRequests } from "../context/RequestsContext";
import RequestCard from "../components/RequestCard";

export default function OpenRequests() {
  const { member } = useAuth();
  const { requests, loading } = useRequests();

  const open = requests.filter((r) => r.status === "open");
  const waitingForMe = open.filter((r) => !r.votes.find((v) => v.memberId === member?.id)?.vote);
  const waitingForOthers = open.filter((r) => r.votes.find((v) => v.memberId === member?.id)?.vote);
  const declined = requests.filter((r) => r.status === "declined");

  if (loading && requests.length === 0) {
    return <p>Lade Anfragen …</p>;
  }

  return (
    <div>
      <h1>Offene Anfragen</h1>

      <h2>Wartet auf deine Stimme</h2>
      {waitingForMe.length === 0 ? (
        <p className="hint">Nichts offen — du hast überall abgestimmt. 🎉</p>
      ) : (
        waitingForMe.map((r) => (
          <RequestCard key={r.id} request={r} currentMemberId={member?.id} highlightMissingVote />
        ))
      )}

      <h2>Wartet auf die anderen</h2>
      {waitingForOthers.length === 0 ? (
        <p className="hint">Keine weiteren Anfragen in Abstimmung.</p>
      ) : (
        waitingForOthers.map((r) => <RequestCard key={r.id} request={r} currentMemberId={member?.id} />)
      )}

      {declined.length > 0 && (
        <details style={{ marginTop: 24 }}>
          <summary style={{ cursor: "pointer", fontWeight: 700, color: "var(--color-wood-dark)" }}>
            Abgesagte Anfragen ({declined.length})
          </summary>
          <div style={{ marginTop: 12 }}>
            {declined.map((r) => (
              <RequestCard key={r.id} request={r} currentMemberId={member?.id} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
