import type { VoteEntry, VoteValue } from "../types";

interface Props {
  votes: VoteEntry[];
  currentMemberId: number;
  onVote: (vote: VoteValue) => void;
  disabled?: boolean;
}

const ICONS: Record<VoteValue, string> = { yes: "👍", no: "👎", unsure: "🤷" };
const LABELS: Record<VoteValue, string> = { yes: "Ja", no: "Nein", unsure: "Unsicher" };

export default function VoteButtons({ votes, currentMemberId, onVote, disabled }: Props) {
  const myVote = votes.find((v) => v.memberId === currentMemberId)?.vote ?? null;
  const others = votes.filter((v) => v.memberId !== currentMemberId);

  return (
    <div>
      <div className="vote-row">
        {(["yes", "unsure", "no"] as VoteValue[]).map((value) => (
          <button
            key={value}
            type="button"
            disabled={disabled}
            className={`vote-btn${myVote === value ? ` selected-${value}` : ""}`}
            onClick={() => onVote(value)}
          >
            <span>{ICONS[value]}</span>
            <span className="label">{LABELS[value]}</span>
          </button>
        ))}
      </div>
      <div className="member-votes">
        {others.map((v) => (
          <div className="member-vote-item" key={v.memberId}>
            <span className={`vote-icon${v.vote ? ` ${v.vote}` : ""}`}>
              {v.vote ? ICONS[v.vote] : "…"}
            </span>
            <span>{v.memberName}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
