"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { signInAction, signUpAction, type AuthState } from "@/app/auth/actions";
import LocationPicker, { type Coords } from "./LocationPicker";

const roles = [
  { id: "customer", label: "I'm getting a parcel", note: "Start right away" },
  { id: "business", label: "I send parcels", note: "For shops and sellers. We approve you first" },
  { id: "runner", label: "I want to deliver", note: "Become a runner. We approve you first" },
  { id: "point", label: "I'll host an Izza point", note: "A shop, salon or hall. We approve you first" },
];

const kinds = [
  "Spaza shop",
  "Petrol station shop",
  "Pharmacy",
  "Salon and barber",
  "Community hall",
  "Res reception",
];

export default function AuthForm({
  mode,
  next,
  startRole = "customer",
}: {
  mode: "signin" | "signup";
  next: string;
  startRole?: string;
}) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    mode === "signin" ? signInAction : signUpAction,
    {},
  );
  const [role, setRole] = useState(startRole);
  const [address, setAddress] = useState("");
  const [spot, setSpot] = useState<Coords | null>(null);
  const signup = mode === "signup";

  return (
    <form action={formAction} className="stack" noValidate>
      <h1>{signup ? "Join Izza" : "Welcome back"}</h1>
      <input type="hidden" name="next" value={next} />
      {/* The role is sent on its own, so a browser form reset can never change who is being signed up. */}
      <input type="hidden" name="role" value={role} />

      {signup && (
        <>
          <fieldset className="field bigChoices" key={`roles-${state.error ?? "start"}`}>
            <legend>How will you use Izza?</legend>
            {roles.map((r) => (
              <label key={r.id} className="bigChoice">
                <input type="radio" name="roleChoice" value={r.id} checked={role === r.id} onChange={() => setRole(r.id)} />
                <span className="plain">
                  <strong>{r.label}</strong>
                  <small>{r.note}</small>
                </span>
              </label>
            ))}
          </fieldset>

          <div className="field">
            <label htmlFor="name">{role === "business" ? "Business name" : "Your name"}</label>
            <input id="name" name="name" className="input" autoComplete="name" defaultValue={state.values?.name} required />
          </div>

          {role === "point" && (
            <>
              <div className="field">
                <label htmlFor="pointName">Name of your shop or place</label>
                <input id="pointName" name="pointName" className="input" placeholder="e.g. Corner Shop" defaultValue={state.values?.pointName} required />
              </div>
              <div className="field">
                <label htmlFor="pointKind">What kind of place is it?</label>
                <select id="pointKind" name="pointKind" className="input" defaultValue={state.values?.pointKind ?? "Spaza shop"}>
                  {kinds.map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
              </div>
              <LocationPicker
                id="pointAddress"
                label="Where is it?"
                hint="Type the street or a landmark, or use your location if you are at the shop."
                placeholder="e.g. Opposite the Engen, Langa"
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
                <label htmlFor="pointHours">When are you open?</label>
                <input id="pointHours" name="pointHours" className="input" placeholder="e.g. 07:00 to 20:00" defaultValue={state.values?.pointHours} required />
              </div>
            </>
          )}
        </>
      )}

      <div className="field">
        <label htmlFor="identifier">Phone number or email</label>
        <input
          id="identifier"
          name="identifier"
          className="input"
          autoComplete="username"
          inputMode="email"
          defaultValue={state.values?.identifier}
          required
        />
      </div>

      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          autoComplete={signup ? "new-password" : "current-password"}
          minLength={signup ? 8 : undefined}
          required
        />
        {signup && <small className="muted">At least 8 characters.</small>}
      </div>

      {state.error && (
        <p role="alert" className="problem">
          {state.error}
        </p>
      )}

      <button className="btn btn-block" type="submit" disabled={pending}>
        {pending ? "One moment…" : signup ? (role === "customer" ? "Create my account" : "Send my application") : "Sign in"}
      </button>

      {!signup && (
        <p className="muted center" style={{ margin: 0 }}>
          Forgot your password? Message the Izza team on WhatsApp and we will send you a link to choose a new one.
        </p>
      )}
      {signup && (
        <p className="muted center" style={{ margin: 0 }}>
          By joining you agree to how we use your details in our{" "}
          <Link href="/privacy" style={{ color: "var(--primary)", fontWeight: 700 }}>
            privacy notice
          </Link>
          .
        </p>
      )}

      <p className="muted center">
        {signup ? "Already have an account? " : "New to Izza? "}
        <Link
          href={`${signup ? "/signin" : "/signup"}?next=${encodeURIComponent(next)}`}
          style={{ color: "var(--primary)", fontWeight: 700 }}
        >
          {signup ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </form>
  );
}
