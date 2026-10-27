import { randomInt } from "node:crypto";
import { db } from "./db";
import type { Parcel } from "./parcels";

type Row = {
  code: string;
  owner_id: string | null;
  runner_id: string | null;
  to_name: string;
  pickup: string;
  landmark: string;
  runner: string;
  stage: number;
  point: string;
  lat: number | null;
  lng: number | null;
  plus_code: string | null;
  runner_lat: number | null;
  runner_lng: number | null;
};

function fromRow(r: Row): Parcel {
  return {
    code: r.code,
    to: r.to_name,
    pickup: r.pickup,
    landmark: r.landmark,
    runner: r.runner,
    stage: r.stage,
    point: r.point,
    ...(r.lat !== null && { lat: r.lat }),
    ...(r.lng !== null && { lng: r.lng }),
    ...(r.plus_code !== null && { plusCode: r.plus_code }),
    ...(r.runner_lat !== null && { runnerLat: r.runner_lat }),
    ...(r.runner_lng !== null && { runnerLng: r.runner_lng }),
    ...(r.owner_id !== null && { ownerId: r.owner_id }),
    ...(r.runner_id !== null && { runnerId: r.runner_id }),
  };
}

// Calls stay async so the database can move to a networked one (Postgres) without touching callers.
export async function getParcel(code: string): Promise<Parcel | undefined> {
  const row = db().prepare("SELECT * FROM parcels WHERE code = ?").get(code.trim().toUpperCase()) as Row | undefined;
  return row ? fromRow(row) : undefined;
}

export async function saveParcel(p: Parcel): Promise<void> {
  const now = Date.now();
  db()
    .prepare(
      `INSERT INTO parcels (code, owner_id, runner_id, to_name, pickup, landmark, runner, stage, point, lat, lng, plus_code, runner_lat, runner_lng, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(code) DO UPDATE SET
         owner_id = excluded.owner_id, runner_id = excluded.runner_id, to_name = excluded.to_name,
         pickup = excluded.pickup, landmark = excluded.landmark, runner = excluded.runner,
         stage = excluded.stage, point = excluded.point, lat = excluded.lat, lng = excluded.lng,
         plus_code = excluded.plus_code, runner_lat = excluded.runner_lat, runner_lng = excluded.runner_lng,
         updated_at = excluded.updated_at`,
    )
    .run(
      p.code, p.ownerId ?? null, p.runnerId ?? null, p.to, p.pickup, p.landmark, p.runner, p.stage, p.point,
      p.lat ?? null, p.lng ?? null, p.plusCode ?? null, p.runnerLat ?? null, p.runnerLng ?? null, now, now,
    );
}

// Most recently changed first.
export async function listParcels(): Promise<Parcel[]> {
  const rows = db().prepare("SELECT * FROM parcels ORDER BY updated_at DESC").all() as Row[];
  return rows.map(fromRow);
}

export async function listParcelsFor(ownerId: string): Promise<Parcel[]> {
  const rows = db()
    .prepare("SELECT * FROM parcels WHERE owner_id = ? ORDER BY created_at DESC")
    .all(ownerId) as Row[];
  return rows.map(fromRow);
}

// Six characters from an alphabet without look-alikes (no 0/O, 1/I). About a billion codes,
// so a code can't be guessed by counting upward.
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export async function newParcelCode(): Promise<string> {
  for (;;) {
    let body = "";
    for (let i = 0; i < 6; i++) body += ALPHABET[randomInt(ALPHABET.length)];
    const code = `IZA-${body}`;
    if (!(await getParcel(code))) return code;
  }
}
