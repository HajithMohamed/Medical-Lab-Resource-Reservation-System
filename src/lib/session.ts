import "server-only";

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";
import { SESSION_COOKIE_NAME, SESSION_HOURS } from "@/config/rules";

export interface SessionPayload {
  userId: string;
  sessionVersion: number;
}

const key = new TextEncoder().encode(env.SESSION_SECRET);

/**
 * Signs a stateless JWT session token containing userId and sessionVersion.
 */
export async function signSessionToken({
  userId,
  sessionVersion,
}: SessionPayload): Promise<string> {
  return new SignJWT({ userId, sessionVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(key);
}

/**
 * Verifies a session token. Returns payload or null if missing, expired, or invalid. Never throws.
 */
export async function verifySessionToken(token?: string | null): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
    });
    if (typeof payload.userId === "string" && typeof payload.sessionVersion === "number") {
      return {
        userId: payload.userId,
        sessionVersion: payload.sessionVersion,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Creates and sets the session cookie.
 */
export async function createSession(userId: string, sessionVersion: number): Promise<void> {
  const token = await signSessionToken({ userId, sessionVersion });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
}

/**
 * Deletes the session cookie.
 */
export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
