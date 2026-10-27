import { randomUUID } from "node:crypto";
import { db } from "./db";

export type Role = "customer" | "business" | "runner" | "point" | "admin";
export type Status = "active" | "pending" | "disabled";

export type User = {
  id: string;
  name: string;
  identifier: string;
  role: Role;
  status: Status;
  pointName: string | null;
};

type UserRow = {
  id: string;
  name: string;
  identifier: string;
  password_hash: string;
  role: Role;
  status: Status;
  point_name: string | null;
};

const toUser = (r: UserRow): User => ({
  id: r.id,
  name: r.name,
  identifier: r.identifier,
  role: r.role,
  status: r.status,
  pointName: r.point_name,
});

// An email is kept lowercase. A phone number is kept as digits only, so
// "082 123 4567" is always written one way.
export function normalizeIdentifier(raw: string): string | null {
  const value = raw.trim();
  if (value.includes("@")) {
    const email = value.toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 120 ? email : null;
  }
  const digits = value.replace(/[\s()+-]/g, "");
  return /^\d{9,15}$/.test(digits) ? digits : null;
}

export async function findUserByIdentifier(
  identifier: string,
): Promise<(User & { passwordHash: string }) | undefined> {
  const [row] = await (await db()).query<UserRow>("SELECT * FROM users WHERE identifier = $1", [identifier]);
  return row ? { ...toUser(row), passwordHash: row.password_hash } : undefined;
}

export async function findUserById(id: string): Promise<User | undefined> {
  const [row] = await (await db()).query<UserRow>("SELECT * FROM users WHERE id = $1", [id]);
  return row ? toUser(row) : undefined;
}

export async function createUser(input: {
  name: string;
  identifier: string;
  passwordHash: string;
  role: Role;
  status: Status;
  pointName?: string | null;
}): Promise<User> {
  const id = randomUUID();
  await (
    await db()
  ).query(
    `INSERT INTO users (id, name, identifier, password_hash, role, status, point_name, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [id, input.name, input.identifier, input.passwordHash, input.role, input.status, input.pointName ?? null, Date.now()],
  );
  return (await findUserById(id))!;
}

export async function listPendingUsers(): Promise<User[]> {
  const rows = await (await db()).query<UserRow>("SELECT * FROM users WHERE status = 'pending' ORDER BY created_at");
  return rows.map(toUser);
}

export async function setUserStatus(id: string, status: Status): Promise<void> {
  await (await db()).query("UPDATE users SET status = $1 WHERE id = $2", [status, id]);
}

// Sign-in throttling: five wrong tries in fifteen minutes locks that identifier until the window passes.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 5;

export async function tooManyFailures(identifier: string): Promise<boolean> {
  const [row] = await (
    await db()
  ).query<{ n: number }>("SELECT COUNT(*)::int AS n FROM login_attempts WHERE identifier = $1 AND at > $2", [
    identifier,
    Date.now() - WINDOW_MS,
  ]);
  return row.n >= MAX_FAILS;
}

export async function recordFailure(identifier: string): Promise<void> {
  await (await db()).query("INSERT INTO login_attempts (identifier, at) VALUES ($1, $2)", [identifier, Date.now()]);
}

export async function clearFailures(identifier: string): Promise<void> {
  await (await db()).query("DELETE FROM login_attempts WHERE identifier = $1", [identifier]);
}
