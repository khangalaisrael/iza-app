export type LatLng = { lat: number; lng: number };

// Used when a booking has no dropped pin, so the demo map still has somewhere to go.
export const FALLBACK_DESTINATION: LatLng = { lat: -33.9425, lng: 18.5328 };

export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// A runner on a bicycle covers about 0.25 km a minute through streets.
export function etaMinutes(from: LatLng, to: LatLng): number {
  return Math.max(1, Math.round((distanceKm(from, to) * 1.3) / 0.25));
}

export function lerp(a: LatLng, b: LatLng, t: number): LatLng {
  return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t };
}

// A person walks about 5 km an hour, a little over 80 metres a minute.
export function walkMinutes(from: LatLng, to: LatLng): number {
  return Math.max(1, Math.round((distanceKm(from, to) * 1.3) / 0.083));
}

// Opens turn-by-turn directions in the phone's maps app.
export function directionsUrl(to: LatLng): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${to.lat},${to.lng}`;
}
