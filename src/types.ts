export type RequestSource = "screenshot" | "phone" | "text";
export type VoteValue = "yes" | "no" | "unsure";
export type RequestStatus = "open" | "confirmed" | "declined";

export interface Member {
  id: number;
  name: string;
}

export interface VoteEntry {
  memberId: number;
  memberName: string;
  vote: VoteValue | null;
  updatedAt: string | null;
}

export interface BookingRequest {
  id: number;
  title: string;
  client: string | null;
  location: string | null;
  eventDate: string | null;
  eventTime: string | null;
  notes: string | null;
  source: RequestSource;
  imagePath: string | null;
  createdBy: number;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  status: RequestStatus;
  votes: VoteEntry[];
}
