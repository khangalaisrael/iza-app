"use client";

import { useEffect, useRef, useState } from "react";
import { lerp, type LatLng } from "@/lib/geo";

type Job = { code: string; from: LatLng; to: LatLng };

async function report(code: string, pos: LatLng) {
  await fetch(`/api/parcels/${encodeURIComponent(code)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "location", ...pos }),
  }).catch(() => {});
}

/**
 * Lets a runner send their position for every parcel on the way.
 * "Share live location" uses the phone's GPS; "Demo ride" walks the runner from the
 * Iza point to the customer so the tracking map can be shown without leaving the desk.
 */
export default function LocationShare({ jobs }: { jobs: Job[] }) {
  const [sharing, setSharing] = useState(false);
  const [riding, setRiding] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const jobsRef = useRef(jobs);
  jobsRef.current = jobs;

  useEffect(() => {
    if (!sharing) return;
    if (!("geolocation" in navigator)) {
      setNote("This phone can't share its location.");
      setSharing(false);
      return;
    }
    let last = 0;
    const id = navigator.geolocation.watchPosition(
      (p) => {
        if (Date.now() - last < 4000) return;
        last = Date.now();
        const pos = { lat: p.coords.latitude, lng: p.coords.longitude };
        jobsRef.current.forEach((j) => report(j.code, pos));
        setNote("Sharing your location with customers.");
      },
      () => {
        setNote("Location is blocked. Allow it in the browser settings.");
        setSharing(false);
      },
      { enableHighAccuracy: true },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [sharing]);

  useEffect(() => {
    if (!riding) return;
    const STEPS = 20;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      jobsRef.current.forEach((j) => report(j.code, lerp(j.from, j.to, Math.min(i / STEPS, 1))));
      if (i >= STEPS) {
        clearInterval(id);
        setRiding(false);
        setNote("Demo ride finished.");
      }
    }, 1000);
    return () => clearInterval(id);
  }, [riding]);

  if (jobs.length === 0) return null;

  return (
    <section className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <strong>Let customers see you</strong>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <button
          type="button"
          className={sharing ? "btn btn-primary" : "btn"}
          aria-pressed={sharing}
          onClick={() => setSharing((s) => !s)}
        >
          {sharing ? "Stop sharing" : "Share live location"}
        </button>
        <button type="button" className="btn btn-primary" disabled={riding} onClick={() => setRiding(true)}>
          {riding ? "Riding…" : "Demo ride"}
        </button>
      </div>
      <span className="muted" style={{ fontSize: 13 }} aria-live="polite">
        {note ?? "Demo ride moves a test runner to the customer in 20 seconds."}
      </span>
    </section>
  );
}
