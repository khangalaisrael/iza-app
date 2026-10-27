import { encodePlusCode } from "./pluscode";
import { FALLBACK_DESTINATION, type LatLng } from "./geo";

export const STAGES = [
  "Booked",
  "Picked up",
  "At the Iza point",
  "On the way",
  "Delivered",
] as const;

export const LAST_STAGE = STAGES.length - 1;

// What the sender pays to get a parcel to the Iza point, and what the customer pays in all if they
// want it brought to their door instead of collecting it.
export const FEE_POINT = 12;
export const FEE_DOOR = 20;
export const FEE_DOOR_EXTRA = FEE_DOOR - FEE_POINT;

export type Choice = "point" | "door";

export type Step = {
  title: string;
  detail: string;
  state: "done" | "now" | "next";
};

export type Parcel = {
  code: string;
  to: string; // who it is for
  recipientPhone?: string; // their WhatsApp number, digits only
  pickup: string; // where the runner collects it, in words
  landmark: string; // where it goes if the customer chooses door delivery
  runner: string;
  stage: number; // index into STAGES
  point: string; // the Iza point the parcel waits at (its name)
  pointId?: string;
  choice?: Choice; // set by the customer once the parcel is at the point
  fee?: number;
  size?: string;
  note?: string;
  lat?: number; // the customer's door, if they chose door delivery
  lng?: number;
  plusCode?: string;
  runnerLat?: number; // live position, set while the runner is on the way
  runnerLng?: number;
  pickupLat?: number; // where the runner collects it from
  pickupLng?: number;
  pickupPlusCode?: string;
  deliveryPin?: string; // 4 digits the customer reads out to the runner at the door
  ownerId?: string; // the business that sent it
  runnerId?: string; // the runner who claimed it
};

export const NO_RUNNER = "Not assigned yet";

export function statusOf(p: Parcel): string {
  if (p.stage === 2 && p.choice === "door") return "Waiting for a runner";
  return STAGES[p.stage];
}

export function etaOf(p: Parcel): string {
  switch (p.stage) {
    case 0:
      return "A runner will collect it today";
    case 1:
      return `On its way to ${p.point}`;
    case 2:
      if (p.choice === "door") return "A runner will bring it to your door";
      if (p.choice === "point") return `Ready to collect at ${p.point}`;
      return `It's at ${p.point}. Choose how you want it.`;
    case 3:
      return "About 15 minutes";
    default:
      return "Delivered. Enkosi!";
  }
}

function detailFor(p: Parcel, i: number): string {
  switch (i) {
    case 0:
      return `Pickup: ${p.pickup}`;
    case 1:
      return p.runner === NO_RUNNER || p.stage < 1 ? "A runner will collect it" : "A local runner collected it";
    case 2:
      return p.point;
    case 3:
      return "A local runner is carrying it to you";
    default:
      return p.choice === "door" ? "Show your code at the door" : "Show your code at the counter";
  }
}

// The "On the way" step only exists when the customer wants it at their door.
export function stepsOf(p: Parcel): Step[] {
  return STAGES.map((title, i) => ({ title, i }))
    .filter(({ i }) => !(i === 3 && p.choice === "point"))
    .map(({ title, i }) => ({
      title,
      detail: detailFor(p, i),
      state: (i < p.stage || (i === p.stage && i === LAST_STAGE) ? "done" : i === p.stage ? "now" : "next") as Step["state"],
    }));
}

// Example data for local work and tests. Never created in production.
export const exampleParcels: Record<string, Parcel> = {
  "IZA-4821": {
    code: "IZA-4821",
    to: "Lindiwe",
    recipientPhone: "0823456789",
    pickup: "Thembi's Kitchen",
    landmark: "Blue gate by the Engen, Main Rd",
    runner: "Sipho",
    stage: 3,
    point: "Corner Shop",
    pointId: "LANGA-CORNER-02",
    choice: "door",
    fee: FEE_DOOR,
    deliveryPin: "7305",
    lat: -33.9432,
    lng: 18.533,
    plusCode: encodePlusCode(-33.9432, 18.533),
    runnerLat: -33.9441,
    runnerLng: 18.5296,
  },
  "IZA-4825": {
    code: "IZA-4825",
    to: "Lindiwe",
    recipientPhone: "0823456789",
    pickup: "PAXI point, PEP",
    landmark: "",
    runner: "Thabo",
    stage: 2,
    point: "Corner Shop",
    pointId: "LANGA-CORNER-02",
    fee: FEE_POINT,
  },
  "IZA-4830": {
    code: "IZA-4830",
    to: "Ayanda",
    recipientPhone: "0715550100",
    pickup: "Fresh Cuts Barber",
    landmark: "",
    runner: NO_RUNNER,
    stage: 0,
    point: "Corner Shop",
    pointId: "LANGA-CORNER-02",
    fee: FEE_POINT,
  },
};

// The customer's door if they chose it, otherwise the Iza point (pass its position in).
export function destinationOf(p: Parcel, point?: LatLng): LatLng {
  if (p.choice === "door" && p.lat !== undefined && p.lng !== undefined) return { lat: p.lat, lng: p.lng };
  return point ?? FALLBACK_DESTINATION;
}

export function runnerPositionOf(p: Parcel): LatLng | undefined {
  return p.runnerLat !== undefined && p.runnerLng !== undefined
    ? { lat: p.runnerLat, lng: p.runnerLng }
    : undefined;
}
