"use client";

import Link from "next/link";
import { useState } from "react";
import MapView from "./MapView";
import { points } from "@/lib/points";
import { shortPlusCode } from "@/lib/pluscode";

const sizes = [
  { id: "small", label: "Small", note: "Envelope", fee: 12 },
  { id: "medium", label: "Medium", note: "Shoebox", fee: 20 },
  { id: "large", label: "Large", note: "Big bag", fee: 30 },
];

const speeds = [
  { id: "shop", label: "To a shop", note: "Iza point", fee: 0 },
  { id: "door", label: "To the door", note: "Runner", fee: 8 },
];

export default function SendForm() {
  const [from, setFrom] = useState("");
  const [landmark, setLandmark] = useState("");
  const [size, setSize] = useState("small");
  const [speed, setSpeed] = useState("shop");
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [sent, setSent] = useState<{ code: string; plusCode: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fee =
    (sizes.find((s) => s.id === size)?.fee ?? 0) +
    (speeds.find((s) => s.id === speed)?.fee ?? 0);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/parcels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, landmark, size, speed, ...pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setSent(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h2>Enkosi! Your parcel is booked.</h2>
        <p className="muted" style={{ margin: 0 }}>
          A runner will collect it today. Share this code with the person
          receiving it.
        </p>
        <div className="mono" style={{ fontSize: 28 }}>
          {sent.code}
        </div>
        {sent.plusCode && (
          <p className="muted mono" style={{ margin: 0, fontSize: 13 }}>
            Pin: {sent.plusCode}
          </p>
        )}
        <Link className="btn btn-primary" href={`/track/${sent.code}`}>
          Track it
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h1 style={{ fontSize: 26 }}>Send something</h1>

      <div className="field">
        <label htmlFor="from">Pick up from</label>
        <input
          id="from"
          className="input"
          placeholder="e.g. Thembi's Kitchen"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          required
        />
      </div>

      <div className="field">
        <label htmlFor="to">Deliver to (a landmark is enough)</label>
        <input
          id="to"
          className="input"
          placeholder="e.g. Blue gate by the Engen"
          value={landmark}
          onChange={(e) => setLandmark(e.target.value)}
          required
        />
      </div>

      <div className="field">
        <span style={{ fontWeight: 700, fontSize: 15 }}>
          Drop a pin where it should go (optional)
        </span>
        <MapView points={points} pin={pin} onPick={setPin} height={220} />
        <span className="muted mono" style={{ fontSize: 13 }} aria-live="polite">
          {pin ? `Pin: ${shortPlusCode(pin.lat, pin.lng, "Langa")}` : "Tap the map to set the spot."}
        </span>
      </div>

      <fieldset className="field choices" style={{ border: 0, padding: 0 }}>
        <legend>How big is it?</legend>
        {sizes.map((s) => (
          <label key={s.id} className="choice">
            <input
              type="radio"
              name="size"
              value={s.id}
              checked={size === s.id}
              onChange={() => setSize(s.id)}
            />
            <span>
              {s.label}
              <small>{s.note}</small>
            </span>
          </label>
        ))}
      </fieldset>

      <fieldset
        className="field choices"
        style={{ border: 0, padding: 0, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}
      >
        <legend>Where should it go?</legend>
        {speeds.map((s) => (
          <label key={s.id} className="choice">
            <input
              type="radio"
              name="speed"
              value={s.id}
              checked={speed === s.id}
              onChange={() => setSpeed(s.id)}
            />
            <span>
              {s.label}
              <small>{s.note}</small>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="fee" aria-live="polite">
        <span>Delivery fee</span>
        <strong>R{fee}</strong>
      </div>

      {error && (
        <p role="alert" style={{ margin: 0, color: "var(--danger)", fontWeight: 600 }}>
          {error}
        </p>
      )}

      <button className="btn btn-block" type="submit" disabled={busy}>
        {busy ? "Booking…" : "Book delivery"}
      </button>
    </form>
  );
}
