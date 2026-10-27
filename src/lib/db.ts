import { mkdirSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { exampleParcels } from "./parcels";
import { hashPasswordSync } from "./password";

// Postgres everywhere, so the SQL is the same on a laptop and in production.
//   DATABASE_URL set  -> a real Postgres (Neon on Vercel, or any other) through the `pg` driver.
//   DATABASE_URL not set -> PGlite, a Postgres that runs inside Node and keeps its files in IZA_DB_DIR
//                          (default data/pglite). For local work and tests only.
export type Db = {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
};

// Times are stored as milliseconds in BIGINT. Compare them inside SQL, never read them back into JS.
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    identifier TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('customer','runner','point','admin')),
    status TEXT NOT NULL CHECK (status IN ('active','pending','disabled')),
    point_name TEXT,
    created_at BIGINT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at BIGINT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS login_attempts (
    identifier TEXT NOT NULL,
    at BIGINT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS login_attempts_idx ON login_attempts (identifier, at)`,
  `CREATE TABLE IF NOT EXISTS parcels (
    code TEXT PRIMARY KEY,
    owner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    runner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    to_name TEXT NOT NULL,
    pickup TEXT NOT NULL,
    landmark TEXT NOT NULL,
    runner TEXT NOT NULL,
    stage INTEGER NOT NULL CHECK (stage BETWEEN 0 AND 4),
    point TEXT NOT NULL,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    plus_code TEXT,
    runner_lat DOUBLE PRECISION,
    runner_lng DOUBLE PRECISION,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS parcels_owner_idx ON parcels (owner_id)`,
  // Where the runner collects it from, shared by the sender as coordinates.
  `ALTER TABLE parcels ADD COLUMN IF NOT EXISTS pickup_lat DOUBLE PRECISION`,
  `ALTER TABLE parcels ADD COLUMN IF NOT EXISTS pickup_lng DOUBLE PRECISION`,
  `ALTER TABLE parcels ADD COLUMN IF NOT EXISTS pickup_plus_code TEXT`,
];

type G = typeof globalThis & { __izaDb?: Promise<Db> };

export function db(): Promise<Db> {
  const g = globalThis as G;
  if (!g.__izaDb) {
    g.__izaDb = open().catch((err) => {
      g.__izaDb = undefined; // let the next request try again
      throw err;
    });
  }
  return g.__izaDb;
}

async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { Pool, types } = await import("pg");
    types.setTypeParser(20, (v) => Number(v)); // BIGINT counts and ids arrive as numbers
    const pool = new Pool({ connectionString: url, max: Number(process.env.PG_POOL_MAX ?? 5) });
    return { query: async (text, params) => (await pool.query(text, params as unknown[])).rows };
  }

  if (process.env.VERCEL) {
    throw new Error("DATABASE_URL is not set. Add a Postgres database to this Vercel project.");
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const dir = process.env.IZA_DB_DIR ?? path.join(process.cwd(), "data", "pglite");
  mkdirSync(/*turbopackIgnore: true*/ path.dirname(dir), { recursive: true });
  const pg = new PGlite(/*turbopackIgnore: true*/ dir);
  await pg.waitReady;
  return { query: async (text, params) => (await pg.query(text, params as unknown[])).rows as never };
}

async function open(): Promise<Db> {
  const d = await connect();
  for (const statement of SCHEMA) await d.query(statement);
  await seedDemo(d);
  return d;
}

// Example parcels and demo accounts are for local work and tests only. They need IZA_SEED_DEMO=1 and a
// password in IZA_SEED_PASSWORD, and never run on a production Vercel deployment.
async function seedDemo(d: Db) {
  if (process.env.IZA_SEED_DEMO !== "1" || process.env.VERCEL_ENV === "production") return;
  const password = process.env.IZA_SEED_PASSWORD;
  if (!password || password.length < 8) {
    console.warn("IZA_SEED_DEMO is set but IZA_SEED_PASSWORD is missing or too short. Skipping demo data.");
    return;
  }

  const [parcels] = await d.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM parcels");
  if (parcels.n === 0) {
    const now = Date.now();
    for (const p of Object.values(exampleParcels)) {
      await d.query(
        `INSERT INTO parcels (code, to_name, pickup, landmark, runner, stage, point, lat, lng, plus_code, runner_lat, runner_lng, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13) ON CONFLICT (code) DO NOTHING`,
        [p.code, p.to, p.pickup, p.landmark, p.runner, p.stage, p.point,
         p.lat ?? null, p.lng ?? null, p.plusCode ?? null, p.runnerLat ?? null, p.runnerLng ?? null, now],
      );
    }
  }

  const [users] = await d.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM users");
  if (users.n > 0) return;

  const hash = hashPasswordSync(password);
  const now = Date.now();
  const ids = { admin: randomUUID(), runner: randomUUID(), point: randomUUID(), customer: randomUUID() };
  const add = (id: string, name: string, identifier: string, role: string, pointName: string | null) =>
    d.query(
      `INSERT INTO users (id, name, identifier, password_hash, role, status, point_name, created_at)
       VALUES ($1,$2,$3,$4,$5,'active',$6,$7) ON CONFLICT (identifier) DO NOTHING`,
      [id, name, identifier, hash, role, pointName, now],
    );
  await add(ids.admin, "Iza team", "admin@iza.test", "admin", null);
  await add(ids.runner, "Sipho", "sipho@iza.test", "runner", null);
  await add(ids.point, "Corner Shop", "cornershop@iza.test", "point", "Corner Shop");
  await add(ids.customer, "Lindiwe", "lindiwe@iza.test", "customer", null);

  await d.query("UPDATE parcels SET owner_id = $1 WHERE to_name = 'Lindiwe' AND owner_id IS NULL", [ids.customer]);
  await d.query("UPDATE parcels SET runner_id = $1 WHERE runner = 'Sipho' AND runner_id IS NULL", [ids.runner]);
}
