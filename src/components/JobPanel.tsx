"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import TripRoute from "./TripRoute";

export type JobLinks = {
  businessWhatsapp?: string; // a message ready to send to the sender
  customerWhatsapp?: string; // a message ready to send to the customer
};

export type Dest = { lat: number; lng: number; label: string };

type Props = {
  code: string;
  stage: number;
  choice?: "point" | "door";
  pointName: string;
  pickupText: string;
  doorText: string;
  links: JobLinks;
  dest: Dest | null; // where the runner is going now, shown on the map
  start: { lat: number; lng: number }; // where the route begins if the phone will not share its location
  progress: number; // on a delivery: 0 collected, 1 on the way, 2 arrived
};

const PROBLEMS: [string, string][] = [
  ["no_one_there", "Nobody was there"],
  ["not_ready", "The parcel wasn't ready"],
  ["cant_find", "I can't find the address"],
  ["refused", "The parcel was refused"],
  ["other", "Something else"],
];

// One job, one screen. The layout never changes: where you are, the map, one big button, then the extras.
export default function JobPanel({ code, stage, choice, pointName, pickupText, doorText, links, dest, start, progress }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [trouble, setTrouble] = useState(false);

  async function act(action: string, extra: Record<string, unknown> = {}, message?: string) {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const res = await fetch(`/api/parcels/${encodeURIComponent(code)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      if (message) setNote(message);
      setPin("");
      router.refresh();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  const tell = (kind: string) => () => act("update", { kind }, "The customer has been told.");
  const link = (href: string | undefined, label: string) =>
    href ? (
      <a className="btn btn-soft" href={href} target="_blank" rel="noopener noreferrer">
        {label}
      </a>
    ) : null;

  // What to do right now.
  let n = 1;
  let of = 2;
  let title = "";
  let detail = "";
  let primary: { label: string; run: () => void; disabled?: boolean } | null = null;
  let secondary: React.ReactNode = null;
  let showPin = false;

  if (stage === 0) {
    of = 2;
    title = "Step 1: Go and collect it";
    detail = `Collect from ${pickupText}.`;
    primary = { label: "I've collected it", run: () => act("collected") };
    secondary = (
      <>
        <button type="button" className="btn btn-soft" disabled={busy} onClick={tell("heading_pickup")}>
          I&apos;m on my way
        </button>
        <button type="button" className="btn btn-soft" disabled={busy} onClick={tell("arrived_pickup")}>
          I&apos;ve arrived
        </button>
        {link(links.businessWhatsapp, "Message the sender")}
      </>
    );
  } else if (stage === 1) {
    n = 2;
    of = 2;
    title = `Step 2: Take it to ${pointName}`;
    detail = "Hand it to the person at the counter.";
    primary = { label: `I've handed it to ${pointName}`, run: () => act("dropped") };
    secondary = (
      <>
        <button type="button" className="btn btn-soft" disabled={busy} onClick={tell("heading_point")}>
          I&apos;m on my way
        </button>
        <button type="button" className="btn btn-soft" disabled={busy} onClick={tell("arrived_point")}>
          I&apos;ve arrived
        </button>
      </>
    );
  } else if (stage === 2 && choice === "door") {
    of = 4;
    n = 1;
    title = `Step 1: Collect it from ${pointName}`;
    detail = "The customer wants it brought to their door.";
    primary = { label: `I've collected it from ${pointName}`, run: () => act("pickup_from_point") };
  } else if (stage === 3) {
    of = 4;
    title = "Step 2: Take it to the customer";
    detail = `Deliver to ${doorText}.`;
    secondary = link(links.customerWhatsapp, "Message the customer");
    if (progress <= 0) {
      n = 2;
      primary = { label: "I'm on my way to the customer", run: tell("heading_customer") };
    } else if (progress === 1) {
      n = 3;
      title = "Step 3: Arrive at the customer";
      primary = { label: "I've arrived at the customer", run: tell("arrived_customer") };
    } else {
      n = 4;
      title = "Step 4: End the trip";
      detail = "Ask the customer for their 4-digit code.";
      showPin = true;
      primary = { label: "End trip", run: () => act("deliver", { pin }), disabled: pin.length !== 4 };
    }
  }

  const canGiveBack = stage === 0 || (stage === 2 && choice === "door");

  return (
    <div className="stack jobFrame">
      <section className="card jobPanel stack" aria-label="Your next step">
        <div className="jobStepRow" aria-label={`Step ${n} of ${of}`}>
          <span className="chip chip-primary">
            Step {n} of {of}
          </span>
          <span className="jobDots" aria-hidden="true">
            {Array.from({ length: of }, (_, i) => (
              <i key={i} className={i < n ? "on" : ""} />
            ))}
          </span>
        </div>
        <div>
          <h2>{title}</h2>
          <p className="lead" style={{ marginTop: 4 }}>
            {detail}
          </p>
        </div>

        {dest && <TripRoute to={dest} toLabel={dest.label} start={start} />}

        {showPin && (
          <div className="field pinBox">
            <label htmlFor="pin">Ask the customer for their 4-digit code</label>
            <input
              id="pin"
              className="input pinInput"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              autoComplete="off"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="0000"
            />
          </div>
        )}

        {primary && (
          <button type="button" className="btn btn-block jobPrimary" disabled={busy || primary.disabled} onClick={primary.run}>
            {primary.label}
          </button>
        )}
        {secondary && <div className="actionRow">{secondary}</div>}

        {error && (
          <p role="alert" className="problem">
            {error}
          </p>
        )}
        {note && (
          <p role="status" className="saved">
            {note}
          </p>
        )}
      </section>

      <section className="card stack jobExtras" style={{ gap: 10 }} aria-label="If something goes wrong">
        {stage <= 1 && (
          <details className="problemBox">
            <summary>Something is wrong</summary>
            <div className="actionRow" style={{ paddingTop: 10 }}>
              {PROBLEMS.filter(([id]) => id !== "refused").map(([id, label]) => (
                <button key={id} type="button" className="btn btn-soft" disabled={busy} onClick={() => act("problem", { reason: id }, "We have noted it.")}>
                  {label}
                </button>
              ))}
            </div>
          </details>
        )}

        {stage === 3 && (
          <>
            <button type="button" className="linkBtn" onClick={() => setTrouble((t) => !t)} aria-expanded={trouble}>
              I couldn&apos;t deliver it
            </button>
            {trouble && (
              <div className="stack" style={{ gap: 10 }}>
                <p style={{ margin: 0 }}>
                  <strong>Take it back to {pointName}.</strong> The customer will be told to collect it there.
                </p>
                <div className="actionRow">
                  {PROBLEMS.filter(([id]) => id !== "not_ready").map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      className="btn btn-soft"
                      disabled={busy}
                      onClick={async () => {
                        if (await act("problem", { reason: id })) await act("return_to_point");
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {canGiveBack && (
          <button type="button" className="linkBtn" disabled={busy} onClick={async () => (await act("release")) && router.push("/runner")}>
            I can&apos;t do this job. Give it back.
          </button>
        )}
      </section>
    </div>
  );
}
