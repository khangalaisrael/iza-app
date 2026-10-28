"use client";

import { useEffect, useRef, useState } from "react";
import { lerp, type LatLng } from "@/lib/geo";

type Job = { code: string; from: LatLng; to: LatLng };

// Sends the runner's position for a parcel. Returns whether the server took it, so a failure can be shown rather than hidden.
async function report(code: string, pos: LatLng): Promise<boolean> {
  try {
    const res = await fetch(`/api/parcels/${encodeURIComponent(code)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "location", ...pos }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

type Status = "starting" | "live" | "blocked" | "unsupported" | "paused" | "no-signal";

/**
 * Sends the runner's position to the customer for every parcel on the way.
 * It starts by itself when the runner is on the delivery leg, so it never depends on remembering a button. The runner sees
 * whether it is working ("Live. Sent 3 s ago") and can pause it. "Demo ride" walks a test runner from the Izza point to the
 * customer, for showing the tracking map without leaving the desk.
 */
export default function LocationShare({ jobs, demo = false }: { jobs: Job[]; demo?: boolean }) {
  const [wanted, setWanted] = useState(!demo);
  const [status, setStatus] = useState<Status>(demo ? "paused" : "starting");
  const [sentAt, setSentAt] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const [riding, setRiding] = useState(false);
  const jobsRef = useRef(jobs);
  jobsRef.current = jobs;

  // The real thing: watch the phone's GPS and send it, at most every 4 seconds, the first fix straight away.
  useEffect(() => {
    if (!wanted) {
      setStatus("paused");
      return;
    }
    if (!("geolocation" in navigator)) {
      setStatus("unsupported");
      return;
    }
    setStatus("starting");
    let last = 0;
    const id = navigator.geolocation.watchPosition(
      async (p) => {
        if (Date.now() - last < 4000) return;
        last = Date.now();
        const pos = { lat: p.coords.latitude, lng: p.coords.longitude };
        const results = await Promise.all(jobsRef.current.map((j) => report(j.code, pos)));
        if (results.every(Boolean)) {
          setSentAt(Date.now());
          setStatus("live");
        } else {
          setStatus("no-signal");
        }
      },
      (err) => setStatus(err.code === 1 ? "blocked" : "no-signal"),
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [wanted]);

  // Keep the screen awake while sharing, so the phone does not go to sleep and stop sending.
  useEffect(() => {
    if (!wanted || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    const ask = () => navigator.wakeLock.request("screen").then((l) => (lock = l)).catch(() => {});
    ask();
    const again = () => document.visibilityState === "visible" && ask();
    document.addEventListener("visibilitychange", again);
    return () => {
      document.removeEventListener("visibilitychange", again);
      lock?.release().catch(() => {});
    };
  }, [wanted]);

  // Makes "sent 3 s ago" count up.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

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
      }
    }, 1000);
    return () => clearInterval(id);
  }, [riding]);

  if (jobs.length === 0) return null;

  const ago = sentAt ? Math.max(0, Math.round((Date.now() - sentAt) / 1000)) : null;
  void tick;
  const line =
    riding
      ? "Demo ride: moving a test runner to the customer."
      : status === "live"
        ? `Live. The customer can see you. Sent ${ago === null ? "just now" : ago < 2 ? "just now" : `${ago} s ago`}.`
        : status === "starting"
          ? "Finding your location. Allow location if your phone asks."
          : status === "blocked"
            ? "Location is blocked. Turn it on for this site in your browser settings, then tap Share again."
            : status === "unsupported"
              ? "This phone can't share its location."
              : status === "no-signal"
                ? "Can't reach the customer's map right now. We keep trying."
                : "Sharing is paused. The customer can't see you.";

  return (
    <section className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }} aria-label="Sharing your location">
      <strong>
        <span aria-hidden="true" className={status === "live" ? "liveDot on" : "liveDot"} /> Let the customer see you
      </strong>
      <span className="muted" style={{ fontSize: 14 }} aria-live="polite">
        {line}
      </span>
      <div style={{ display: "grid", gridTemplateColumns: demo ? "1fr 1fr" : "1fr", gap: 8 }}>
        <button type="button" className={wanted ? "btn btn-soft" : "btn"} aria-pressed={wanted} onClick={() => setWanted((w) => !w)}>
          {wanted ? "Pause sharing" : "Share my location"}
        </button>
        {demo && (
          <button type="button" className="btn btn-primary" disabled={riding} onClick={() => setRiding(true)}>
            {riding ? "Riding…" : "Demo ride"}
          </button>
        )}
      </div>
    </section>
  );
}
