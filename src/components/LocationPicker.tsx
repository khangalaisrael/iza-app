"use client";

import { useState } from "react";
import MapView from "./MapView";

export type Coords = { lat: number; lng: number };

type Props = {
  id: string;
  label: string;
  hint?: string;
  placeholder: string;
  value: string;
  onValue: (text: string) => void;
  coords: Coords | null;
  onCoords: (c: Coords | null) => void;
  /** Offer a big "Use my location" button that reads the phone's position. */
  canUseMyLocation?: boolean;
  required?: boolean;
};

// One question, answered in words, with the phone's position, or with a pin on a map.
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
}: Props) {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);

  function useMyLocation() {
    setProblem(null);
    if (!("geolocation" in navigator)) {
      setProblem("This phone can't share its location. Type the place instead.");
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        onCoords({ lat: p.coords.latitude, lng: p.coords.longitude });
        setBusy(false);
      },
      () => {
        setBusy(false);
        setProblem("We couldn't find you. Allow location for this site, or type the place instead.");
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }

  return (
    <div className="card picker">
      <div className="field">
        <label htmlFor={id}>{label}</label>
        {hint && <small className="muted">{hint}</small>}
        <input
          id={id}
          className="input"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onValue(e.target.value)}
          required={required}
          autoComplete="off"
        />
      </div>

      {canUseMyLocation && (
        <button type="button" className="btn btn-soft" onClick={useMyLocation} disabled={busy}>
          {busy ? "Finding you…" : "Use my location"}
        </button>
      )}

      {coords && (
        <p className="saved" role="status">
          Location saved.{" "}
          <button type="button" className="linkBtn" onClick={() => onCoords(null)}>
            Remove
          </button>
        </p>
      )}
      {problem && (
        <p role="alert" className="problem">
          {problem}
        </p>
      )}

      <button
        type="button"
        className="linkBtn"
        aria-expanded={showMap}
        onClick={() => setShowMap((s) => !s)}
      >
        {showMap ? "Hide the map" : "Choose on the map instead"}
      </button>
      {showMap && (
        <div className="pickerMap">
          <MapView pin={coords} onPick={onCoords} height={240} />
          <small className="muted">Tap the map to drop a pin.</small>
        </div>
      )}
    </div>
  );
}
