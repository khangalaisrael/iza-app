import { randomUUID } from "node:crypto";
import { db } from "./db";

export type Role = "customer" | "runner" | "point" | "admin";
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

export function findUserByIdentifier(identifier: string): (User & { passwordHash: string }) | undefined {
  const row = db().prepare("SELECT * FROM users WHERE identifier = ?").get(identifier) as UserRow | undefined;
  return row ? { ...toUser(row), passwordHash: row.password_hash } : undefined;
}

export function findUserById(id: string): User | undefined {
  const row = db().prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
  return row ? toUser(row) : undefined;
}

export function createUser(input: {
  name: string;
  identifier: string;
  passwordHash: string;
  role: Role;
  status: Status;
  pointName?: string | null;
}): User {
  const id = randomUUID();
  db()
    .prepare(
      "INSERT INTO users (id, name, identifier, password_hash, role, status, point_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .run(id, input.name, input.identifier, input.passwordHash, input.role, input.status, input.pointName ?? null, Date.now());
  return findUserById(id)!;
}

export function listPendingUsers(): User[] {
  const rows = db().prepare("SELECT * FROM users WHERE status = 'pending' ORDER BY created_at").all() as UserRow[];
  return rows.map(toUser);
}

export function setUserStatus(id: string, status: Status) {
  db().prepare("UPDATE users SET status = ? WHERE id = ?").run(status, id);
}

// Sign-in throttling: five wrong tries in fifteen minutes locks that identifier until the window passes.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 5;

export function tooManyFailures(identifier: string): boolean {
  const row = db()
    .prepare("SELECT COUNT(*) AS n FROM login_attempts WHERE identifier = ? AND at > ?")
    .get(identifier, Date.now() - WINDOW_MS) as { n: number };
  return row.n >= MAX_FAILS;
}

export function recordFailure(identifier: string) {
  db().prepare("INSERT INTO login_attempts (identifier, at) VALUES (?, ?)").run(identifier, Date.now());
}

export function clearFailures(identifier: string) {
  db().prepare("DELETE FROM login_attempts WHERE identifier = ?").run(identifier);
}
