"use client";

import {
  AdvancedMarker,
  APIProvider,
  Map,
  Pin,
  type MapMouseEvent,
} from "@vis.gl/react-google-maps";
import { DEFAULT_CENTER, type IzaPoint } from "@/lib/points";

type LatLng = { lat: number; lng: number };

type Props = {
  points?: IzaPoint[];
  pin?: LatLng | null;
  /** Live position of the runner carrying the parcel. */
  runner?: LatLng | null;
  center?: LatLng;
  /** When set, tapping the map drops a pin (drop-a-pin addressing). */
  onPick?: (pos: LatLng) => void;
  height?: number;
};

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export default function MapView({ points = [], pin, runner, center, onPick, height = 280 }: Props) {
  if (!apiKey) {
    return (
      <div
        className="card"
        role="note"
        style={{ minHeight: height, display: "grid", placeItems: "center", textAlign: "center" }}
      >
        <p className="muted" style={{ margin: 0 }}>
          The map needs a Google Maps key. Add it to <code>.env.local</code> as{" "}
          <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>.
        </p>
      </div>
    );
  }

  function handleClick(e: MapMouseEvent) {
    const ll = e.detail.latLng;
    if (onPick && ll) onPick({ lat: ll.lat, lng: ll.lng });
  }

  return (
    <APIProvider apiKey={apiKey}>
      <div style={{ height, borderRadius: 20, overflow: "hidden" }}>
        <Map
          mapId="DEMO_MAP_ID"
          defaultCenter={center ?? pin ?? DEFAULT_CENTER}
          defaultZoom={15}
          gestureHandling="greedy"
          disableDefaultUI
          zoomControl
          onClick={handleClick}
        >
          {points.map((p) => (
            <AdvancedMarker key={p.code} position={p} title={p.name}>
              <Pin background="#f2b631" borderColor="#13201b" glyphColor="#13201b" />
            </AdvancedMarker>
          ))}
          {runner && (
            <AdvancedMarker position={runner} title="Your runner">
              <Pin background="#13201b" borderColor="#f2b631" glyphColor="#f2b631" scale={1.2} />
            </AdvancedMarker>
          )}
          {pin && (
            <AdvancedMarker position={pin} title="Your pin">
              <Pin background="#1f7a55" borderColor="#FFFFFF" glyphColor="#FFFFFF" />
            </AdvancedMarker>
          )}
        </Map>
      </div>
    </APIProvider>
  );
}
