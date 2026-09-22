import type { NextFunction, Request, Response } from "express";
import { clerkClient, clerkMiddleware, getAuth } from "@clerk/express";

export { clerkMiddleware };

export interface AuthContext {
  userId: string;
  userName: string;
  orgId: string;
  role: "admin" | "mitglied";
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      appAuth?: AuthContext;
    }
  }
}

const userNameCache = new Map<string, string>();

async function resolveUserName(userId: string): Promise<string> {
  const cached = userNameCache.get(userId);
  if (cached) return cached;

  try {
    const user = await clerkClient.users.getUser(userId);
    const name =
      [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
      user.username ||
      user.emailAddresses[0]?.emailAddress ||
      userId;
    userNameCache.set(userId, name);
    return name;
  } catch (err) {
    console.error("Konnte Clerk-Benutzernamen nicht laden:", err);
    return userId;
  }
}

export async function requireOrgAuth(req: Request, res: Response, next: NextFunction) {
  const auth = getAuth(req);

  if (!auth.userId) {
    res.status(401).json({ error: "Nicht angemeldet." });
    return;
  }

  if (!auth.orgId) {
    res.status(403).json({ error: "Keine aktive Organisation ausgewählt. Bitte Team wählen." });
    return;
  }

  const userName = await resolveUserName(auth.userId);

  req.appAuth = {
    userId: auth.userId,
    userName,
    orgId: auth.orgId,
    role: auth.orgRole === "org:admin" ? "admin" : "mitglied"
  };

  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.appAuth?.role !== "admin") {
    res.status(403).json({ error: "Nur Admins können Produktdaten korrigieren." });
    return;
  }
  next();
}
