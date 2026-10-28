import { db } from "./db";
import { hashToken, newToken } from "./password";

const RESET_HOURS = 2;

// The team makes a link for someone who forgot their password. A new link replaces any older one for that person.
export async function createReset(userId: string): Promise<string> {
  const d = await db();
  const token = newToken();
  await d.query("DELETE FROM password_resets WHERE user_id = $1 OR expires_at <= $2", [userId, Date.now()]);
  await d.query("INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES ($1, $2, $3)", [
    hashToken(token),
    userId,
    Date.now() + RESET_HOURS * 60 * 60 * 1000,
  ]);
  return token;
}

export async function resetIsValid(token: string): Promise<boolean> {
  const [row] = await (
    await db()
  ).query<{ n: number }>("SELECT COUNT(*)::int AS n FROM password_resets WHERE token_hash = $1 AND expires_at > $2", [
    hashToken(token),
    Date.now(),
  ]);
  return row.n > 0;
}

// Uses the link up. Returns who it was for, or nothing if the link is wrong, used or old.
export async function consumeReset(token: string): Promise<string | undefined> {
  const [row] = await (
    await db()
  ).query<{ user_id: string }>("DELETE FROM password_resets WHERE token_hash = $1 AND expires_at > $2 RETURNING user_id", [
    hashToken(token),
    Date.now(),
  ]);
  return row?.user_id;
}

// Sets the new password and signs the person out everywhere else, in case someone else had the old one.
export async function setPassword(userId: string, passwordHash: string): Promise<void> {
  const d = await db();
  await d.query("UPDATE users SET password_hash = $1 WHERE id = $2", [passwordHash, userId]);
  await d.query("DELETE FROM sessions WHERE user_id = $1", [userId]);
}

// Someone says they forgot their password. One open request per person, and the newest time wins.
export async function addResetRequest(userId: string): Promise<void> {
  await (
    await db()
  ).query(
    'INSERT INTO reset_requests (user_id, at) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET at = EXCLUDED.at',
    [userId, Date.now()],
  );
}

export type ResetRequest = { userId: string; name: string; identifier: string; role: string; at: number };

export async function listResetRequests(): Promise<ResetRequest[]> {
  return (
    await db()
  ).query<ResetRequest>(
    'SELECT u.id AS "userId", u.name, u.identifier, u.role, r.at FROM reset_requests r JOIN users u ON u.id = r.user_id ORDER BY r.at DESC',
  );
}

export async function clearResetRequest(userId: string): Promise<void> {
  await (await db()).query('DELETE FROM reset_requests WHERE user_id = $1', [userId]);
}
