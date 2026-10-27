"use client";

import { useState } from "react";
import MapView from "./MapView";

type Spot = { id: string; name: string; lat: number; lng: number };

// A map with a "Find my location" button. On a phone or a computer, the map moves to where you are.
export default function FindMeMap({ spots, height = 420 }: { spots: Spot[]; height?: number }) {
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  function find() {
    setProblem(null);
    if (!("geolocation" in navigator)) {
      setProblem("This device can't share its location.");
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setMe({ lat: p.coords.latitude, lng: p.coords.longitude });
        setBusy(false);
      },
      () => {
        setBusy(false);
        setProblem("We couldn't find you. Allow location for this site in your browser.");
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }

  return (
    <div className="stack" style={{ gap: 10 }}>
      <MapView points={spots} me={me} height={height} />
      <button type="button" className="btn btn-soft" onClick={find} disabled={busy}>
        {busy ? "Finding you…" : me ? "Find me again" : "Find my location"}
      </button>
      {problem && (
        <p role="alert" className="problem">
          {problem}
        </p>
      )}
    </div>
  );
}
