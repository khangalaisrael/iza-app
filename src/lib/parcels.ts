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

export type Step = {
  title: string;
  detail: string;
  state: "done" | "now" | "next";
};

export type Parcel = {
  code: string;
  to: string;
  pickup: string;
  landmark: string;
  runner: string;
  stage: number; // index into STAGES
  point: string; // the Iza point the parcel waits at
  lat?: number;
  lng?: number;
  plusCode?: string;
  runnerLat?: number; // live position, set while the runner is on the way
  runnerLng?: number;
};

export const NO_RUNNER = "Not assigned yet";

export function statusOf(p: Parcel): string {
  return STAGES[p.stage];
}

export function etaOf(p: Parcel): string {
  switch (p.stage) {
    case 0:
      return "A runner will collect it today";
    case 1:
      return "Picked up and heading to the Iza point";
    case 2:
      return `Ready at ${p.point}`;
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
      return p.runner === NO_RUNNER ? "A runner will collect it" : `${p.runner} collected it`;
    case 2:
      return p.point;
    case 3:
      return p.runner === NO_RUNNER ? "A runner will carry it to you" : `${p.runner} is carrying it`;
    default:
      return "Show your code at the door";
  }
}

export function stepsOf(p: Parcel): Step[] {
  return STAGES.map((title, i) => ({
    title,
    detail: detailFor(p, i),
    state: i < p.stage || (i === p.stage && i === LAST_STAGE) ? "done" : i === p.stage ? "now" : "next",
  }));
}

// Example data for the prototype. Replace with a real database later.
export const exampleParcels: Record<string, Parcel> = {
  "IZA-4821": {
    code: "IZA-4821",
    to: "Lindiwe",
    pickup: "Thembi's Kitchen",
    landmark: "Blue gate by the Engen, Main Rd",
    runner: "Sipho",
    stage: 3,
    point: "Corner Shop",
    lat: -33.9432,
    lng: 18.533,
    plusCode: encodePlusCode(-33.9432, 18.533),
    runnerLat: -33.9441,
    runnerLng: 18.5296,
  },
  "IZA-4825": {
    code: "IZA-4825",
    to: "Lindiwe",
    pickup: "PAXI point, PEP",
    landmark: "Corner Shop, Res Block C",
    runner: "Thabo",
    stage: 2,
    point: "Corner Shop",
  },
  "IZA-4830": {
    code: "IZA-4830",
    to: "Ayanda",
    pickup: "Fresh Cuts Barber",
    landmark: "Res Block C",
    runner: NO_RUNNER,
    stage: 0,
    point: "Corner Shop",
  },
};

export function destinationOf(p: Parcel): LatLng {
  return p.lat !== undefined && p.lng !== undefined ? { lat: p.lat, lng: p.lng } : FALLBACK_DESTINATION;
}

export function runnerPositionOf(p: Parcel): LatLng | undefined {
  return p.runnerLat !== undefined && p.runnerLng !== undefined
    ? { lat: p.runnerLat, lng: p.runnerLng }
    : undefined;
}
