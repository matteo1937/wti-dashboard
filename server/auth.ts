import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { getMemberById } from "./db";

const COOKIE_NAME = "trio_session";
const TOKEN_TTL = "180d";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET ist nicht gesetzt (siehe .env.example).");
  }
  return secret;
}

export function checkPasscode(candidate: string): boolean {
  const expected = process.env.APP_PASSCODE ?? "";
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function issueSessionCookie(res: Response, memberId: number) {
  const token = jwt.sign({ memberId }, getJwtSecret(), { expiresIn: TOKEN_TTL });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 24 * 180
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(COOKIE_NAME);
}

export interface AuthedRequest extends Request {
  memberId?: number;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    res.status(401).json({ error: "Nicht angemeldet." });
    return;
  }
  try {
    const payload = jwt.verify(token, getJwtSecret()) as { memberId: number };
    const member = getMemberById(payload.memberId);
    if (!member) {
      res.status(401).json({ error: "Mitglied nicht gefunden." });
      return;
    }
    req.memberId = member.id;
    next();
  } catch {
    res.status(401).json({ error: "Sitzung abgelaufen, bitte neu anmelden." });
  }
}
