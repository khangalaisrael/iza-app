"use client";

import { useEffect, useRef, useState } from "react";
import { AdvancedMarker, APIProvider, Map, Pin, useMap } from "@vis.gl/react-google-maps";
import NavigationMode from "./NavigationMode";
import { profileFor, routeUrl } from "@/lib/navigation";

type LatLng = { lat: number; lng: number };
type Step = { text: string; meters: number };
type Route = { path: LatLng[]; meters: number; seconds: number; steps: Step[] };

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

function metersBetween(a: LatLng, b: LatLng) {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const distanceText = (m: number) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`);
const minutesText = (s: number) => `${Math.max(1, Math.round(s / 60))} min`;

type OsrmStep = { name?: string; distance: number; maneuver: { type: string; modifier?: string } };

// Turn the routing service's steps into plain words.
function say(s: OsrmStep): string {
  const { type, modifier } = s.maneuver;
  const road = s.name ? ` onto ${s.name}` : "";
  if (type === "depart") return `Head ${modifier && modifier !== "straight" ? modifier : "ahead"}${s.name ? ` on ${s.name}` : ""}`;
  if (type === "arrive") return "You have arrived";
  if (type === "roundabout" || type === "rotary") return `Take the roundabout${road}`;
  if (!modifier || modifier === "straight") return `Continue straight${s.name ? ` on ${s.name}` : ""}`;
  if (modifier === "uturn") return "Make a U-turn";
  return `Turn ${modifier}${road}`;
}

// Draws the route on the map and fits it into view.
function Line({ path, me, to }: { path: LatLng[]; me: LatLng; to: LatLng }) {
  const map = useMap();
  useEffect(() => {
    if (!map || path.length < 2) return;
    const line = new google.maps.Polyline({ path, strokeColor: "#474e30", strokeWeight: 6, strokeOpacity: 0.95, map });
    const bounds = new google.maps.LatLngBounds();
    path.forEach((p) => bounds.extend(p));
    bounds.extend(me);
    bounds.extend(to);
    map.fitBounds(bounds, 48);
    return () => line.setMap(null);
  }, [map, path, me, to]);
  return null;
}

/**
 * Directions inside the website: the route to where the runner is going, the distance, the time and each turn.
 * It uses the runner's own position, and the start given if the phone won't share it.
 */
export default function TripRoute({ to, toLabel, start, transport }: { to: LatLng; toLabel: string; start: LatLng; transport?: string }) {
  const [navigating, setNavigating] = useState(false);
  const profile = profileFor(transport);
  const [here, setHere] = useState<LatLng | null>(null);
  const [route, setRoute] = useState<Route | null>(null);
  const [failed, setFailed] = useState(false);
  const lastFetch = useRef<LatLng | null>(null);

  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    const id = navigator.geolocation.watchPosition(
      (p) => setHere({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  const from = here ?? start;
  const toLat = to.lat;
  const toLng = to.lng;

  useEffect(() => {
    // Ask again only after moving a fair way, so a walking runner does not hammer the service.
    if (lastFetch.current && metersBetween(lastFetch.current, from) < 150) return;
    lastFetch.current = from;
    const ctl = new AbortController();
    const url = routeUrl(profile, from, { lat: toLat, lng: toLng });
    fetch(url, { signal: ctl.signal })
      .then((r) => r.json())
      .then((d) => {
        const r = d.routes?.[0];
        if (!r) throw new Error("no route");
        setRoute({
          path: r.geometry.coordinates.map(([lng, lat]: [number, number]) => ({ lat, lng })),
          meters: r.distance,
          seconds: r.duration,
          steps: r.legs.flatMap((l: { steps: OsrmStep[] }) => l.steps.map((s) => ({ text: say(s), meters: s.distance }))),
        });
        setFailed(false);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setFailed(true);
      });
    return () => ctl.abort();
  }, [from, toLat, toLng, profile]);

  const straight = metersBetween(from, { lat: toLat, lng: toLng });

  return (
    <section className="card stack tripRoute" aria-label={`Directions to ${toLabel}`}>
      <div className="tripHead">
        <div>
          <span className="jobLabel">Going to</span>
          <strong>{toLabel}</strong>
        </div>
        <div className="tripNumbers" aria-live="polite">
          <strong>{route ? distanceText(route.meters) : `About ${distanceText(straight)}`}</strong>
          <span>{route ? `${minutesText(route.seconds)} ${profile === "foot" ? "on foot" : profile === "bike" ? "by bicycle" : "by road"}` : failed ? "Route unavailable" : "Finding the route…"}</span>
        </div>
      </div>

      <button type="button" className="btn btn-primary btn-block" onClick={() => setNavigating(true)}>
        Start navigation
      </button>
      {navigating && <NavigationMode to={{ lat: toLat, lng: toLng }} toLabel={toLabel} start={start} profile={profile} onExit={() => setNavigating(false)} />}

      {apiKey ? (
        <APIProvider apiKey={apiKey}>
          <div className="tripMap">
            <Map mapId="DEMO_MAP_ID" defaultCenter={from} defaultZoom={15} gestureHandling="greedy" disableDefaultUI zoomControl>
              {route && <Line path={route.path} me={from} to={{ lat: toLat, lng: toLng }} />}
              <AdvancedMarker position={{ lat: toLat, lng: toLng }} title={toLabel}>
                <Pin background="#934c1a" borderColor="#ffffff" glyphColor="#ffffff" />
              </AdvancedMarker>
              <AdvancedMarker position={from} title="You">
                <div className="meDot" aria-label="You are here" />
              </AdvancedMarker>
            </Map>
          </div>
        </APIProvider>
      ) : null}

      {!here && <p className="muted tripNote">Allow location on your phone to start the route from where you are.</p>}

      {route && route.steps.length > 0 && (
        <details className="steps">
          <summary>Turn by turn ({route.steps.length} steps)</summary>
          <ol>
            {route.steps.map((s, i) => (
              <li key={i}>
                <span>{s.text}</span>
                <small>{distanceText(s.meters)}</small>
              </li>
            ))}
          </ol>
        </details>
      )}
    </section>
  );
}
