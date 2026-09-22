import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import multer from "multer";
import { mkdirSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkPasscode, clearSessionCookie, issueSessionCookie, requireAuth } from "./auth";
import type { AuthedRequest } from "./auth";
import {
  createRequest,
  deleteRequest,
  getMemberByName,
  getMembers,
  getRequestById,
  listRequests,
  setRequestStatus,
  setVote,
  updateRequest
} from "./db";
import type { NewRequestInput, RequestSource, RequestStatus, UpdateRequestInput, VoteValue } from "./types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, "../dist");
const uploadsDir = process.env.UPLOADS_DIR ?? "data/uploads";
mkdirSync(uploadsDir, { recursive: true });

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const suffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${suffix}${extname(file.originalname).toLowerCase()}`);
    }
  }),
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      cb(new Error("Nicht unterstützter Bildtyp."));
      return;
    }
    cb(null, true);
  }
});

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use("/uploads", express.static(uploadsDir));

const VALID_SOURCES: RequestSource[] = ["screenshot", "phone", "text"];
const VALID_VOTES: VoteValue[] = ["yes", "no", "unsure"];
const VALID_STATUSES: RequestStatus[] = ["open", "confirmed", "declined"];

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, members: getMembers().length });
});

// Öffentlich (vor Login) für die Mitglieder-Auswahl auf dem Login-Screen.
// Gibt bewusst nur die Vornamen zurück, keine sensiblen Daten.
app.get("/api/public/members", (_req, res) => {
  res.json({ members: getMembers() });
});

// --- Auth ---

app.post("/api/auth/login", (req, res) => {
  const { name, passcode } = req.body as { name?: string; passcode?: string };
  if (!isNonEmptyString(name) || !isNonEmptyString(passcode)) {
    res.status(400).json({ error: "Name und Zugangscode sind erforderlich." });
    return;
  }
  if (!checkPasscode(passcode)) {
    res.status(401).json({ error: "Falscher Zugangscode." });
    return;
  }
  const member = getMemberByName(name);
  if (!member) {
    res.status(404).json({ error: "Unbekanntes Mitglied." });
    return;
  }
  issueSessionCookie(res, member.id);
  res.json({ member });
});

app.post("/api/auth/logout", (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

app.get("/api/auth/me", requireAuth, (req: AuthedRequest, res) => {
  const members = getMembers();
  const me = members.find((m) => m.id === req.memberId);
  res.json({ member: me, members });
});

// --- Members ---

app.get("/api/members", requireAuth, (_req, res) => {
  res.json({ members: getMembers() });
});

// --- Requests ---

app.get("/api/requests", requireAuth, (req, res) => {
  const statusParam = req.query.status as string | undefined;
  if (statusParam && !VALID_STATUSES.includes(statusParam as RequestStatus)) {
    res.status(400).json({ error: "Ungültiger Status-Filter." });
    return;
  }
  const requests = listRequests(statusParam as RequestStatus | undefined);
  res.json({ requests });
});

app.get("/api/requests/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const request = getRequestById(id);
  if (!request) {
    res.status(404).json({ error: "Anfrage nicht gefunden." });
    return;
  }
  res.json({ request });
});

app.post("/api/requests", requireAuth, upload.single("image"), (req: AuthedRequest, res) => {
  const body = req.body as Record<string, string | undefined>;

  if (!isNonEmptyString(body.title)) {
    res.status(400).json({ error: "Titel (Ort/Veranstaltung) ist erforderlich." });
    return;
  }
  const source = body.source as RequestSource;
  if (!VALID_SOURCES.includes(source)) {
    res.status(400).json({ error: "Ungültige Quelle." });
    return;
  }

  const input: NewRequestInput = {
    title: body.title.trim(),
    client: body.client?.trim() || null,
    location: body.location?.trim() || null,
    eventDate: body.eventDate?.trim() || null,
    eventTime: body.eventTime?.trim() || null,
    notes: body.notes?.trim() || null,
    source,
    imagePath: req.file ? `/uploads/${req.file.filename}` : null,
    createdBy: req.memberId!
  };

  const request = createRequest(input);
  res.status(201).json({ request });
});

app.patch("/api/requests/:id", requireAuth, upload.single("image"), (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const existing = getRequestById(id);
  if (!existing) {
    res.status(404).json({ error: "Anfrage nicht gefunden." });
    return;
  }

  const body = req.body as Record<string, string | undefined>;
  if (body.source && !VALID_SOURCES.includes(body.source as RequestSource)) {
    res.status(400).json({ error: "Ungültige Quelle." });
    return;
  }

  const input: UpdateRequestInput = {
    title: body.title?.trim(),
    client: body.client !== undefined ? body.client.trim() || null : undefined,
    location: body.location !== undefined ? body.location.trim() || null : undefined,
    eventDate: body.eventDate !== undefined ? body.eventDate.trim() || null : undefined,
    eventTime: body.eventTime !== undefined ? body.eventTime.trim() || null : undefined,
    notes: body.notes !== undefined ? body.notes.trim() || null : undefined,
    source: body.source as RequestSource | undefined,
    imagePath: req.file ? `/uploads/${req.file.filename}` : undefined
  };

  const request = updateRequest(id, input);
  res.json({ request });
});

app.delete("/api/requests/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const existing = getRequestById(id);
  if (!existing) {
    res.status(404).json({ error: "Anfrage nicht gefunden." });
    return;
  }
  deleteRequest(id);
  res.status(204).end();
});

app.post("/api/requests/:id/vote", requireAuth, (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const { vote } = req.body as { vote?: VoteValue };
  if (!vote || !VALID_VOTES.includes(vote)) {
    res.status(400).json({ error: "Ungültige Stimme." });
    return;
  }
  const existing = getRequestById(id);
  if (!existing) {
    res.status(404).json({ error: "Anfrage nicht gefunden." });
    return;
  }
  const request = setVote(id, req.memberId!, vote);
  res.json({ request });
});

app.post("/api/requests/:id/status", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body as { status?: RequestStatus };
  if (!status || !VALID_STATUSES.includes(status)) {
    res.status(400).json({ error: "Ungültiger Status." });
    return;
  }
  const existing = getRequestById(id);
  if (!existing) {
    res.status(404).json({ error: "Anfrage nicht gefunden." });
    return;
  }
  const request = setRequestStatus(id, status);
  res.json({ request });
});

// Fehlerbehandlung für multer (z.B. zu grosse Datei / falscher Typ)
app.use((err: Error, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err) {
    res.status(400).json({ error: err.message });
    return;
  }
  next();
});

// In Produktion liefert derselbe Prozess auch das gebaute Frontend aus
// (kein separater Vite-Dev-Server), damit ein einzelner Hosting-Service reicht.
if (process.env.NODE_ENV === "production") {
  app.use(express.static(distDir));
  app.get("*", (_req, res) => {
    res.sendFile(join(distDir, "index.html"));
  });
}

const port = Number(process.env.PORT ?? 8787);
app.listen(port, () => {
  console.log(`Trio-Auftritte API läuft auf http://localhost:${port}`);
});
