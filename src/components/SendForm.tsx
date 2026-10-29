"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import LocationPicker, { type Coords } from "./LocationPicker";
import NotifyButton from "./NotifyButton";
import { walkMinutes } from "@/lib/geo";
import { FEE_DOOR_EXTRA, FEE_POINT } from "@/lib/parcels";
import { whatsappLink } from "@/lib/whatsapp";

export type PointChoice = { id: string; name: string; kind: string; hours: string; lat: number; lng: number };

const sizes = ["Small", "Medium", "Large"];

// Opens the phone's own share sheet (SMS, Telegram, any app). Where there is none, the link is copied.
async function shareLink(message: string, link: string) {
  try {
    if (navigator.share) await navigator.share({ title: "Your Izza parcel", text: message });
    else await navigator.clipboard.writeText(link);
  } catch {
    // The person closed the share sheet. Nothing to do.
  }
}

// A business books a parcel to an Izza point. The customer then chooses to collect it or have it brought to their door.
export default function SendForm({
  points,
  siteUrl,
  initialPointId,
  fromCustomer = false,
  recent = [],
  lastPickup,
}: {
  points: PointChoice[];
  siteUrl: string;
  initialPointId?: string;
  fromCustomer?: boolean;
  recent?: { name: string; phone: string }[];
  lastPickup?: { text: string; lat?: number; lng?: number };
}) {
  // "runner": a runner collects it from the sender. "self": the sender brings it to the hub themselves, so no runner is needed.
  const [dropoff, setDropoff] = useState<"runner" | "self">("runner");
  // "shop": they choose to collect or have it brought. "door": the sender does not know where they are, so they pin it.
  const [delivery, setDelivery] = useState<"shop" | "door">("shop");
  // Start from where they usually hand parcels over, if they have sent before. They can change it.
  const [from, setFrom] = useState(lastPickup?.text ?? "");
  // The map pin that came with the remembered place. Once the person changes the place or picks their own pin, it is dropped, so a
  // pin they cannot see never travels with words they have changed.
  const [pinIsRemembered, setPinIsRemembered] = useState(lastPickup?.lat !== undefined);
  const [pickup, setPickup] = useState<Coords | null>(lastPickup?.lat !== undefined && lastPickup?.lng !== undefined ? { lat: lastPickup.lat, lng: lastPickup.lng } : null);
  const [toName, setToName] = useState("");
  const [toPhone, setToPhone] = useState("");
  const [chosenPoint, setChosenPoint] = useState(points.find((p) => p.id === initialPointId)?.id ?? "");
  const [hubSearch, setHubSearch] = useState("");
  const [size, setSize] = useState("Small");
  const [note, setNote] = useState("");
  const [sent, setSent] = useState<{ code: string; key: string; point: string; dropoff: string; delivery: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Once the sender has shared where they are, the closest points come first, and the closest is chosen for them.
  const ordered = useMemo(() => {
    if (!pickup) return points.map((p) => ({ p, minutes: null as number | null }));
    return points
      .map((p) => ({ p, minutes: walkMinutes(pickup, p) }))
      .sort((a, b) => (a.minutes as number) - (b.minutes as number));
  }, [pickup, points]);
  const pointId = chosenPoint || ordered[0]?.p.id || "";
  // With only a few hubs a list is quicker than a search. Past this many, a search box helps.
  const SEARCH_FROM = 8;
  const shown = hubSearch.trim()
    ? ordered.filter(({ p }) => `${p.name} ${p.kind}`.toLowerCase().includes(hubSearch.trim().toLowerCase()))
    : ordered;

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
          delivery,
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
    const link = `${siteUrl}/track/${sent.code}?k=${sent.key}`;
    const message =
      sent.delivery === "door"
        ? `Molo ${toName}! A parcel is coming to your door. Your Izza code is ${sent.code}. Please open this link and pin exactly where you are, so we can bring it: ${link}`
        : `Molo ${toName}! A parcel is waiting for you at ${sent.point}. Your Izza code is ${sent.code}. Choose to collect it or have it brought to your door: ${link}`;
    return (
      <div className="card pop done">
        <h1>Enkosi! It&apos;s booked.</h1>
        <p className="muted">
          {sent.dropoff === "self"
            ? `Take it to ${sent.point} and pay R${FEE_POINT} cash there. Show this code.`
            : "A runner will collect it from you."}{" "}
          {sent.delivery === "door" ? `Now send ${toName} the link so they can pin where to bring it.` : `Now tell ${toName} their code.`}
        </p>
        {fromCustomer && <p className="muted">The Izza team has been told about your parcel.</p>}
        <div className="bigCode mono">{sent.code}</div>
        <a className="btn btn-primary" href={whatsappLink(toPhone, message)} target="_blank" rel="noopener noreferrer">
          {sent.delivery === "door" ? "Send them the link on WhatsApp" : "Send the code on WhatsApp"}
        </a>
        <NotifyButton code={sent.code} />
        <button type="button" className="btn btn-soft" onClick={() => shareLink(message, link)}>
          Share with {toName} another way
        </button>
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
        <legend>Who takes it to the hub?</legend>
        <label className="bigChoice">
          <input type="radio" name="dropoff" value="runner" checked={dropoff === "runner"} onChange={() => setDropoff("runner")} />
          <span>
            <strong>A runner collects it from me</strong>
            <small>You pay the runner R{FEE_POINT} cash when they collect it.</small>
          </span>
        </label>
        <label className="bigChoice">
          <input type="radio" name="dropoff" value="self" checked={dropoff === "self"} onChange={() => setDropoff("self")} />
          <span>
            <strong>I will take it to the hub myself</strong>
            <small>No runner. You pay the hub R{FEE_POINT} cash when you hand it in.</small>
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
          onValue={(v) => {
            if (pinIsRemembered) {
              setPinIsRemembered(false);
              setPickup(null);
            }
            setFrom(v);
          }}
          coords={pickup}
          onCoords={(c) => {
            setPinIsRemembered(false);
            setPickup(c);
          }}
          canUseMyLocation
        />
      </section>
      )}

      <section className="stack" aria-labelledby="who-for">
        <h2 id="who-for">Who is it for?</h2>
        <div className="card stack">
          {recent.length > 0 && (
            <div className="field">
              <span className="muted">Send to someone again</span>
              <div className="recentRow">
                {recent.map((r) => (
                  <button
                    key={r.phone}
                    type="button"
                    className="recentChip"
                    onClick={() => {
                      setToName(r.name);
                      setToPhone(r.phone);
                    }}
                  >
                    {r.name}
                    <small>{r.phone}</small>
                  </button>
                ))}
              </div>
            </div>
          )}
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
        <legend>Do you know where they are?</legend>
        <label className="bigChoice">
          <input type="radio" name="delivery" value="shop" checked={delivery === "shop"} onChange={() => setDelivery("shop")} />
          <span>
            <strong>They choose</strong>
            <small>It waits at an Izza point. They collect it there, or pay R{FEE_DOOR_EXTRA} extra to have it brought to them.</small>
          </span>
        </label>
        <label className="bigChoice">
          <input type="radio" name="delivery" value="door" checked={delivery === "door"} onChange={() => setDelivery("door")} />
          <span>
            <strong>Bring it to their door</strong>
            <small>I do not know exactly where they are. They pin their own address, and they pay R{FEE_DOOR_EXTRA} extra to the runner.</small>
          </span>
        </label>
      </fieldset>

      <fieldset className="field bigChoices">
        <legend>{delivery === "door" ? "Which Izza point should it pass through?" : "Which Izza point should it go to?"}</legend>
        {points.length === 0 && <p className="muted">No Izza points yet. The team is adding them.</p>}
        {points.length > SEARCH_FROM && (
          <input
            className="input"
            type="search"
            aria-label="Search Izza points"
            placeholder="Search by name or area"
            value={hubSearch}
            onChange={(e) => setHubSearch(e.target.value)}
          />
        )}
        {shown.length === 0 && points.length > 0 && <p className="muted">No Izza point matches that. Try another name.</p>}
        {shown.map(({ p, minutes }, i) => (
          <label key={p.id} className="bigChoice">
            <input type="radio" name="point" value={p.id} checked={pointId === p.id} onChange={() => setChosenPoint(p.id)} />
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
        <span>{dropoff === "self" ? "You pay the hub, in cash" : "You pay the runner, in cash"}</span>
        <strong>R{FEE_POINT}</strong>
      </div>
      <p className="muted" style={{ margin: 0 }}>
        {dropoff === "self"
          ? `If they collect it at the hub, no runner is needed at all. If they want it at their door, they pay R${FEE_DOOR_EXTRA} extra.`
          : `If your customer wants it brought to their door, they pay R${FEE_DOOR_EXTRA} extra.`}
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
