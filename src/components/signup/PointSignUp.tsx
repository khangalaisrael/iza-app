"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { signUpPointAction } from "@/app/auth/signup";
import type { AuthState } from "@/app/auth/actions";
import LocationPicker, { type Coords } from "../LocationPicker";
import { POINT_KIND_LABELS } from "@/lib/pointKinds";
import { Basics, Foot, Heading, Text } from "./Fields";

// A shop, salon or hall that holds parcels. Two short steps, so it never feels like one long form: you, then your place.
// Both steps stay in the same form (the one not showing is only hidden), so everything is sent together at the end.
export default function PointSignUp({ next }: { next: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(signUpPointAction, {});
  const [chosen, setChosen] = useState(1);
  const [answered, setAnswered] = useState<AuthState>(state);
  const [address, setAddress] = useState("");
  const [spot, setSpot] = useState<Coords | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  // When the server sends back a mistake, go to the step it belongs to.
  if (state !== answered) {
    setAnswered(state);
    if (state.step) setChosen(state.step);
  }

  function nextStep(e: React.MouseEvent<HTMLButtonElement>) {
    const form = e.currentTarget.form!;
    const get = (n: string) => (form.elements.namedItem(n) as HTMLInputElement).value.trim();
    if (get("name").length < 2) return setProblem("Tell us your name.");
    if (get("identifier").length < 5) return setProblem("Enter a phone number or an email address.");
    if (get("password").length < 8) return setProblem("Use a password of at least 8 characters.");
    setProblem(null);
    setChosen(2);
  }

  return (
    <form action={action} className="stack" noValidate>
      <Heading title="Host an Izza point" lead="A shop, salon or hall that holds parcels for neighbours. Step 1 is you, step 2 is your place." />
      <input type="hidden" name="next" value={next} />
      <p className="muted" style={{ margin: 0 }} aria-live="polite">
        Step {chosen} of 2
      </p>

      <div hidden={chosen !== 1} className="stack">
        <Basics values={state.values} />
        {(problem || (state.error && state.step === 1)) && (
          <p role="alert" className="problem">
            {problem ?? state.error}
          </p>
        )}
        <button type="button" className="btn btn-block" onClick={nextStep}>
          Next: your place
        </button>
        <p className="muted center">
          Already have an account?{" "}
          <Link href={`/signin?next=${encodeURIComponent(next)}`} className="tapLink" style={{ color: "var(--primary)", fontWeight: 700 }}>
            Sign in
          </Link>
        </p>
      </div>

      <div hidden={chosen !== 2} className="stack">
        <Text id="pointName" name="pointName" label="Name of your shop or place" placeholder="e.g. Corner Shop" defaultValue={state.values?.pointName} />
        <div className="field">
          <label htmlFor="pointKind">What kind of place is it?</label>
          <select id="pointKind" name="pointKind" className="input" defaultValue={state.values?.pointKind ?? POINT_KIND_LABELS[0]}>
            {POINT_KIND_LABELS.map((k) => (
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
        <Text id="pointHours" name="pointHours" label="When are you open?" placeholder="e.g. 07:00 to 20:00" defaultValue={state.values?.pointHours} />
        <Foot error={state.step === 2 ? state.error : undefined} pending={pending} cta="Send my application" next={next} />
        <button type="button" className="linkBtn" onClick={() => setChosen(1)}>
          ← Back to step 1
        </button>
      </div>
    </form>
  );
}
