import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { exampleParcels } from "./parcels";
import { hashPasswordSync } from "./password";

// SQLite built into Node. One file, no server to run. Before going online, move this
// layer to Postgres: only db.ts, store.ts and users.ts talk to the database.
const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  identifier TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('customer','runner','point','admin')),
  status TEXT NOT NULL CHECK (status IN ('active','pending','disabled')),
  point_name TEXT,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS login_attempts (
  identifier TEXT NOT NULL,
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS login_attempts_idx ON login_attempts (identifier, at);
CREATE TABLE IF NOT EXISTS parcels (
  code TEXT PRIMARY KEY,
  owner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  runner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  to_name TEXT NOT NULL,
  pickup TEXT NOT NULL,
  landmark TEXT NOT NULL,
  runner TEXT NOT NULL,
  stage INTEGER NOT NULL CHECK (stage BETWEEN 0 AND 4),
  point TEXT NOT NULL,
  lat REAL,
  lng REAL,
  plus_code TEXT,
  runner_lat REAL,
  runner_lng REAL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS parcels_owner_idx ON parcels (owner_id);
`;

type G = typeof globalThis & { __izaDb?: DatabaseSync };

export function db(): DatabaseSync {
  const g = globalThis as G;
  if (!g.__izaDb) g.__izaDb = open();
  return g.__izaDb;
}

function open(): DatabaseSync {
  const file = process.env.IZA_DB_FILE ?? path.join(process.cwd(), "data", "iza.db");
  mkdirSync(/*turbopackIgnore: true*/ path.dirname(file), { recursive: true });
  const d = new DatabaseSync(file);
  d.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  d.exec(SCHEMA);
  seedExamples(d);
  seedDemoUsers(d);
  return d;
}

function seedExamples(d: DatabaseSync) {
  const count = d.prepare("SELECT COUNT(*) AS n FROM parcels").get() as { n: number };
  if (count.n > 0) return;
  const now = Date.now();
  const insert = d.prepare(
    `INSERT INTO parcels (code, to_name, pickup, landmark, runner, stage, point, lat, lng, plus_code, runner_lat, runner_lng, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const p of Object.values(exampleParcels)) {
    insert.run(
      p.code, p.to, p.pickup, p.landmark, p.runner, p.stage, p.point,
      p.lat ?? null, p.lng ?? null, p.plusCode ?? null, p.runnerLat ?? null, p.runnerLng ?? null, now, now,
    );
  }
}

// Demo accounts for local work and tests only. Needs IZA_SEED_DEMO=1 and a password in
// IZA_SEED_PASSWORD, and never runs on a production Vercel deployment.
function seedDemoUsers(d: DatabaseSync) {
  if (process.env.IZA_SEED_DEMO !== "1" || process.env.VERCEL_ENV === "production") return;
  const password = process.env.IZA_SEED_PASSWORD;
  if (!password || password.length < 8) {
    console.warn("IZA_SEED_DEMO is set but IZA_SEED_PASSWORD is missing or too short. Skipping demo accounts.");
    return;
  }
  const users = d.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number };
  if (users.n > 0) return;

  const hash = hashPasswordSync(password);
  const now = Date.now();
  const insert = d.prepare(
    "INSERT OR IGNORE INTO users (id, name, identifier, password_hash, role, status, point_name, created_at) VALUES (?, ?, ?, ?, ?, 'active', ?, ?)",
  );
  const ids = { admin: randomUUID(), runner: randomUUID(), point: randomUUID(), customer: randomUUID() };
  insert.run(ids.admin, "Iza team", "admin@iza.test", hash, "admin", null, now);
  insert.run(ids.runner, "Sipho", "sipho@iza.test", hash, "runner", null, now);
  insert.run(ids.point, "Corner Shop", "cornershop@iza.test", hash, "point", "Corner Shop", now);
  insert.run(ids.customer, "Lindiwe", "lindiwe@iza.test", hash, "customer", null, now);

  d.prepare("UPDATE parcels SET owner_id = ? WHERE to_name = 'Lindiwe' AND owner_id IS NULL").run(ids.customer);
  d.prepare("UPDATE parcels SET runner_id = ? WHERE runner = 'Sipho' AND runner_id IS NULL").run(ids.runner);
}
