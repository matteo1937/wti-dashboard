import type { BookingRequest, Member, RequestStatus, VoteValue } from "../types";

class ApiError extends Error {}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: "include",
    ...init,
    headers:
      init?.body && typeof init.body === "string"
        ? { "Content-Type": "application/json", ...(init.headers ?? {}) }
        : init?.headers
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data.error ?? `Fehler (${res.status})`);
  }
  return data as T;
}

export async function login(name: string, passcode: string): Promise<{ member: Member }> {
  return request("/auth/login", { method: "POST", body: JSON.stringify({ name, passcode }) });
}

export async function logout(): Promise<void> {
  await request("/auth/logout", { method: "POST" });
}

export async function me(): Promise<{ member: Member; members: Member[] }> {
  return request("/auth/me");
}

export async function getMembers(): Promise<{ members: Member[] }> {
  return request("/members");
}

export async function getPublicMembers(): Promise<{ members: Member[] }> {
  return request("/public/members");
}

export interface PublicRequestInput {
  title: string;
  client: string;
  contact: string;
  location?: string;
  eventDate?: string;
  eventTime?: string;
  eventEndTime?: string;
  notes?: string;
  website?: string; // Honeypot, muss leer bleiben
}

export async function submitPublicRequest(input: PublicRequestInput): Promise<{ ok: true }> {
  return request("/public/requests", { method: "POST", body: JSON.stringify(input) });
}

export async function listRequests(status?: RequestStatus): Promise<{ requests: BookingRequest[] }> {
  const query = status ? `?status=${status}` : "";
  return request(`/requests${query}`);
}

export async function getRequest(id: number): Promise<{ request: BookingRequest }> {
  return request(`/requests/${id}`);
}

export async function createRequest(formData: FormData): Promise<{ request: BookingRequest }> {
  return request("/requests", { method: "POST", body: formData });
}

export async function updateRequest(id: number, formData: FormData): Promise<{ request: BookingRequest }> {
  return request(`/requests/${id}`, { method: "PATCH", body: formData });
}

export async function deleteRequest(id: number): Promise<void> {
  await request(`/requests/${id}`, { method: "DELETE" });
}

export async function castVote(id: number, vote: VoteValue): Promise<{ request: BookingRequest }> {
  return request(`/requests/${id}/vote`, { method: "POST", body: JSON.stringify({ vote }) });
}

export async function setRequestStatus(
  id: number,
  status: RequestStatus
): Promise<{ request: BookingRequest }> {
  return request(`/requests/${id}/status`, { method: "POST", body: JSON.stringify({ status }) });
}

export { ApiError };
