"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import LocationPicker, { type Coords } from "./LocationPicker";
import { walkMinutes } from "@/lib/geo";
import { FEE_DOOR_EXTRA, FEE_POINT } from "@/lib/parcels";
import { whatsappLink } from "@/lib/whatsapp";

export type PointChoice = { id: string; name: string; kind: string; hours: string; lat: number; lng: number };

const sizes = ["Small", "Medium", "Large"];

// A business books a parcel to an Izza point. The customer then chooses to collect it or have it brought to their door.
export default function SendForm({
  points,
  siteUrl,
  initialPointId,
  fromCustomer = false,
}: {
  points: PointChoice[];
  siteUrl: string;
  initialPointId?: string;
  fromCustomer?: boolean;
}) {
  const [dropoff, setDropoff] = useState<"runner" | "self">("runner");
  const [from, setFrom] = useState("");
  const [pickup, setPickup] = useState<Coords | null>(null);
  const [toName, setToName] = useState("");
  const [toPhone, setToPhone] = useState("");
  const [pointId, setPointId] = useState(
    points.find((p) => p.id === initialPointId)?.id ?? points[0]?.id ?? "",
  );
  const [size, setSize] = useState("Small");
  const [note, setNote] = useState("");
  const [sent, setSent] = useState<{ code: string; point: string; dropoff: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Once the business has shared where it is, show the closest points first.
  const ordered = useMemo(() => {
    if (!pickup) return points.map((p) => ({ p, minutes: null as number | null }));
    return points
      .map((p) => ({ p, minutes: walkMinutes(pickup, p) }))
      .sort((a, b) => (a.minutes as number) - (b.minutes as number));
  }, [pickup, points]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/parcels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          pickupLat: pickup?.lat,
          pickupLng: pickup?.lng,
          toName,
          toPhone,
          pointId,
          size,
          note,
          dropoff,
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
    const link = `${siteUrl}/track/${sent.code}`;
    const message = `Molo ${toName}! A parcel is waiting for you at ${sent.point}. Your Izza code is ${sent.code}. Choose to collect it or have it brought to your door: ${link}`;
    return (
      <div className="card pop done">
        <h1>Enkosi! It&apos;s booked.</h1>
        <p className="muted">
          {sent.dropoff === "self"
            ? `Bring it to ${sent.point} and show this code. The shop will confirm it.`
            : "A runner will collect it from you."}{" "}
          Now tell {toName} their code.
        </p>
        {fromCustomer && <p className="muted">The Izza team has been told about your parcel.</p>}
        <div className="bigCode mono">{sent.code}</div>
        <a className="btn btn-primary" href={whatsappLink(toPhone, message)} target="_blank" rel="noopener noreferrer">
          Send the code on WhatsApp
        </a>
        <Link className="btn btn-soft" href={`/track/${sent.code}`}>
          See where it is
        </Link>
        <Link className="linkBtn" href="/send" onClick={() => setSent(null)}>
          Send another parcel
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="stack" noValidate>
      <div>
        <h1>{fromCustomer ? "Send a parcel from home" : "Send a parcel"}</h1>
        <p className="lead">
          {fromCustomer
            ? "It goes to an Izza point. The person it is for chooses to collect it or have it brought to their door."
            : "It goes to an Izza point near your customer. They choose how they want it."}
        </p>
      </div>

      <fieldset className="field bigChoices">
        <legend>How will it get to the Izza point?</legend>
        <label className="bigChoice">
          <input type="radio" name="dropoff" value="runner" checked={dropoff === "runner"} onChange={() => setDropoff("runner")} />
          <span>
            <strong>Send a runner to collect it</strong>
            <small>A runner comes to you and takes it to the point.</small>
          </span>
        </label>
        <label className="bigChoice">
          <input type="radio" name="dropoff" value="self" checked={dropoff === "self"} onChange={() => setDropoff("self")} />
          <span>
            <strong>I will bring it to the point</strong>
            <small>Free of runners. The shop confirms when it arrives.</small>
          </span>
        </label>
      </fieldset>

      {dropoff === "runner" && (
      <section className="stack" aria-labelledby="who-sending">
        <h2 id="who-sending">Where do we collect it?</h2>
        <LocationPicker
          id="from"
          label="Pick up from"
          hint="A shop name, a street or a landmark."
          placeholder="e.g. Thembi's Kitchen, Langa"
          value={from}
          onValue={setFrom}
          coords={pickup}
          onCoords={setPickup}
          canUseMyLocation
        />
      </section>
      )}

      <section className="stack" aria-labelledby="who-for">
        <h2 id="who-for">Who is it for?</h2>
        <div className="card stack">
          <div className="field">
            <label htmlFor="toName">Their name</label>
            <input id="toName" className="input" value={toName} onChange={(e) => setToName(e.target.value)} autoComplete="off" />
          </div>
          <div className="field">
            <label htmlFor="toPhone">Their WhatsApp number</label>
            <small className="muted">We send them the delivery code.</small>
            <input
              id="toPhone"
              className="input"
              type="tel"
              inputMode="tel"
              placeholder="082 345 6789"
              value={toPhone}
              onChange={(e) => setToPhone(e.target.value)}
              autoComplete="off"
            />
          </div>
        </div>
      </section>

      <fieldset className="field bigChoices">
        <legend>Which Izza point should it go to?</legend>
        {points.length === 0 && <p className="muted">No Izza points yet. The team is adding them.</p>}
        {ordered.map(({ p, minutes }, i) => (
          <label key={p.id} className="bigChoice">
            <input type="radio" name="point" value={p.id} checked={pointId === p.id} onChange={() => setPointId(p.id)} />
            <span>
              <strong>{p.name}</strong>
              <small>
                {p.kind}, open {p.hours}
                {minutes !== null && ` · ${minutes} min from you${i === 0 ? ", closest" : ""}`}
              </small>
            </span>
          </label>
        ))}
      </fieldset>

      <fieldset className="field">
        <legend>How big is it?</legend>
        <div className="pills">
          {sizes.map((s) => (
            <label key={s} className="pill">
              <input type="radio" name="size" value={s} checked={size === s} onChange={() => setSize(s)} />
              <span>{s}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="field">
        <label htmlFor="note">A note for the team (optional)</label>
        <input id="note" className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Ask for Thembi at the back door" />
      </div>

      <div className="total" aria-live="polite">
        <span>You pay</span>
        <strong>R{FEE_POINT}</strong>
      </div>
      <p className="muted" style={{ margin: 0 }}>
        If your customer wants it brought to their door, they pay R{FEE_DOOR_EXTRA} extra.
      </p>

      {error && (
        <p role="alert" className="problem">
          {error}
        </p>
      )}

      <button className="btn btn-block" type="submit" disabled={busy || points.length === 0}>
        {busy ? "Booking…" : "Book it"}
      </button>
    </form>
  );
}
