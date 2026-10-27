"use client";

import Link from "next/link";
import { useState } from "react";
import LocationPicker, { type Coords } from "./LocationPicker";

const methods = [
  { id: "door", title: "To their door", note: "A local runner brings it", price: 20 },
  { id: "shop", title: "To an Iza point", note: "A shop near them, ready to collect", price: 12 },
];

export default function SendForm() {
  const [from, setFrom] = useState("");
  const [pickup, setPickup] = useState<Coords | null>(null);
  const [landmark, setLandmark] = useState("");
  const [dropPin, setDropPin] = useState<Coords | null>(null);
  const [method, setMethod] = useState("door");
  const [sent, setSent] = useState<{ code: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const price = methods.find((m) => m.id === method)?.price ?? 20;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!from.trim() && !pickup) {
      setError("Tell us where to collect it: share your location or name the place.");
      return;
    }
    if (!landmark.trim()) {
      setError("Tell us where it should go. A landmark is enough.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/parcels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          landmark,
          speed: method,
          pickupLat: pickup?.lat,
          pickupLng: pickup?.lng,
          lat: dropPin?.lat,
          lng: dropPin?.lng,
        }),
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
      <div className="card pop done">
        <h1>Enkosi! It&apos;s booked.</h1>
        <p className="muted">A runner will come for it. Give this code to the person who is waiting for it.</p>
        <div className="bigCode mono">{sent.code}</div>
        <Link className="btn btn-primary" href={`/track/${sent.code}`}>
          See where it is
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="stack" noValidate>
      <h1>Send a parcel</h1>

      <LocationPicker
        id="from"
        label="Pick up from"
        placeholder="e.g. Thembi's Kitchen"
        value={from}
        onValue={setFrom}
        coords={pickup}
        onCoords={setPickup}
        canUseMyLocation
      />

      <LocationPicker
        id="to"
        label="Deliver to"
        hint="A landmark is enough, like the blue gate by the Engen."
        placeholder="e.g. Blue gate by the Engen"
        value={landmark}
        onValue={setLandmark}
        coords={dropPin}
        onCoords={setDropPin}
      />

      <fieldset className="field bigChoices">
        <legend>How should it arrive?</legend>
        {methods.map((m) => (
          <label key={m.id} className="bigChoice">
            <input
              type="radio"
              name="method"
              value={m.id}
              checked={method === m.id}
              onChange={() => setMethod(m.id)}
            />
            <span>
              <strong>{m.title}</strong>
              <small>{m.note}</small>
              <b className="price">R{m.price}</b>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="total" aria-live="polite">
        <span>You pay</span>
        <strong>R{price}</strong>
      </div>

      {error && (
        <p role="alert" className="problem">
          {error}
        </p>
      )}

      <button className="btn btn-block" type="submit" disabled={busy}>
        {busy ? "Booking…" : "Book it"}
      </button>
    </form>
  );
}
