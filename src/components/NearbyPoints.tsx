"use client";

import { useMemo, useState } from "react";
import { directionsUrl, walkMinutes, type LatLng } from "@/lib/geo";
import type { IzaPoint } from "@/lib/points";

// Shows every Iza point. One big button puts the closest first, with a walking time.
export default function NearbyPoints({ points }: { points: IzaPoint[] }) {
  const [here, setHere] = useState<LatLng | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  function locate() {
    setProblem(null);
    if (!("geolocation" in navigator)) {
      setProblem("This phone can't share its location. The list below shows every Iza point.");
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setHere({ lat: p.coords.latitude, lng: p.coords.longitude });
        setBusy(false);
      },
      () => {
        setBusy(false);
        setProblem("We couldn't find you. Allow location for this site, or pick a point from the list.");
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }

  const sorted = useMemo(() => {
    if (!here) return points.map((p) => ({ point: p, minutes: null as number | null }));
    return points
      .map((p) => ({ point: p, minutes: walkMinutes(here, p) }))
      .sort((a, b) => (a.minutes as number) - (b.minutes as number));
  }, [here, points]);

  return (
    <div className="stack">
      <button type="button" className="btn btn-primary" onClick={locate} disabled={busy}>
        {busy ? "Finding you…" : here ? "Update my location" : "Find the closest to me"}
      </button>
      {problem && (
        <p role="alert" className="problem">
          {problem}
        </p>
      )}

      <ul className="plainList">
        {sorted.map(({ point, minutes }, i) => (
          <li key={point.code} className="card nearby">
            <div>
              <strong>{point.name}</strong>
              <div className="muted">Open {point.hours}</div>
              {minutes !== null && (
                <div className="walk">
                  {minutes} min walk{i === 0 ? ", closest to you" : ""}
                </div>
              )}
            </div>
            <a className="btn btn-soft" href={directionsUrl(point)} target="_blank" rel="noopener noreferrer">
              Directions
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
