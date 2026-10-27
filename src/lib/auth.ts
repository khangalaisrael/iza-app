import { cache } from "react";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { db } from "./db";
import { hashToken, newToken } from "./password";
import { findUserById, type Role, type User } from "./users";

export const SESSION_COOKIE = "iza_session";
const SESSION_DAYS = 30;

export async function startSession(userId: string): Promise<void> {
  const token = newToken();
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  await (
    await db()
  ).query("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)", [
    hashToken(token),
    userId,
    Date.now() + maxAge * 1000,
  ]);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true, // page scripts can't read it
    sameSite: "lax", // not sent on cross-site form posts
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await (await db()).query("DELETE FROM sessions WHERE token_hash = $1", [hashToken(token)]);
  jar.delete(SESSION_COOKIE);
}

async function userForToken(token: string | undefined): Promise<User | null> {
  if (!token) return null;
  const d = await db();
  const hash = hashToken(token);
  // Expiry is checked in SQL, so the database's rows decide, not a clock read in JS.
  const [row] = await d.query<{ user_id: string }>(
    "SELECT user_id FROM sessions WHERE token_hash = $1 AND expires_at > $2",
    [hash, Date.now()],
  );
  if (!row) {
    await d.query("DELETE FROM sessions WHERE token_hash = $1 AND expires_at <= $2", [hash, Date.now()]);
    return null;
  }
  const user = await findUserById(row.user_id);
  return user && user.status !== "disabled" ? user : null;
}

// Cached for the length of one request, so many components can ask without repeating the lookup.
export const currentUser = cache(async (): Promise<User | null> => {
  await connection(); // sessions expire by the clock, so this must run per request, not at build
  return userForToken((await cookies()).get(SESSION_COOKIE)?.value);
});

// For API routes, which read the cookie off the request.
export async function userFromRequest(request: Request): Promise<User | null> {
  const header = request.headers.get("cookie") ?? "";
  const match = header.split(/;\s*/).find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  return userForToken(match?.slice(SESSION_COOKIE.length + 1));
}

// Pages: send people to sign in, to the waiting page, or home. Admin may open every page.
export async function requireUser(roles?: Role[], next = "/"): Promise<User> {
  const user = await currentUser();
  if (!user) redirect(`/signin?next=${encodeURIComponent(next)}`);
  if (user.status !== "active") redirect("/pending");
  if (roles && user.role !== "admin" && !roles.includes(user.role)) redirect("/");
  return user;
}

// Only follow redirects that stay on this site.
export function safeNext(value: FormDataEntryValue | string | null | undefined): string {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : "/";
}

// API routes: refuse writes that come from another website.
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // same-site fetches and non-browser clients send none
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}
