import { randomUUID } from "node:crypto";
import { db } from "./db";

export const POINT_KINDS = [
  "Spaza shop",
  "Petrol station shop",
  "Pharmacy",
  "Salon and barber",
  "Community hall",
  "Res reception",
  "Izza hub",
] as const;

export type PointStatus = "pending" | "approved" | "rejected";

export type IzaPoint = {
  id: string;
  name: string;
  kind: string;
  address: string;
  lat: number;
  lng: number;
  hours: string;
  phone: string | null;
  ownerId: string | null;
  status: PointStatus;
};

type Row = {
  id: string;
  name: string;
  kind: string;
  address: string;
  lat: number;
  lng: number;
  hours: string;
  phone: string | null;
  owner_id: string | null;
  status: PointStatus;
};

const fromRow = (r: Row): IzaPoint => ({
  id: r.id,
  name: r.name,
  kind: r.kind,
  address: r.address,
  lat: r.lat,
  lng: r.lng,
  hours: r.hours,
  phone: r.phone,
  ownerId: r.owner_id,
  status: r.status,
});

// Only approved points are ever shown to the public.
export async function listApprovedPoints(): Promise<IzaPoint[]> {
  const rows = await (await db()).query<Row>("SELECT * FROM points WHERE status = 'approved' ORDER BY name");
  return rows.map(fromRow);
}

export async function listPendingPoints(): Promise<IzaPoint[]> {
  const rows = await (await db()).query<Row>("SELECT * FROM points WHERE status = 'pending' ORDER BY created_at");
  return rows.map(fromRow);
}

export async function getPointById(id: string): Promise<IzaPoint | undefined> {
  const [row] = await (await db()).query<Row>("SELECT * FROM points WHERE id = $1", [id]);
  return row ? fromRow(row) : undefined;
}

export async function getPointByOwner(ownerId: string): Promise<IzaPoint | undefined> {
  const [row] = await (await db()).query<Row>("SELECT * FROM points WHERE owner_id = $1", [ownerId]);
  return row ? fromRow(row) : undefined;
}

export async function createPoint(input: {
  name: string;
  kind: string;
  address: string;
  lat: number;
  lng: number;
  hours: string;
  phone?: string | null;
  ownerId: string | null;
  status?: PointStatus;
}): Promise<IzaPoint> {
  const id = randomUUID();
  await (
    await db()
  ).query(
    `INSERT INTO points (id, name, kind, address, lat, lng, hours, phone, owner_id, status, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [id, input.name, input.kind, input.address, input.lat, input.lng, input.hours, input.phone ?? null, input.ownerId, input.status ?? "pending", Date.now()],
  );
  return (await getPointById(id))!;
}

// Approving or turning down the person who applied does the same to their place.
export async function setPointStatusForOwner(ownerId: string, status: "approved" | "rejected"): Promise<void> {
  await (await db()).query("UPDATE points SET status = $1 WHERE owner_id = $2", [status, ownerId]);
}

// The team can rename a place or change its hours. Parcels keep the name they were booked with in plain text, so those follow the new
// name too and a customer is never told to go to a place that no longer has that name.
export async function updatePoint(id: string, input: { name: string; hours: string }): Promise<void> {
  const d = await db();
  await d.query("UPDATE points SET name = $1, hours = $2 WHERE id = $3", [input.name, input.hours, id]);
  await d.query("UPDATE parcels SET point = $1 WHERE point_id = $2", [input.name, id]);
}

// A place with parcels still on their way cannot be deleted: someone is going to or collecting from it. Finished and cancelled
// parcels keep the name they had, in plain text, and just lose the link to the place.
export async function deletePoint(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const d = await db();
  const [row] = await d.query<{ n: string | number }>("SELECT count(*) AS n FROM parcels WHERE point_id = $1 AND stage < 4 AND cancelled_at IS NULL", [id]);
  if (Number(row?.n ?? 0) > 0) return { ok: false, error: "Parcels are still on their way to or waiting at this place. Finish or cancel them first." };
  await d.query("UPDATE parcels SET point_id = NULL WHERE point_id = $1", [id]);
  await d.query("DELETE FROM points WHERE id = $1", [id]);
  return { ok: true };
}
