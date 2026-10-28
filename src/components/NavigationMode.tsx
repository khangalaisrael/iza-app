"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AdvancedMarker, APIProvider, Map, Pin, useMap } from "@vis.gl/react-google-maps";
import { ArrowBendUpLeft, ArrowBendUpRight, ArrowClockwise, ArrowUUpLeft, ArrowUp, FlagCheckered, NavigationArrow, SpeakerHigh, SpeakerSlash, X } from "@phosphor-icons/react";
import {
  distanceText,
  metersBetween,
  minutesText,
  nextTurn,
  parseRoute,
  routeUrl,
  snap,
  spoken,
  type LatLng,
  type NavRoute,
  type Profile,
  type Turn,
} from "@/lib/navigation";

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const ARRIVED_WITHIN = 30; // metres from the destination that count as being there
const OFF_ROUTE = 60; // metres from the route that count as having left it

const ICON: Record<Turn, typeof ArrowUp> = {
  left: ArrowBendUpLeft,
  right: ArrowBendUpRight,
  straight: ArrowUp,
  uturn: ArrowUUpLeft,
  roundabout: ArrowClockwise,
  arrive: FlagCheckered,
};

// Keeps the map on the runner as they move, until they drag it away. "Recenter" brings it back.
function Follow({ pos, on, route, to }: { pos: LatLng | null; on: boolean; route: NavRoute | null; to: LatLng }) {
  const map = useMap();
  const lat = pos?.lat;
  const lng = pos?.lng;
  useEffect(() => {
    if (!map || lat === undefined || lng === undefined || !on) return;
    map.panTo({ lat, lng });
    if ((map.getZoom() ?? 0) < 17) map.setZoom(17);
  }, [map, lat, lng, on]);

  // The route line, drawn once for each new route.
  useEffect(() => {
    if (!map || !route || route.path.length < 2) return;
    const line = new google.maps.Polyline({ path: route.path, strokeColor: "#1f7a55", strokeWeight: 8, strokeOpacity: 0.95, map });
    if (lat === undefined) {
      const bounds = new google.maps.LatLngBounds();
      route.path.forEach((p) => bounds.extend(p));
      bounds.extend(to);
      map.fitBounds(bounds, 60);
    }
    return () => line.setMap(null);
  }, [map, route, to, lat]);
  return null;
}

/**
 * Turn-by-turn navigation that fills the screen, like a driving app. The runner sees the next turn at the top, the map following
 * them, and the time and distance left at the bottom. If they leave the route it finds a new one, and it can speak the turns.
 */
