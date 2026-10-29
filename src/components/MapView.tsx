"use client";

import { useEffect } from "react";
import {
  AdvancedMarker,
  APIProvider,
  Map,
  Pin,
  useMap,
  type MapMouseEvent,
} from "@vis.gl/react-google-maps";

type LatLng = { lat: number; lng: number };

export const DEFAULT_CENTER: LatLng = { lat: -33.9437, lng: 18.5305 };

type MapPoint = { id: string; name: string; lat: number; lng: number };

type Props = {
  points?: MapPoint[];
  pin?: LatLng | null;
  /** Live position of the runner carrying the parcel. */
  runner?: LatLng | null;
  /** Where the person is right now. The map moves here whenever this changes. */
  me?: LatLng | null;
  center?: LatLng;
  zoom?: number;
  /** When set, tapping the map drops a pin (drop-a-pin addressing). */
  onPick?: (pos: LatLng) => void;
  height?: number;
};

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

// Moves the map when the place it should show changes, on a phone or a computer.
function Recenter({ to }: { to: LatLng | null | undefined }) {
  const map = useMap();
  const lat = to?.lat;
  const lng = to?.lng;
  useEffect(() => {
    if (map && lat !== undefined && lng !== undefined) {
      map.panTo({ lat, lng });
      if ((map.getZoom() ?? 0) < 15) map.setZoom(16);
    }
  }, [map, lat, lng]);
  return null;
}

export default function MapView({ points = [], pin, runner, me, center, zoom = 15, onPick, height = 280 }: Props) {
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
          defaultCenter={me ?? center ?? pin ?? DEFAULT_CENTER}
          defaultZoom={zoom}
          gestureHandling="cooperative"
          disableDefaultUI
          zoomControl
          onClick={handleClick}
        >
          <Recenter to={me} />
          <Recenter to={pin} />
          {points.map((p) => (
            <AdvancedMarker key={p.id} position={p} title={p.name}>
              <Pin background="#934c1a" borderColor="#2b1a12" glyphColor="#2b1a12" />
            </AdvancedMarker>
          ))}
          {runner && (
            <AdvancedMarker position={runner} title="Your runner">
              <Pin background="#2b1a12" borderColor="#934c1a" glyphColor="#934c1a" scale={1.2} />
            </AdvancedMarker>
          )}
          {pin && (
            <AdvancedMarker position={pin} title="Your pin">
              <Pin background="#474e30" borderColor="#FFFFFF" glyphColor="#FFFFFF" />
            </AdvancedMarker>
          )}
          {me && (
            <AdvancedMarker position={me} title="You are here">
              <div className="meDot" aria-label="You are here" />
            </AdvancedMarker>
          )}
        </Map>
      </div>
    </APIProvider>
  );
}
