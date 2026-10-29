"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import LocationPicker, { type Coords } from "./LocationPicker";
import { t, type Lang } from "@/lib/i18n";
import { FEE_DOOR, FEE_DOOR_EXTRA, FEE_POINT } from "@/lib/parcels";

// The customer decides: collect it at the Izza point, or have a runner bring it to the door for a little extra.
export default function ChooseDelivery({
  code,
  pointName,
  current,
  lang = "en",
  accessKey,
  landmark: givenLandmark,
  lat,
  lng,
}: {
  code: string;
  pointName: string;
  current?: "point" | "door";
  lang?: Lang;
  accessKey?: string; // from the receiver's link
  // The address the sender gave, or the receiver saved earlier, so they only have to check it.
  landmark?: string;
  lat?: number;
  lng?: number;
}) {
  const router = useRouter();
  const [choice, setChoice] = useState<"point" | "door">(current ?? "point");
  const [landmark, setLandmark] = useState(givenLandmark && givenLandmark !== "Pinned location" ? givenLandmark : "");
  const [spot, setSpot] = useState<Coords | null>(lat !== undefined && lng !== undefined ? { lat, lng } : null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Once they have answered, the form folds away into one line that says what will happen. A "Change" button opens it again.
  const answered = current === "point" || (current === "door" && (!!givenLandmark || lat !== undefined));
  const [hasAnswer, setHasAnswer] = useState(answered);
  const [editing, setEditing] = useState(!answered);
  // The sender chose the door but the address is missing: ask only for the address, not the whole choice again.
  const [mode, setMode] = useState<"choose" | "address">(current === "door" && !answered ? "address" : "choose");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/parcels/${encodeURIComponent(code)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "choose", choice, landmark, lat: spot?.lat, lng: spot?.lng, key: accessKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setSaved(true);
      // A door delivery without an address is not finished: stay on the address question.
      const finished = choice === "point" || !!landmark.trim() || !!spot;
      if (finished) {
        setHasAnswer(true);
        setEditing(false);
      } else {
        setMode("address");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    const place = landmark.trim() || (spot ? t(lang, "Pinned location") : "");
    return (
      <div className="confirmed" role="status">
        <strong>
          <span aria-hidden="true">✓ </span>
          {choice === "door" ? t(lang, "Coming to your door") : t(lang, "You'll collect it at {point}", { point: pointName })}
        </strong>
        {choice === "door" && place && <span>{place}</span>}
        {saved ? (
          <span className="saved">{t(lang, "Saved. Thank you!")}</span>
        ) : (
          choice === "door" &&
          !!givenLandmark && <span className="muted">{t(lang, "The sender gave this address. Tap Change if it is not right.")}</span>
        )}
        <button
          type="button"
          className="linkBtn"
          onClick={() => {
            setEditing(true);
            setMode("choose");
            setSaved(false);
          }}
        >
          {t(lang, "Change")}
        </button>
      </div>
    );
  }

  const picker = (
    <LocationPicker
      id="door"
      label={t(lang, "Where should we bring it?")}
      hint={t(lang, "Type it like you would to a friend, drop a pin, or use your location.")}
      placeholder={t(lang, "e.g. Blue gate opposite the Engen")}
      value={landmark}
      onValue={setLandmark}
      coords={spot}
      onCoords={setSpot}
      canUseMyLocation
    />
  );

  const errorAndSaved = (
    <>
      {error && (
        <p role="alert" className="problem">
          {error}
        </p>
      )}
    </>
  );

  if (mode === "address") {
    return (
      <form onSubmit={save} className="stack" noValidate>
        <p className="lead" style={{ margin: 0 }}>
          {t(lang, "This parcel is being brought to your door. Tell us exactly where you are.")}
        </p>
        {picker}
        {errorAndSaved}
        <button className="btn btn-block" type="submit" disabled={busy}>
          {busy ? t(lang, "Saving…") : t(lang, "Save my choice")}
        </button>
        <button
          type="button"
          className="linkBtn"
          onClick={() => {
            setChoice("point");
            setMode("choose");
          }}
        >
          {t(lang, "I'll collect it instead")}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={save} className="stack" noValidate>
      <h2>{t(lang, "How would you like it?")}</h2>
      <fieldset className="field bigChoices">
        <legend className="visually-hidden">{t(lang, "How would you like it?")}</legend>
        <label className="bigChoice">
          <input type="radio" name="choice" value="point" checked={choice === "point"} onChange={() => setChoice("point")} />
          <span>
            <strong>{t(lang, "I'll collect it")}</strong>
            <small>{t(lang, "At {point}. Show your code at the counter.", { point: pointName })}</small>
            <b className="price">R{FEE_POINT}</b>
          </span>
        </label>
        <label className="bigChoice">
          <input type="radio" name="choice" value="door" checked={choice === "door"} onChange={() => setChoice("door")} />
          <span>
            <strong>{t(lang, "Bring it to my door")}</strong>
            <small>{t(lang, "A local runner brings it. R{fee} extra.", { fee: FEE_DOOR_EXTRA })}</small>
            <b className="price">R{FEE_DOOR}</b>
          </span>
        </label>
      </fieldset>

      {choice === "door" && picker}
      {errorAndSaved}

      <button className="btn btn-block" type="submit" disabled={busy}>
        {busy ? t(lang, "Saving…") : current ? t(lang, "Save my choice") : t(lang, "Confirm")}
      </button>
      {hasAnswer && (
        <button type="button" className="linkBtn" onClick={() => setEditing(false)}>
          {t(lang, "Cancel")}
        </button>
      )}
    </form>
  );
}
