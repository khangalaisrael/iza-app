"use client";

import { useActionState, useState } from "react";
import { addPointAction, type AuthState } from "@/app/auth/actions";
import LocationPicker, { type Coords } from "./LocationPicker";

const kinds = ["Spaza shop", "Petrol station shop", "Pharmacy", "Salon and barber", "Community hall", "Res reception", "Izza hub"];

// For the team: put an Izza point on the map straight away, such as the hub.
export default function AddPointForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(addPointAction, {});
  const [address, setAddress] = useState("");
  const [spot, setSpot] = useState<Coords | null>(null);

  return (
    <form action={action} className="stack" noValidate>
      <div className="field">
        <label htmlFor="add-name">Name of the place</label>
        <input id="add-name" name="pointName" className="input" defaultValue={state.values?.pointName} placeholder="e.g. Izza main hub" />
      </div>
      <div className="field">
        <label htmlFor="add-kind">What kind of place is it?</label>
        <select id="add-kind" name="pointKind" className="input" defaultValue={state.values?.pointKind ?? "Izza hub"}>
          {kinds.map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
      </div>
      <LocationPicker
        id="add-address"
        label="Where is it?"
        placeholder="Type a street or landmark"
        value={address}
        onValue={setAddress}
        coords={spot}
        onCoords={setSpot}
        canUseMyLocation
      />
      <input type="hidden" name="pointAddress" value={address} />
      <input type="hidden" name="pointLat" value={spot?.lat ?? ""} />
      <input type="hidden" name="pointLng" value={spot?.lng ?? ""} />
      <div className="field">
        <label htmlFor="add-hours">When is it open?</label>
        <input id="add-hours" name="pointHours" className="input" defaultValue={state.values?.pointHours} placeholder="e.g. 07:00 to 19:00" />
      </div>
      {state.error && (
        <p role="alert" className="problem">
          {state.error}
        </p>
      )}
      <button className="btn" type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add this Izza point"}
      </button>
    </form>
  );
}
