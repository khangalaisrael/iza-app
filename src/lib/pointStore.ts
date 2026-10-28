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
