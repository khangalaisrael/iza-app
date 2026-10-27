import { promises as fs } from "node:fs";
import path from "node:path";
import { exampleParcels, type Parcel } from "./parcels";

// Local JSON file store so bookings survive a restart during development.
// Swap for a real database (Postgres) before deploying: files don't persist on Vercel.
const FILE = path.join(process.cwd(), "data", "parcels.json");

async function readSaved(): Promise<Record<string, Parcel>> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8"));
  } catch {
    return {};
  }
}

export async function saveParcel(parcel: Parcel): Promise<void> {
  const all = await readSaved();
  all[parcel.code] = parcel;
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(all, null, 2));
}

export async function getParcel(code: string): Promise<Parcel | undefined> {
  const clean = code.trim().toUpperCase();
  return (await readSaved())[clean] ?? exampleParcels[clean];
}

// Saved parcels (new bookings and any changed example) first, then untouched examples.
export async function listParcels(): Promise<Parcel[]> {
  const saved = await readSaved();
  const untouched = Object.values(exampleParcels).filter((p) => !saved[p.code]);
  return [...Object.values(saved).reverse(), ...untouched];
}
