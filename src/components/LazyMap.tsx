"use client";

import { useState } from "react";
import MapView from "./MapView";

type Spot = { id: string; name: string; lat: number; lng: number };
type LatLng = { lat: number; lng: number };

// A map that only loads when someone taps for it, so a parcel page costs almost no data until the map is wanted. Where the map
// matters most, such as while the runner is on the way, it loads straight away.
export default function LazyMap({
  auto,
  points,
  pin,
  runner,
  center,
  height = 240,
}: {
  auto: boolean;
  points?: Spot[];
  pin?: LatLng | null;
  runner?: LatLng | null;
  center?: LatLng;
  height?: number;
}) {
  const [asked, setAsked] = useState(false);
  if (!auto && !asked) {
    return (
      <button type="button" className="mapAsk" onClick={() => setAsked(true)}>
        <strong>Show the map</strong>
        <small>It uses a little data, so it only loads when you ask.</small>
      </button>
    );
  }
  return <MapView points={points} pin={pin} runner={runner} center={center} height={height} />;
}
