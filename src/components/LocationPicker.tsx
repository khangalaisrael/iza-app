"use client";

import { useEffect, useId, useRef, useState } from "react";
import MapView from "./MapView";

export type Coords = { lat: number; lng: number };

type Suggestion = { id: string; text: string };

const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

// Searches places as you type, favouring Cape Town. Needs the Places API on the Google project.
async function suggest(input: string, signal: AbortSignal): Promise<Suggestion[]> {
  const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": KEY ?? "" },
    body: JSON.stringify({
      input,
      includedRegionCodes: ["za"],
      locationBias: { circle: { center: { latitude: -33.94, longitude: 18.53 }, radius: 50000 } },
    }),
    signal,
  });
  if (!res.ok) throw new Error("search failed");
  const data = (await res.json()) as {
    suggestions?: { placePrediction?: { placeId: string; text: { text: string } } }[];
  };
  return (data.suggestions ?? [])
    .map((s) => s.placePrediction)
    .filter((p): p is NonNullable<typeof p> => !!p)
    .map((p) => ({ id: p.placeId, text: p.text.text }));
}

async function placeLocation(id: string): Promise<Coords> {
  const res = await fetch(`https://places.googleapis.com/v1/places/${id}?fields=location`, {
    headers: { "X-Goog-Api-Key": KEY ?? "" },
  });
  if (!res.ok) throw new Error("place failed");
  const data = (await res.json()) as { location: { latitude: number; longitude: number } };
  return { lat: data.location.latitude, lng: data.location.longitude };
}

type Props = {
  id: string;
  label: string;
  hint?: string;
  placeholder: string;
  value: string;
  onValue: (text: string) => void;
  coords: Coords | null;
  onCoords: (c: Coords | null) => void;
  /** Offer a big "Use my location" button. Works on a phone and on a computer. */
  canUseMyLocation?: boolean;
  required?: boolean;
  /** Leave out the "choose on the map" part, when the page already has its own map. */
  hideMap?: boolean;
};

// One question. Answer it by typing (suggestions appear), by using your location, or by tapping the map.
export default function LocationPicker({
  id,
  label,
  hint,
  placeholder,
  value,
  onValue,
  coords,
  onCoords,
  canUseMyLocation,
  required,
  hideMap,
}: Props) {
  const listId = useId();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [options, setOptions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [me, setMe] = useState<Coords | null>(null);
  const picked = useRef<string | null>(null); // the text we put in the box ourselves, so it doesn't search again

  // Look up places while the person types.
  useEffect(() => {
    const q = value.trim();
    if (q.length < 3 || q === picked.current || !KEY) {
      setOptions([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      suggest(q, ctrl.signal)
        .then((s) => {
          setOptions(s.slice(0, 5));
          setOpen(true);
          setActive(-1);
        })
        .catch(() => {});
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [value]);

  async function choose(s: Suggestion) {
    picked.current = s.text;
    onValue(s.text);
    setOpen(false);
    setOptions([]);
    setProblem(null);
    try {
      const c = await placeLocation(s.id);
      onCoords(c);
      if (!hideMap) setShowMap(true);
    } catch {
      setProblem("We found the place but couldn't pin it. Tap the map to place the pin.");
      setShowMap(true);
    }
  }

  function useMyLocation() {
    setProblem(null);
    if (!("geolocation" in navigator)) {
      setProblem("This device can't share its location. Type the place instead.");
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const here = { lat: p.coords.latitude, lng: p.coords.longitude };
        setMe(here);
        onCoords(here);
        if (!hideMap) setShowMap(true); // show the map, centred on where you are
        setBusy(false);
      },
      () => {
        setBusy(false);
        setProblem("We couldn't find you. Allow location for this site in your browser, or type the place instead.");
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || options.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % options.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a <= 0 ? options.length - 1 : a - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      void choose(options[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="card picker">
      <div className="field comboWrap">
        <label htmlFor={id}>{label}</label>
        {hint && <small className="muted">{hint}</small>}
        <input
          id={id}
          className="input"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            picked.current = null;
            onValue(e.target.value);
          }}
          onKeyDown={onKeyDown}
          onFocus={() => options.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          required={required}
          autoComplete="off"
          role="combobox"
          aria-expanded={open && options.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        />
        {open && options.length > 0 && (
          <ul className="suggestions" id={listId} role="listbox" aria-label="Suggested places">
            {options.map((s, i) => (
              <li
                key={s.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                className={i === active ? "on" : undefined}
                onMouseDown={(e) => {
                  e.preventDefault();
                  void choose(s);
                }}
              >
                {s.text}
              </li>
            ))}
          </ul>
        )}
      </div>

      {canUseMyLocation && (
        <button type="button" className="btn btn-soft" onClick={useMyLocation} disabled={busy}>
          {busy ? "Finding you…" : "Use my location"}
        </button>
      )}

      {coords && (
        <p className="saved" role="status">
          Location saved.{" "}
          <button
            type="button"
            className="linkBtn"
            onClick={() => {
              onCoords(null);
              setMe(null);
            }}
          >
            Remove
          </button>
        </p>
      )}
      {problem && (
        <p role="alert" className="problem">
          {problem}
        </p>
      )}

      {!hideMap && (
        <button type="button" className="linkBtn" aria-expanded={showMap} onClick={() => setShowMap((s) => !s)}>
          {showMap ? "Hide the map" : "Choose on the map instead"}
        </button>
      )}
      {showMap && !hideMap && (
        <div className="pickerMap">
          <MapView pin={coords} me={me} onPick={onCoords} height={260} />
          <small className="muted">Tap the map to move the pin.</small>
        </div>
      )}
    </div>
  );
}
