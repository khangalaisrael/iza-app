import { randomInt, randomUUID } from "node:crypto";
import { db } from "./db";
import type { Choice, Parcel } from "./parcels";

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
  pickup_lat: number | null;
  pickup_lng: number | null;
  pickup_plus_code: string | null;
  recipient_phone: string | null;
  point_id: string | null;
  choice: string | null;
  fee: number | null;
  size: string | null;
  note: string | null;
  delivery_pin: string | null;
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
    ...(r.pickup_lat !== null && { pickupLat: r.pickup_lat }),
    ...(r.pickup_lng !== null && { pickupLng: r.pickup_lng }),
    ...(r.pickup_plus_code !== null && { pickupPlusCode: r.pickup_plus_code }),
    ...(r.recipient_phone !== null && { recipientPhone: r.recipient_phone }),
    ...(r.point_id !== null && { pointId: r.point_id }),
    ...(r.choice !== null && { choice: r.choice as Choice }),
    ...(r.fee !== null && { fee: r.fee }),
    ...(r.size !== null && { size: r.size }),
    ...(r.note !== null && { note: r.note }),
    ...(r.delivery_pin !== null && { deliveryPin: r.delivery_pin }),
    ...(r.owner_id !== null && { ownerId: r.owner_id }),
    ...(r.runner_id !== null && { runnerId: r.runner_id }),
  };
}

export async function getParcel(code: string): Promise<Parcel | undefined> {
  const [row] = await (await db()).query<Row>("SELECT * FROM parcels WHERE code = $1", [code.trim().toUpperCase()]);
  return row ? fromRow(row) : undefined;
}

export async function saveParcel(p: Parcel): Promise<void> {
  const now = Date.now();
  await (
    await db()
  ).query(
    `INSERT INTO parcels (code, owner_id, runner_id, to_name, pickup, landmark, runner, stage, point,
       lat, lng, plus_code, runner_lat, runner_lng, pickup_lat, pickup_lng, pickup_plus_code,
       recipient_phone, point_id, choice, fee, size, note, delivery_pin, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$25)
     ON CONFLICT (code) DO UPDATE SET
       owner_id = EXCLUDED.owner_id, runner_id = EXCLUDED.runner_id, to_name = EXCLUDED.to_name,
       pickup = EXCLUDED.pickup, landmark = EXCLUDED.landmark, runner = EXCLUDED.runner,
       stage = EXCLUDED.stage, point = EXCLUDED.point, lat = EXCLUDED.lat, lng = EXCLUDED.lng,
       plus_code = EXCLUDED.plus_code, runner_lat = EXCLUDED.runner_lat, runner_lng = EXCLUDED.runner_lng,
       pickup_lat = EXCLUDED.pickup_lat, pickup_lng = EXCLUDED.pickup_lng, pickup_plus_code = EXCLUDED.pickup_plus_code,
       recipient_phone = EXCLUDED.recipient_phone, point_id = EXCLUDED.point_id, choice = EXCLUDED.choice,
       fee = EXCLUDED.fee, size = EXCLUDED.size, note = EXCLUDED.note, delivery_pin = EXCLUDED.delivery_pin,
       updated_at = EXCLUDED.updated_at`,
    [
      p.code, p.ownerId ?? null, p.runnerId ?? null, p.to, p.pickup, p.landmark, p.runner, p.stage, p.point,
      p.lat ?? null, p.lng ?? null, p.plusCode ?? null, p.runnerLat ?? null, p.runnerLng ?? null,
      p.pickupLat ?? null, p.pickupLng ?? null, p.pickupPlusCode ?? null,
      p.recipientPhone ?? null, p.pointId ?? null, p.choice ?? null, p.fee ?? null, p.size ?? null, p.note ?? null,
      p.deliveryPin ?? null, now,
    ],
  );
}

// Most recently changed first.
export async function listParcels(): Promise<Parcel[]> {
  const rows = await (await db()).query<Row>("SELECT * FROM parcels ORDER BY updated_at DESC");
  return rows.map(fromRow);
}

// A business sees what it sent.
export async function listParcelsFor(ownerId: string): Promise<Parcel[]> {
  const rows = await (
    await db()
  ).query<Row>("SELECT * FROM parcels WHERE owner_id = $1 ORDER BY created_at DESC", [ownerId]);
  return rows.map(fromRow);
}

// A customer sees what is addressed to their WhatsApp number.
export async function listParcelsToPhone(phone: string): Promise<Parcel[]> {
  const rows = await (
    await db()
  ).query<Row>("SELECT * FROM parcels WHERE recipient_phone = $1 ORDER BY created_at DESC", [phone]);
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

// ---- Updates ("events"): every step a runner takes leaves a line the customer and business can read ----

export type ParcelEvent = { id: string; at: number; kind: string; text: string; actor: string | null };

export async function addEvent(code: string, kind: string, text: string, actor: string | null): Promise<void> {
  await (
    await db()
  ).query("INSERT INTO parcel_events (id, code, at, kind, text, actor) VALUES ($1, $2, $3, $4, $5, $6)", [
    randomUUID(),
    code,
    Date.now(),
    kind,
    text,
    actor,
  ]);
}

// Newest first.
export async function listEvents(code: string): Promise<ParcelEvent[]> {
  return (
    await db()
  ).query<ParcelEvent>("SELECT id, at, kind, text, actor FROM parcel_events WHERE code = $1 ORDER BY at DESC", [code]);
}

// Four digits, never starting a run of the same number, so they are not guessed by accident.
export function newDeliveryPin(): string {
  for (;;) {
    const pin = String(randomInt(1000, 10000));
    if (!/^(\d)\1{3}$/.test(pin)) return pin;
  }
}
