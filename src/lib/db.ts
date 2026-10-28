import { mkdirSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { exampleParcels } from "./parcels";
import { points as seedPoints } from "./points";
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

  // A business sends, the customer chooses how to receive it, runners and Iza points do the work.
  `ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`,
  `ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('customer','business','runner','point','admin'))`,
  `CREATE TABLE IF NOT EXISTS points (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    kind TEXT NOT NULL,
    address TEXT NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    hours TEXT NOT NULL,
    phone TEXT,
    owner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    status TEXT NOT NULL CHECK (status IN ('pending','approved','rejected')),
    created_at BIGINT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS points_status_idx ON points (status)`,
  `ALTER TABLE parcels ADD COLUMN IF NOT EXISTS recipient_phone TEXT`,
  `ALTER TABLE parcels ADD COLUMN IF NOT EXISTS point_id TEXT`,
  `ALTER TABLE parcels ADD COLUMN IF NOT EXISTS choice TEXT`,
  `ALTER TABLE parcels ADD COLUMN IF NOT EXISTS fee INTEGER`,
  `ALTER TABLE parcels ADD COLUMN IF NOT EXISTS size TEXT`,
  `ALTER TABLE parcels ADD COLUMN IF NOT EXISTS note TEXT`,

  // The customer reads this 4-digit code out at the door. A parcel cannot be marked delivered without it.
  `ALTER TABLE parcels ADD COLUMN IF NOT EXISTS delivery_pin TEXT`,
  `ALTER TABLE parcels ADD COLUMN IF NOT EXISTS dropoff TEXT`,
  `ALTER TABLE parcels ADD COLUMN IF NOT EXISTS sender_kind TEXT`,
  // Cash payments: when the fee was received and by whom.
  `ALTER TABLE parcels ADD COLUMN IF NOT EXISTS paid_at BIGINT`,
  `ALTER TABLE parcels ADD COLUMN IF NOT EXISTS paid_by TEXT`,
  // The customer's R8 for door delivery, paid to the runner at the door.
  `ALTER TABLE parcels ADD COLUMN IF NOT EXISTS door_paid_at BIGINT`,
  // Every step a runner takes leaves a line here. Tracking pages are just this list.
  `CREATE TABLE IF NOT EXISTS parcel_events (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL REFERENCES parcels(code) ON DELETE CASCADE,
    at BIGINT NOT NULL,
    kind TEXT NOT NULL,
    text TEXT NOT NULL,
    actor TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS parcel_events_code_idx ON parcel_events (code, at)`,
  // Runner earnings are counted from finished steps, so each event remembers who did it.
  `ALTER TABLE parcel_events ADD COLUMN IF NOT EXISTS actor_id TEXT`,
  // When the team pays a runner what they have earned.
  `CREATE TABLE IF NOT EXISTS runner_payouts (
    id TEXT PRIMARY KEY,
    runner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL CHECK (amount > 0),
    at BIGINT NOT NULL,
    paid_by TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS runner_payouts_idx ON runner_payouts (runner_id)`,
  // One-time links the team gives to someone who forgot their password. Only the hash of the token is kept.
  `CREATE TABLE IF NOT EXISTS password_resets (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at BIGINT NOT NULL
  )`,
  // A photo of the parcel at the door, taken by the runner as proof of delivery.
  `CREATE TABLE IF NOT EXISTS parcel_photos (
    code TEXT PRIMARY KEY REFERENCES parcels(code) ON DELETE CASCADE,
    image TEXT NOT NULL,
    at BIGINT NOT NULL,
    taken_by TEXT
  )`,
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

  const [users] = await d.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM users");
  if (users.n > 0) return;

  const hash = hashPasswordSync(password);
  const now = Date.now();
  const ids = {
    admin: randomUUID(),
    runner: randomUUID(),
    point: randomUUID(),
    customer: randomUUID(),
    business: randomUUID(),
  };
  const add = (id: string, name: string, identifier: string, role: string, pointName: string | null) =>
    d.query(
      `INSERT INTO users (id, name, identifier, password_hash, role, status, point_name, created_at)
       VALUES ($1,$2,$3,$4,$5,'active',$6,$7) ON CONFLICT (identifier) DO NOTHING`,
      [id, name, identifier, hash, role, pointName, now],
    );
  await add(ids.admin, "Iza team", "admin@iza.test", "admin", null);
  await add(ids.runner, "Sipho", "sipho@iza.test", "runner", null);
  await add(ids.point, "Corner Shop", "cornershop@iza.test", "point", "Corner Shop");
  await add(ids.customer, "Lindiwe", "0823456789", "customer", null);
  await add(ids.business, "Thembi's Kitchen", "thembi@iza.test", "business", null);

  // The three example Iza points, all approved. Corner Shop belongs to its demo owner.
  const kinds: Record<string, string> = { hub: "Iza hub", shop: "Spaza shop" };
  for (const p of seedPoints) {
    await d.query(
      `INSERT INTO points (id, name, kind, address, lat, lng, hours, owner_id, status, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'approved',$9) ON CONFLICT (id) DO NOTHING`,
      [p.code, p.name, p.name === "Fresh Cuts Barber" ? "Salon and barber" : kinds[p.kind], `${p.name}, ${p.area}`, p.lat, p.lng, p.hours, p.name === "Corner Shop" ? ids.point : null, now],
    );
  }

  const [parcels] = await d.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM parcels");
  if (parcels.n === 0) {
    for (const p of Object.values(exampleParcels)) {
      await d.query(
        `INSERT INTO parcels (code, owner_id, runner_id, to_name, pickup, landmark, runner, stage, point, point_id, choice, fee, recipient_phone,
           lat, lng, plus_code, runner_lat, runner_lng, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$19) ON CONFLICT (code) DO NOTHING`,
        [p.code, ids.business, p.runner === "Sipho" ? ids.runner : null, p.to, p.pickup, p.landmark, p.runner, p.stage, p.point,
         p.pointId ?? null, p.choice ?? null, p.fee ?? null, p.recipientPhone ?? null,
         p.lat ?? null, p.lng ?? null, p.plusCode ?? null, p.runnerLat ?? null, p.runnerLng ?? null, now],
      );
    }
  }
  await d.query("UPDATE parcels SET delivery_pin = '1234' WHERE delivery_pin IS NULL");
}
