export type IzaPoint = {
  code: string; // the Izza code people share, e.g. LANGA-BLUEGATE-27
  name: string;
  kind: "hub" | "shop";
  area: string;
  lat: number;
  lng: number;
  hours: string;
  waiting: number;
};

export const DEFAULT_CENTER = { lat: -33.9437, lng: 18.5305 };

// Example pins around Langa. Replace with real, hand-placed Izza points.
export const points: IzaPoint[] = [
  {
    code: "LANGA-HUB-01",
    name: "Main hub",
    kind: "hub",
    area: "Langa",
    lat: -33.945,
    lng: 18.531,
    hours: "07:00 to 19:00",
    waiting: 11,
  },
  {
    code: "LANGA-CORNER-02",
    name: "Corner Shop",
    kind: "shop",
    area: "Langa",
    lat: -33.944,
    lng: 18.529,
    hours: "07:00 to 20:00",
    waiting: 6,
  },
  {
    code: "LANGA-BARBER-03",
    name: "Fresh Cuts Barber",
    kind: "shop",
    area: "Langa",
    lat: -33.9425,
    lng: 18.532,
    hours: "09:00 to 18:00",
    waiting: 2,
  },
];

export function pointByName(name: string): IzaPoint | undefined {
  return points.find((p) => p.name === name);
}
