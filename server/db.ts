import { DatabaseSync } from "node:sqlite";
import { randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type {
  BookingRequest,
  Member,
  NewRequestInput,
  RequestStatus,
  UpdateRequestInput,
  VoteEntry,
  VoteValue
} from "./types";

const DB_PATH = process.env.SQLITE_PATH ?? "data/trio.db";
mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    client TEXT,
    contact TEXT,
    location TEXT,
    event_date TEXT,
    event_time TEXT,
    event_end_time TEXT,
    notes TEXT,
    source TEXT NOT NULL CHECK(source IN ('screenshot','phone','text','public')),
    image_path TEXT,
    created_by INTEGER REFERENCES members(id),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','confirmed','declined'))
  );

  CREATE TABLE IF NOT EXISTS votes (
    request_id INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    member_id INTEGER NOT NULL REFERENCES members(id),
    vote TEXT NOT NULL CHECK(vote IN ('yes','no','unsure')),
    updated_at TEXT NOT NULL,
    PRIMARY KEY (request_id, member_id)
  );

  CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS page_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT NOT NULL,
    referrer TEXT,
    created_at TEXT NOT NULL
  );
`);

// Migration für Datenbanken, die vor der öffentlichen Anfrage-Funktion
// angelegt wurden: created_by war NOT NULL und es gab noch keine contact-
// Spalte bzw. keinen 'public'-Quellentyp. SQLite kann Spalten-Constraints
// nicht per ALTER TABLE ändern, daher wird die Tabelle bei Bedarf einmalig
// neu angelegt und alle bestehenden Zeilen unverändert übernommen.
function migrateRequestsTable() {
  const columns = db.prepare("PRAGMA table_info(requests)").all() as {
    name: string;
    notnull: number;
  }[];
  const hasContact = columns.some((c) => c.name === "contact");
  const createdByNotNull = columns.find((c) => c.name === "created_by")?.notnull === 1;
  if (!hasContact || createdByNotNull) {
    db.exec(`
      CREATE TABLE requests_migrated (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        client TEXT,
        contact TEXT,
        location TEXT,
        event_date TEXT,
        event_time TEXT,
        event_end_time TEXT,
        notes TEXT,
        source TEXT NOT NULL CHECK(source IN ('screenshot','phone','text','public')),
        image_path TEXT,
        created_by INTEGER REFERENCES members(id),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','confirmed','declined'))
      );
      INSERT INTO requests_migrated
        (id, title, client, location, event_date, event_time, notes, source, image_path, created_by, created_at, updated_at, status)
        SELECT id, title, client, location, event_date, event_time, notes, source, image_path, created_by, created_at, updated_at, status
        FROM requests;
      DROP TABLE requests;
      ALTER TABLE requests_migrated RENAME TO requests;
    `);
  }
}
migrateRequestsTable();

// Additive Migration: Ende-Uhrzeit (Von/Bis) nachträglich hinzugefügt.
// Einfaches ALTER TABLE ADD COLUMN reicht hier, da keine Constraints
// betroffen sind und bestehende Zeilen einfach NULL bekommen.
function migrateEventEndTime() {
  const columns = db.prepare("PRAGMA table_info(requests)").all() as { name: string }[];
  if (!columns.some((c) => c.name === "event_end_time")) {
    db.exec("ALTER TABLE requests ADD COLUMN event_end_time TEXT");
  }
}
migrateEventEndTime();

// Einmaliger, sicherer Reset-Mechanismus: wird nur ausgeführt, wenn
// RESET_ALL_DATA_TOKEN gesetzt ist UND sich vom zuletzt angewendeten Token
// unterscheidet. Danach wird der Token in der DB gespeichert, sodass ein
// Neustart mit demselben Token keinen erneuten Reset auslöst (schützt vor
// versehentlichem Datenverlust bei künftigen Deploys).
function maybeResetAllData() {
  const token = process.env.RESET_ALL_DATA_TOKEN;
  if (!token) return;

  const row = db.prepare("SELECT value FROM meta WHERE key = 'reset_token'").get() as
    | { value: string }
    | undefined;
  if (row?.value === token) return;

  db.exec("DELETE FROM votes; DELETE FROM requests; DELETE FROM members;");
  db.prepare(
    "INSERT INTO meta (key, value) VALUES ('reset_token', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(token);
}
maybeResetAllData();

function seedMembers() {
  const names = (process.env.MEMBER_NAMES ?? "Hans,Sepp,Vreni")
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);

  const existing = db.prepare("SELECT id, name FROM members ORDER BY id").all() as {
    id: number;
    name: string;
  }[];

  if (existing.length === names.length) {
    // Gleiche Anzahl Mitglieder: vermutlich wurde MEMBER_NAMES nur umbenannt
    // (z.B. Platzhalter durch echte Namen ersetzt). Umbenennen statt neu
    // anlegen, damit bereits verknüpfte Anfragen/Stimmen (per member_id)
    // erhalten bleiben.
    const rename = db.prepare("UPDATE members SET name = ? WHERE id = ?");
    existing.forEach((member, i) => {
      if (member.name !== names[i]) {
        rename.run(names[i], member.id);
      }
    });
    return;
  }

  if (existing.length > 0) {
    const { c: activityCount } = db
      .prepare("SELECT (SELECT COUNT(*) FROM requests) + (SELECT COUNT(*) FROM votes) AS c")
      .get() as { c: number };
    // Unterschiedliche Anzahl Mitglieder und noch keine echten Daten:
    // alte Seed-Mitglieder komplett ersetzen statt nur zu ergänzen.
    if (activityCount === 0) {
      db.exec("DELETE FROM members");
    }
  }

  const insert = db.prepare("INSERT OR IGNORE INTO members (name) VALUES (?)");
  for (const name of names) {
    insert.run(name);
  }
}
seedMembers();

// Geheimes Token für den öffentlich erreichbaren, aber unerratbaren
// iCal-Abo-Link. Wird beim ersten Zugriff erzeugt und dauerhaft in der
// meta-Tabelle gespeichert, damit der Abo-Link über Neustarts hinweg
// gültig bleibt.
export function getCalendarToken(): string {
  const row = db.prepare("SELECT value FROM meta WHERE key = 'calendar_token'").get() as
    | { value: string }
    | undefined;
  if (row) return row.value;

  const token = randomBytes(24).toString("hex");
  db.prepare("INSERT INTO meta (key, value) VALUES ('calendar_token', ?)").run(token);
  return token;
}

export function getMembers(): Member[] {
  const rows = db.prepare("SELECT id, name FROM members ORDER BY id").all() as {
    id: number;
    name: string;
  }[];
  return rows;
}

export function getMemberById(id: number): Member | undefined {
  const row = db.prepare("SELECT id, name FROM members WHERE id = ?").get(id) as
    | { id: number; name: string }
    | undefined;
  return row;
}

export function getMemberByName(name: string): Member | undefined {
  const row = db.prepare("SELECT id, name FROM members WHERE name = ?").get(name) as
    | { id: number; name: string }
    | undefined;
  return row;
}

interface RequestRow {
  id: number;
  title: string;
  client: string | null;
  contact: string | null;
  location: string | null;
  event_date: string | null;
  event_time: string | null;
  event_end_time: string | null;
  notes: string | null;
  source: BookingRequest["source"];
  image_path: string | null;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
  status: RequestStatus;
}

function getVotesForRequest(requestId: number): VoteEntry[] {
  const members = getMembers();
  const rows = db
    .prepare("SELECT member_id, vote, updated_at FROM votes WHERE request_id = ?")
    .all(requestId) as { member_id: number; vote: VoteValue; updated_at: string }[];
  const byMember = new Map(rows.map((r) => [r.member_id, r]));

  return members.map((m) => {
    const v = byMember.get(m.id);
    return {
      memberId: m.id,
      memberName: m.name,
      vote: v?.vote ?? null,
      updatedAt: v?.updated_at ?? null
    };
  });
}

function rowToRequest(row: RequestRow): BookingRequest {
  return {
    id: row.id,
    title: row.title,
    client: row.client,
    contact: row.contact,
    location: row.location,
    eventDate: row.event_date,
    eventTime: row.event_time,
    eventEndTime: row.event_end_time,
    notes: row.notes,
    source: row.source,
    imagePath: row.image_path,
    createdBy: row.created_by,
    createdByName: row.created_by_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: row.status,
    votes: getVotesForRequest(row.id)
  };
}

const REQUEST_SELECT = `
  SELECT r.id, r.title, r.client, r.contact, r.location, r.event_date, r.event_time, r.event_end_time, r.notes,
         r.source, r.image_path, r.created_by, m.name AS created_by_name,
         r.created_at, r.updated_at, r.status
  FROM requests r
  LEFT JOIN members m ON m.id = r.created_by
