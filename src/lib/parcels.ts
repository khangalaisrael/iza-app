import { t, type Lang } from "./i18n";
import { encodePlusCode } from "./pluscode";
import { FALLBACK_DESTINATION, type LatLng } from "./geo";

export const STAGES = [
  "Booked",
  "Picked up",
  "At the Izza point",
  "On the way",
  "Delivered",
] as const;

export const LAST_STAGE = STAGES.length - 1;

// What the sender pays to get a parcel to the Izza point, and what the customer pays in all if they
// want it brought to their door instead of collecting it.
export const FEE_POINT = 20;
export const FEE_DOOR = 35;
export const FEE_DOOR_EXTRA = FEE_DOOR - FEE_POINT;

// What a runner earns: R5 for each collection they finish, and the customer's R15 door fee for each delivery.
export const PAY_COLLECT = 5;
export const PAY_DELIVERY = FEE_DOOR_EXTRA;

export type Choice = "point" | "door";

export type Step = {
  stage: number; // which of the five stages this step is
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
  point: string; // the Izza point the parcel waits at (its name)
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
  dropoff?: Dropoff; // how it gets to the hub: the sender brings it, or a runner collects it
  senderKind?: "business" | "customer";
  accessKey?: string; // the secret in the receiver's link. The short code alone shows status; the key unlocks the delivery code and the choice
  cancelledAt?: number; // the sender cancelled it before a runner collected it
  paidAt?: number; // when the sender paid FEE_POINT (business or customer sending); unset means still owing
  paidBy?: string; // who took the sender's cash
  doorPaidAt?: number; // when the receiving customer paid FEE_DOOR_EXTRA to the runner (door delivery only)
  createdAt?: number;
  updatedAt?: number;
};

export type Dropoff = "self" | "runner";

// A parcel is a runner's collection job only when the sender asked for a runner.
// Izza does not collect from senders. The sender takes the parcel to the hub they chose, and Izza's work starts there, so no parcel is
// ever a runner's collection job. (This stays as a function so the places that ask are easy to find.)
export const needsCollection = (_p: Parcel) => false;

export const NO_RUNNER = "Not assigned yet";

// The sender did not know where the receiver is, so they chose "to their door" and the receiver pins the place themselves.
export const awaitingAddress = (p: Parcel) => p.choice === "door" && !p.landmark && p.lat === undefined;

// A door delivery a runner can take: it is waiting at the Izza point and the receiver has said where to bring it.
export const doorReady = (p: Parcel) => p.stage === 2 && p.choice === "door" && !awaitingAddress(p);

// These three take the language the person reads, and default to English (the team's screens stay in English).
export function statusOf(p: Parcel, lang: Lang = "en"): string {
  if (p.cancelledAt) return t(lang, "Cancelled");
  if (p.stage === 2 && awaitingAddress(p)) return t(lang, "Waiting for their address");
  if (p.stage === 2 && p.choice === "door") return t(lang, "Waiting for a runner");
  return t(lang, STAGES[p.stage]);
}

export function etaOf(p: Parcel, lang: Lang = "en"): string {
  if (p.cancelledAt) return t(lang, "This parcel was cancelled");
  switch (p.stage) {
    case 0:
      return t(lang, "Waiting to be brought to {point}", { point: p.point });
    case 1:
      return t(lang, "On its way to {point}", { point: p.point });
    case 2:
      if (awaitingAddress(p)) return t(lang, "Tell us where to bring it");
      if (p.choice === "door") return t(lang, "A runner will bring it to your door");
      if (p.choice === "point") return t(lang, "Ready to collect at {point}", { point: p.point });
      return t(lang, "It's at {point}. Choose how you want it.", { point: p.point });
    case 3:
      return t(lang, "About 15 minutes");
    default:
      return t(lang, "Delivered. Enkosi!");
  }
}

function detailFor(p: Parcel, i: number, lang: Lang): string {
  switch (i) {
    case 0:
      return t(lang, "Waiting to be brought to {point}", { point: p.point });
    case 1:
      return t(lang, p.runner === NO_RUNNER || p.stage < 1 ? "A runner will collect it" : "A local runner collected it");
    case 2:
      return p.point;
    case 3:
      return t(lang, "A local runner is carrying it to you");
    default:
      return t(lang, p.choice === "door" ? "Show your code at the door" : "Show your code at the counter");
  }
}

// The "On the way" step only exists when the customer wants it at their door.
export function stepsOf(p: Parcel, lang: Lang = "en"): Step[] {
  return STAGES.map((title, i) => ({ title, i }))
    .filter(({ i }) => i !== 1 && !(i === 3 && p.choice === "point"))
    .map(({ title, i }) => ({
      stage: i,
      title: t(lang, title),
      detail: detailFor(p, i, lang),
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

// The customer's door if they chose it, otherwise the Izza point (pass its position in).
export function destinationOf(p: Parcel, point?: LatLng): LatLng {
  if (p.choice === "door" && p.lat !== undefined && p.lng !== undefined) return { lat: p.lat, lng: p.lng };
  return point ?? FALLBACK_DESTINATION;
}

export function runnerPositionOf(p: Parcel): LatLng | undefined {
  return p.runnerLat !== undefined && p.runnerLng !== undefined
    ? { lat: p.runnerLat, lng: p.runnerLng }
    : undefined;
}
