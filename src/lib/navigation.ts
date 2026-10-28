// The thinking behind turn-by-turn directions, with no screen in it: turning the routing service's answer into steps, working out
// where along the route a runner is, what the next turn is, how far is left, and whether they have left the route.
export type LatLng = { lat: number; lng: number };

export type Profile = "driving" | "foot" | "bike";

// A runner who walks should be routed along paths, one on a bicycle along roads a bike can use, and so on.
// The public routing servers: OpenStreetMap's own for walking and cycling, the project's for driving.
export function profileFor(transport?: string | null): Profile {
  if (transport === "On foot") return "foot";
  if (transport === "Bicycle") return "bike";
  return "driving";
}

export function routeUrl(profile: Profile, from: LatLng, to: LatLng): string {
  const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  const query = "overview=full&geometries=geojson&steps=true";
  if (profile === "foot") return `https://routing.openstreetmap.de/routed-foot/route/v1/driving/${coords}?${query}`;
  if (profile === "bike") return `https://routing.openstreetmap.de/routed-bike/route/v1/driving/${coords}?${query}`;
  return `https://router.project-osrm.org/route/v1/driving/${coords}?${query}`;
}

export type Turn = "left" | "right" | "straight" | "uturn" | "roundabout" | "arrive";

export type NavStep = {
  text: string; // "Turn left onto Main Rd"
  turn: Turn;
  meters: number; // how long this stretch is
  startMeters: number; // how far along the whole route this turn is
  at: LatLng;
};

export type NavRoute = {
  path: LatLng[];
  cumulative: number[]; // metres along the route at each point of the path
  meters: number;
  seconds: number;
  steps: NavStep[];
};

type OsrmStep = { name?: string; distance: number; maneuver: { type: string; modifier?: string; location: [number, number] } };
type OsrmRoute = { distance: number; duration: number; geometry: { coordinates: [number, number][] }; legs: { steps: OsrmStep[] }[] };

const rad = (d: number) => (d * Math.PI) / 180;

export function metersBetween(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function turnOf(type: string, modifier?: string): Turn {
  if (type === "arrive") return "arrive";
  if (type === "roundabout" || type === "rotary") return "roundabout";
  if (modifier === "uturn") return "uturn";
  if (modifier?.includes("left")) return "left";
  if (modifier?.includes("right")) return "right";
  return "straight";
}

// What to say for a step, in plain words.
export function sayStep(s: OsrmStep): string {
  const { type, modifier } = s.maneuver;
  const on = s.name ? ` on ${s.name}` : "";
  const onto = s.name ? ` onto ${s.name}` : "";
  if (type === "depart") return `Head ${modifier && modifier !== "straight" ? modifier : "ahead"}${on}`;
  if (type === "arrive") return "You have arrived";
  if (type === "roundabout" || type === "rotary") return `Take the roundabout${onto}`;
  if (modifier === "uturn") return "Make a U-turn";
  if (!modifier || modifier === "straight") return `Continue straight${on}`;
  if (modifier.startsWith("slight")) return `Bear ${modifier.replace("slight ", "")}${onto}`;
  if (modifier.startsWith("sharp")) return `Turn sharp ${modifier.replace("sharp ", "")}${onto}`;
  return `Turn ${modifier}${onto}`;
}

export function parseRoute(r: OsrmRoute): NavRoute {
  const path = r.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));
  const cumulative = [0];
  for (let i = 1; i < path.length; i++) cumulative.push(cumulative[i - 1] + metersBetween(path[i - 1], path[i]));
  const meters = cumulative[cumulative.length - 1] || r.distance;

  // Each step is the stretch after a turn, so a step's turn happens where that step starts.
  let startMeters = 0;
  const steps: NavStep[] = [];
  for (const s of r.legs.flatMap((l) => l.steps)) {
    steps.push({
      text: sayStep(s),
      turn: turnOf(s.maneuver.type, s.maneuver.modifier),
      meters: s.distance,
      startMeters: Math.min(startMeters, meters),
      at: { lat: s.maneuver.location[1], lng: s.maneuver.location[0] },
    });
    startMeters += s.distance;
  }
  return { path, cumulative, meters, seconds: r.duration, steps };
}

// Where along the route a position is, and how far from the route it is. It finds the closest point on any stretch of the path.
export function snap(route: NavRoute, pos: LatLng): { along: number; off: number } {
  const { path, cumulative } = route;
  if (path.length < 2) return { along: 0, off: Infinity };
  const kx = Math.cos(rad(pos.lat)) * 111320;
  const ky = 110540;
  const px = (p: LatLng) => ({ x: (p.lng - pos.lng) * kx, y: (p.lat - pos.lat) * ky });
  let best = { along: 0, off: Infinity };
  for (let i = 0; i < path.length - 1; i++) {
    const a = px(path[i]);
    const b = px(path[i + 1]);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    // The position is at (0,0). t is how far along this stretch the closest point is, from 0 to 1.
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, -(a.x * dx + a.y * dy) / len2));
    const off = Math.hypot(a.x + t * dx, a.y + t * dy);
    if (off < best.off) best = { off, along: cumulative[i] + t * (cumulative[i + 1] - cumulative[i]) };
  }
  return best;
}

// The next turn ahead, and how many metres until it. At the end, the arrival.
export function nextTurn(route: NavRoute, along: number): { step: NavStep | null; meters: number } {
  const step = route.steps.find((s, i) => i > 0 && s.startMeters > along + 1) ?? null;
  return { step, meters: step ? Math.max(0, step.startMeters - along) : Math.max(0, route.meters - along) };
}

export const distanceText = (m: number) => (m < 1000 ? `${Math.max(10, Math.round(m / 10) * 10)} m` : `${(m / 1000).toFixed(1)} km`);
export const minutesText = (s: number) => `${Math.max(1, Math.round(s / 60))} min`;

// "In 200 metres, turn left onto Main Rd", for the voice.
export function spoken(step: NavStep, meters: number, near: boolean): string {
  if (step.turn === "arrive") return near ? "You have arrived." : `In ${distanceText(meters).replace(" m", " metres").replace(" km", " kilometres")}, you will arrive.`;
  return near ? `${step.text}.` : `In ${distanceText(meters).replace(" m", " metres").replace(" km", " kilometres")}, ${step.text.charAt(0).toLowerCase()}${step.text.slice(1)}.`;
}