`;

export function listRequests(status?: RequestStatus): BookingRequest[] {
  const rows = status
    ? (db
        .prepare(`${REQUEST_SELECT} WHERE r.status = ? ORDER BY r.event_date IS NULL, r.event_date ASC, r.created_at ASC`)
        .all(status) as unknown as RequestRow[])
    : (db.prepare(`${REQUEST_SELECT} ORDER BY r.created_at DESC`).all() as unknown as RequestRow[]);
  return rows.map(rowToRequest);
}

export function getRequestById(id: number): BookingRequest | undefined {
  const row = db.prepare(`${REQUEST_SELECT} WHERE r.id = ?`).get(id) as RequestRow | undefined;
  return row ? rowToRequest(row) : undefined;
}

export function createRequest(input: NewRequestInput): BookingRequest {
  const now = new Date().toISOString();
  const result = db
    .prepare(
      `INSERT INTO requests
        (title, client, contact, location, event_date, event_time, event_end_time, notes, source, image_path, created_by, created_at, updated_at, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open')`
    )
    .run(
      input.title,
      input.client ?? null,
      input.contact ?? null,
      input.location ?? null,
      input.eventDate ?? null,
      input.eventTime ?? null,
      input.eventEndTime ?? null,
      input.notes ?? null,
      input.source,
      input.imagePath ?? null,
      input.createdBy,
      now,
      now
    );
  const id = Number(result.lastInsertRowid);
  return getRequestById(id)!;
}

