// Plus Codes (Open Location Code): a short code for any spot, no street address needed.
// Encodes to 10 digits, about 14 m x 14 m. Spec: https://github.com/google/open-location-code
const ALPHABET = "23456789CFGHJMPQRVWX";
const PAIRS = 5;
const PAIR_PRECISION = 8000; // 1/8000 of a degree after 5 pairs

export function encodePlusCode(lat: number, lng: number): string {
  const clampedLat = Math.min(Math.max(lat, -90), 89.999999);
  const normLng = ((((lng + 180) % 360) + 360) % 360) - 180;

  let latInt = Math.floor((clampedLat + 90) * PAIR_PRECISION);
  let lngInt = Math.floor((normLng + 180) * PAIR_PRECISION);

  let code = "";
  for (let i = 0; i < PAIRS; i++) {
    code = ALPHABET[lngInt % 20] + code;
    code = ALPHABET[latInt % 20] + code;
    latInt = Math.floor(latInt / 20);
    lngInt = Math.floor(lngInt / 20);
  }
  return `${code.slice(0, 8)}+${code.slice(8)}`;
}

// Locals share the area, so the first four characters can be dropped: "4FRW+X3 Langa".
export function shortPlusCode(lat: number, lng: number, area?: string): string {
  const short = encodePlusCode(lat, lng).slice(4);
  return area ? `${short} ${area}` : short;
}
