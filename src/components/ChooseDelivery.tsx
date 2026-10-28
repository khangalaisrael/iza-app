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
}: {
  code: string;
  pointName: string;
  current?: "point" | "door";
  lang?: Lang;
}) {
  const router = useRouter();
  const [choice, setChoice] = useState<"point" | "door">(current ?? "point");
  const [landmark, setLandmark] = useState("");
  const [spot, setSpot] = useState<Coords | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/parcels/${encodeURIComponent(code)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "choose", choice, landmark, lat: spot?.lat, lng: spot?.lng }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
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

      {choice === "door" && (
        <LocationPicker
          id="door"
          label={t(lang, "Where should we bring it?")}
          hint={t(lang, "Describe it like you would to a friend, like the blue gate by the Engen.")}
          placeholder={t(lang, "e.g. Blue gate opposite the Engen")}
          value={landmark}
          onValue={setLandmark}
          coords={spot}
          onCoords={setSpot}
          canUseMyLocation
        />
      )}

      {error && (
        <p role="alert" className="problem">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="saved">
          {t(lang, "Saved. Thank you!")}
        </p>
      )}

      <button className="btn btn-block" type="submit" disabled={busy}>
        {busy ? t(lang, "Saving…") : current ? t(lang, "Save my choice") : t(lang, "Confirm")}
      </button>
    </form>
  );
}