export function updateRequest(id: number, input: UpdateRequestInput): BookingRequest | undefined {
  const existing = getRequestById(id);
  if (!existing) return undefined;

  const now = new Date().toISOString();
  db.prepare(
    `UPDATE requests SET
       title = ?, client = ?, contact = ?, location = ?, event_date = ?, event_time = ?,
       event_end_time = ?, notes = ?, source = ?, image_path = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    input.title ?? existing.title,
    input.client !== undefined ? input.client : existing.client,
    input.contact !== undefined ? input.contact : existing.contact,
    input.location !== undefined ? input.location : existing.location,
    input.eventDate !== undefined ? input.eventDate : existing.eventDate,
    input.eventTime !== undefined ? input.eventTime : existing.eventTime,
    input.eventEndTime !== undefined ? input.eventEndTime : existing.eventEndTime,
    input.notes !== undefined ? input.notes : existing.notes,
    input.source ?? existing.source,
    input.imagePath !== undefined ? input.imagePath : existing.imagePath,
    now,
    id
  );
  return getRequestById(id);
}

function recomputeStatus(id: number) {
  const request = getRequestById(id);
  if (!request || request.status === "declined") return;

  const allYes = request.votes.length > 0 && request.votes.every((v) => v.vote === "yes");
  const newStatus: RequestStatus = allYes ? "confirmed" : "open";
  if (newStatus !== request.status) {
    db.prepare("UPDATE requests SET status = ?, updated_at = ? WHERE id = ?").run(
      newStatus,
      new Date().toISOString(),
      id
    );
  }
}

export function setVote(requestId: number, memberId: number, vote: VoteValue): BookingRequest | undefined {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO votes (request_id, member_id, vote, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(request_id, member_id) DO UPDATE SET vote = excluded.vote, updated_at = excluded.updated_at`
  ).run(requestId, memberId, vote, now);

  recomputeStatus(requestId);
  return getRequestById(requestId);
}

export function setRequestStatus(id: number, status: RequestStatus): BookingRequest | undefined {
  db.prepare("UPDATE requests SET status = ?, updated_at = ? WHERE id = ?").run(
    status,
    new Date().toISOString(),
    id
  );
  return getRequestById(id);
}

export function deleteRequest(id: number): void {
  db.prepare("DELETE FROM requests WHERE id = ?").run(id);
}

// --- Statistik (datenschutzfreundlich: keine IP, keine Cookies, keine
// personenbezogenen Daten - nur Pfad, Referrer und Zeitpunkt) ---

export function recordPageView(path: string, referrer: string | null): void {
  db.prepare("INSERT INTO page_views (path, referrer, created_at) VALUES (?, ?, ?)").run(
    path,
    referrer,
    new Date().toISOString()
  );
}

export interface SiteStats {
  totalViews: number;
  views30d: number;
  totalRequests: number;
  requests30d: number;
}

export function getStats(): SiteStats {
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { c: totalViews } = db.prepare("SELECT COUNT(*) AS c FROM page_views").get() as { c: number };
  const { c: views30d } = db
    .prepare("SELECT COUNT(*) AS c FROM page_views WHERE created_at >= ?")
    .get(since30d) as { c: number };
  const { c: totalRequests } = db.prepare("SELECT COUNT(*) AS c FROM requests").get() as { c: number };
  const { c: requests30d } = db
    .prepare("SELECT COUNT(*) AS c FROM requests WHERE created_at >= ?")
    .get(since30d) as { c: number };

  return { totalViews, views30d, totalRequests, requests30d };
}
