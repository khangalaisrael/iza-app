"use client";

import Link from "next/link";
import { useState } from "react";
import { MapPin } from "@phosphor-icons/react";
import LocationPicker, { type Coords } from "./LocationPicker";
import NotifyButton from "./NotifyButton";
import { directionsUrl, openNow } from "@/lib/geo";
import { FEE_DOOR_EXTRA, FEE_POINT } from "@/lib/parcels";
import { whatsappLink } from "@/lib/whatsapp";

export type PointChoice = { id: string; name: string; kind: string; address: string; hours: string; lat: number; lng: number };

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

// How it works: the sender picks an Izza point, says who it is for and how they get it, and takes the parcel to that point.
// Izza's work starts at the point: it holds the parcel, and delivers to the door if the receiver wants that.
export default function SendForm({
  points,
  siteUrl,
  initialPointId,
  fromCustomer = false,
  recent = [],
}: {
  points: PointChoice[];
  siteUrl: string;
  initialPointId?: string;
  fromCustomer?: boolean;
  recent?: { name: string; phone: string }[];
}) {
  const [pointId, setPointId] = useState(points.find((p) => p.id === initialPointId)?.id ?? (points.length === 1 ? points[0].id : ""));
  const [search, setSearch] = useState("");
  const [toName, setToName] = useState("");
  const [toPhone, setToPhone] = useState("");
  // "shop": they collect it at the hub. "door": a runner brings it to them, and the sender can add the address if they know it.
  const [delivery, setDelivery] = useState<"shop" | "door">("shop");
  const [toPlace, setToPlace] = useState("");
  const [toPin, setToPin] = useState<Coords | null>(null);
  const [size, setSize] = useState("Small");
  const [note, setNote] = useState("");
  const [sent, setSent] = useState<{ code: string; key: string; point: string; delivery: string; knownAddress?: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // With only a few hubs a list is quicker than a search. Past this many, a search box helps.
  const SEARCH_FROM = 8;
  const shown = search.trim() ? points.filter((p) => `${p.name} ${p.kind} ${p.address}`.toLowerCase().includes(search.trim().toLowerCase())) : points;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/parcels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toName,
          toPhone,
          pointId,
          size,
          note,
          delivery,
          ...(delivery === "door" && { toLandmark: toPlace, toLat: toPin?.lat, toLng: toPin?.lng }),
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
    const hub = points.find((p) => p.name === sent.point);
    const open = hub ? openNow(hub.hours) : null;
    const link = `${siteUrl}/track/${sent.code}?k=${sent.key}`;
    const message =
      sent.delivery === "door" && sent.knownAddress
        ? `Molo ${toName}! A parcel is coming to ${toPlace || "the place you were told about"}. Your Izza code is ${sent.code}. Please open this link to check the address, and change it if it is wrong: ${link}`
        : sent.delivery === "door"
          ? `Molo ${toName}! A parcel is coming to your door. Your Izza code is ${sent.code}. Please open this link and pin exactly where you are, so we can bring it: ${link}`
          : `Molo ${toName}! A parcel is waiting for you at ${sent.point}. Your Izza code is ${sent.code}. Choose to collect it or have it brought to your door: ${link}`;
    return (
      <div className="card pop done">
        <h1>Enkosi! It&apos;s booked.</h1>

        <div className="hubCard" aria-label="Where to take it">
          <span className="hubCardLabel">Take it to</span>
          <strong>{sent.point}</strong>
          {hub && (
            <>
              <span>{hub.address}</span>
              <span>
                Open {hub.hours}
                {open !== null && <b className={open ? "openChip yes" : "openChip no"}>{open ? "Open now" : "Closed now"}</b>}
              </span>
              <a className="btn btn-soft" href={directionsUrl(hub)} target="_blank" rel="noopener noreferrer">
                <MapPin size={20} weight="bold" aria-hidden="true" /> Directions
              </a>
            </>
          )}
        </div>

        <p className="muted" style={{ margin: 0 }}>
          Write this code on the parcel, and pay R{FEE_POINT} cash at the hub.
        </p>
        <div className="bigCode mono">{sent.code}</div>
        {fromCustomer && <p className="muted">The Izza team has been told about your parcel.</p>}

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
      <h1>Send a parcel</h1>

      <section className="stack" aria-labelledby="s-hub">
        <h2 id="s-hub" className="stepLabel">
          <span className="stepNum">1</span> Pick a hub
        </h2>
        <fieldset className="field bigChoices" style={{ border: 0, padding: 0 }}>
          <legend className="visually-hidden">Izza point</legend>
          {points.length === 0 && <p className="muted">No Izza points yet. The team is adding them.</p>}
          {points.length > SEARCH_FROM && (
            <input className="input" type="search" aria-label="Search Izza points" placeholder="Search by name or area" value={search} onChange={(e) => setSearch(e.target.value)} />
          )}
          {shown.length === 0 && points.length > 0 && <p className="muted">No Izza point matches that. Try another name.</p>}
          {shown.map((p) => {
            const open = openNow(p.hours);
            return (
              <label key={p.id} className="bigChoice">
                <input type="radio" name="point" value={p.id} checked={pointId === p.id} onChange={() => setPointId(p.id)} />
                <span>
                  <strong>{p.name}</strong>
                  <small>
                    {p.address}
                    {open !== null && <b className={open ? "openChip yes" : "openChip no"}>{open ? "Open" : "Closed"}</b>}
                  </small>
                </span>
              </label>
            );
          })}
        </fieldset>
      </section>

      <section className="stack" aria-labelledby="s-who">
        <h2 id="s-who" className="stepLabel">
          <span className="stepNum">2</span> Who is it for?
        </h2>
        <div className="card stack">
          {recent.length > 0 && (
            <div className="recentRow" aria-label="People you sent to before">
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
          )}
          <div className="field">
            <label htmlFor="toName">Their name</label>
            <input id="toName" className="input" value={toName} onChange={(e) => setToName(e.target.value)} autoComplete="off" />
          </div>
          <div className="field">
            <label htmlFor="toPhone">Their WhatsApp number</label>
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

      <section className="stack" aria-labelledby="s-how">
        <h2 id="s-how" className="stepLabel">
          <span className="stepNum">3</span> How do they get it?
        </h2>
        <div className="twoWay" role="radiogroup" aria-label="How they get it">
          <label className={delivery === "shop" ? "wayOption on" : "wayOption"}>
            <input type="radio" name="delivery" value="shop" checked={delivery === "shop"} onChange={() => setDelivery("shop")} />
            <strong>They collect</strong>
            <small>Free</small>
          </label>
          <label className={delivery === "door" ? "wayOption on" : "wayOption"}>
            <input type="radio" name="delivery" value="door" checked={delivery === "door"} onChange={() => setDelivery("door")} />
            <strong>Bring to their door</strong>
            <small>R{FEE_DOOR_EXTRA} extra</small>
          </label>
        </div>
        {delivery === "door" && (
          <LocationPicker
            id="toAddress"
            label="Their address or landmark"
            hint="Optional. If you leave it empty, they add it themselves."
            placeholder="e.g. Blue gate opposite the Engen, Langa"
            value={toPlace}
            onValue={setToPlace}
            coords={toPin}
            onCoords={setToPin}
          />
        )}
      </section>

      <details className="moreDetails">
        <summary>Add details (optional)</summary>
        <div className="stack" style={{ paddingTop: 10 }}>
          <fieldset className="field" style={{ border: 0, padding: 0 }}>
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
            <label htmlFor="note">A note for the hub</label>
            <input id="note" className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Fragile" />
          </div>
        </div>
      </details>

      <div className="total" aria-live="polite">
        <span>You pay the hub, in cash</span>
        <strong>R{FEE_POINT}</strong>
      </div>

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