export default function NavigationMode({
  to,
  toLabel,
  start,
  profile,
  onExit,
}: {
  to: LatLng;
  toLabel: string;
  start: LatLng;
  profile: Profile;
  onExit: () => void;
}) {
  const [pos, setPos] = useState<LatLng | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [route, setRoute] = useState<NavRoute | null>(null);
  const [failed, setFailed] = useState(false);
  const [follow, setFollow] = useState(true);
  const [voice, setVoice] = useState(false);
  const lastPos = useRef<LatLng | null>(null);
  const offCount = useRef(0);
  const lastRouted = useRef(0);
  const spokenRef = useRef(new Set<string>());

  // Fill the screen and stop the page behind from scrolling.
  useEffect(() => {
    const was = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    try {
      setVoice(localStorage.getItem("izza_voice") === "on");
    } catch {}
    return () => {
      document.body.style.overflow = was;
    };
  }, []);

  // The runner's position, as often as the phone gives it.
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setBlocked(true);
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (p) => {
        const here = { lat: p.coords.latitude, lng: p.coords.longitude };
        // The phone's compass heading when it has one, and otherwise the direction of travel.
        if (p.coords.heading !== null && Number.isFinite(p.coords.heading)) setHeading(p.coords.heading);
        else if (lastPos.current && metersBetween(lastPos.current, here) > 4) {
          const a = lastPos.current;
          setHeading(((Math.atan2(here.lng - a.lng, here.lat - a.lat) * 180) / Math.PI + 360) % 360);
        }
        if (!lastPos.current || metersBetween(lastPos.current, here) > 2) lastPos.current = here;
        setBlocked(false);
        setPos(here);
      },
      (err) => err.code === 1 && setBlocked(true),
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // The route: from where the runner is, or from the start we were given if the phone will not say.
  const from = pos ?? start;
  const fromLat = from.lat;
  const fromLng = from.lng;
  const needRoute = !route;
  useEffect(() => {
    if (!needRoute) return;
    const ctl = new AbortController();
    lastRouted.current = Date.now();
    fetch(routeUrl(profile, { lat: fromLat, lng: fromLng }, to), { signal: ctl.signal })
      .then((r) => r.json())
      .then((d) => {
        if (!d.routes?.[0]) throw new Error("no route");
        setRoute(parseRoute(d.routes[0]));
        setFailed(false);
        spokenRef.current.clear();
      })
      .catch((e) => e.name !== "AbortError" && setFailed(true));
    return () => ctl.abort();
  }, [needRoute, profile, fromLat, fromLng, to]);

  // Where the runner is on the route, and what is ahead.
  const progress = useMemo(() => {
    if (!route || !pos) return null;
    const s = snap(route, pos);
    const turn = nextTurn(route, s.along);
    const left = Math.max(0, route.meters - s.along);
    return { ...s, ...turn, left, seconds: route.seconds * (route.meters > 0 ? left / route.meters : 0) };
  }, [route, pos]);

  // Left the route for a few readings in a row: find a new way from here.
  useEffect(() => {
    if (!progress) return;
    offCount.current = progress.off > OFF_ROUTE ? offCount.current + 1 : 0;
    if (offCount.current >= 3 && Date.now() - lastRouted.current > 8000) {
      offCount.current = 0;
      setRoute(null);
    }
  }, [progress]);

  const arrived = !!pos && metersBetween(pos, to) <= ARRIVED_WITHIN;

  // Speak each turn twice: when it is about 200 metres ahead, and again as it arrives.
  useEffect(() => {
    if (!voice || !progress?.step || typeof speechSynthesis === "undefined") return;
    const near = progress.meters <= 40;
    const far = progress.meters <= 220;
    const key = `${progress.step.startMeters}:${near ? "near" : "far"}`;
    if ((near || far) && !spokenRef.current.has(key)) {
      spokenRef.current.add(key);
      speechSynthesis.speak(new SpeechSynthesisUtterance(spoken(progress.step, progress.meters, near)));
    }
  }, [voice, progress]);

  function toggleVoice() {
    const next = !voice;
    setVoice(next);
    try {
      localStorage.setItem("izza_voice", next ? "on" : "off");
    } catch {}
    if (next && typeof speechSynthesis !== "undefined") speechSynthesis.speak(new SpeechSynthesisUtterance("Voice directions on."));
    if (!next && typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
  }

  const Icon = progress?.step ? ICON[progress.step.turn] : ICON.straight;
  const eta = progress ? new Date(Date.now() + progress.seconds * 1000).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Africa/Johannesburg" }) : null;

  return (
    <div className="navFull" role="dialog" aria-modal="true" aria-label="Navigation">
      <div className="navMap">
        {apiKey ? (
          <APIProvider apiKey={apiKey}>
            <Map mapId="DEMO_MAP_ID" defaultCenter={from} defaultZoom={17} gestureHandling="greedy" disableDefaultUI onDragstart={() => setFollow(false)}>
              <Follow pos={pos} on={follow} route={route} to={to} />
              <AdvancedMarker position={to} title={toLabel}>
                <Pin background="#cd4600" borderColor="#ffffff" glyphColor="#ffffff" scale={1.2} />
              </AdvancedMarker>
              {pos && (
                <AdvancedMarker position={pos} title="You">
                  <div className="navMe" style={{ transform: `rotate(${heading ?? 0}deg)` }} aria-label="You are here">
                    <NavigationArrow size={30} weight="fill" aria-hidden="true" />
                  </div>
                </AdvancedMarker>
              )}
            </Map>
          </APIProvider>
        ) : (
          <p className="muted" style={{ padding: 24 }}>The map needs a Google Maps key, but the directions below still work.</p>
        )}
      </div>

      <div className="navTop" role="status" aria-live="polite">
        {arrived ? (
          <>
            <FlagCheckered size={44} weight="bold" aria-hidden="true" />
            <div>
              <strong>You have arrived</strong>
              <span>{toLabel}</span>
            </div>
          </>
        ) : progress?.step ? (
          <>
            <Icon size={44} weight="bold" aria-hidden="true" />
            <div>
              <strong>{distanceText(progress.meters)}</strong>
              <span>{progress.step.text}</span>
            </div>
          </>
        ) : failed ? (
          <div>
            <strong>Route unavailable</strong>
            <span>Check your signal. We will keep trying.</span>
          </div>
        ) : blocked ? (
          <div>
            <strong>Turn on location</strong>
            <span>Allow location for this site so we can guide you.</span>
          </div>
        ) : (
          <div>
            <strong>{route ? "Head to the route" : "Finding the route…"}</strong>
            <span>{toLabel}</span>
          </div>
        )}
      </div>

      <div className="navBottom">
        <div className="navStats">
          {progress ? (
            <>
              <strong>{minutesText(progress.seconds)}</strong>
              <span>
                {distanceText(progress.left)} · arrive {eta}
              </span>
            </>
          ) : (
            <>
              <strong>{route ? minutesText(route.seconds) : "—"}</strong>
              <span>{route ? distanceText(route.meters) : "Waiting for the route"}</span>
            </>
          )}
        </div>
        <div className="navButtons">
          {!follow && (
            <button type="button" className="btn btn-soft" onClick={() => setFollow(true)}>
              Recenter
            </button>
          )}
          <button type="button" className="btn btn-soft" onClick={toggleVoice} aria-pressed={voice} aria-label={voice ? "Turn voice directions off" : "Turn voice directions on"}>
            {voice ? <SpeakerHigh size={22} aria-hidden="true" /> : <SpeakerSlash size={22} aria-hidden="true" />}
          </button>
          <button type="button" className="btn btn-primary" onClick={onExit}>
            <X size={20} weight="bold" aria-hidden="true" /> {arrived ? "Done" : "Exit"}
          </button>
        </div>
      </div>
    </div>
  );
}
