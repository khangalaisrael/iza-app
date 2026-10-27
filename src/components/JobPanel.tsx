"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type JobLinks = {
  pickupMaps?: string; // directions to where the parcel is collected from
  pointMaps?: string; // directions to the Iza point
  doorMaps?: string; // directions to the customer's door
  businessWhatsapp?: string; // a message ready to send to the business
  customerWhatsapp?: string; // a message ready to send to the customer
};

type Props = {
  code: string;
  stage: number;
  choice?: "point" | "door";
  pointName: string;
  pickupText: string;
  doorText: string;
  links: JobLinks;
};

const PROBLEMS: [string, string][] = [
  ["no_one_there", "Nobody was there"],
  ["not_ready", "The parcel wasn't ready"],
  ["cant_find", "I can't find the address"],
  ["refused", "The parcel was refused"],
  ["other", "Something else"],
];

// One job, one next step. Every button tells the customer what is happening.
export default function JobPanel({ code, stage, choice, pointName, pickupText, doorText, links }: Props) {
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

  const quick = (kind: string, label: string) => (
    <button type="button" className="btn btn-soft" disabled={busy} onClick={() => act("update", { kind }, "The customer has been told.")}>
      {label}
    </button>
  );
  const maps = (href: string | undefined, label: string) =>
    href ? (
      <a className="btn btn-soft" href={href} target="_blank" rel="noopener noreferrer">
        {label}
      </a>
    ) : null;
  const whatsapp = (href: string | undefined, label: string) =>
    href ? (
      <a className="btn btn-soft" href={href} target="_blank" rel="noopener noreferrer">
        {label}
      </a>
    ) : null;

  // What to do right now, depending on where the parcel is.
  let title = "";
  let detail = "";
  let body: React.ReactNode = null;

  if (stage === 0) {
    title = "Step 1: Go and collect it";
    detail = `Collect from ${pickupText}.`;
    body = (
      <>
        <div className="actionRow">
          {maps(links.pickupMaps, "Open directions")}
          {whatsapp(links.businessWhatsapp, "Message the business")}
        </div>
        <div className="actionRow">
          {quick("heading_pickup", "I'm on my way")}
          {quick("arrived_pickup", "I've arrived")}
        </div>
        <button type="button" className="btn" disabled={busy} onClick={() => act("collected")}>
          I&apos;ve collected it
        </button>
      </>
    );
  } else if (stage === 1) {
    title = `Step 2: Take it to ${pointName}`;
    detail = "Hand it to the person at the counter.";
    body = (
      <>
        <div className="actionRow">{maps(links.pointMaps, "Open directions")}</div>
        <div className="actionRow">
          {quick("heading_point", "I'm on my way")}
          {quick("arrived_point", "I've arrived")}
        </div>
        <button type="button" className="btn" disabled={busy} onClick={() => act("dropped")}>
          I&apos;ve handed it to {pointName}
        </button>
      </>
    );
  } else if (stage === 2 && choice === "door") {
    title = `Step 1: Collect it from ${pointName}`;
    detail = "The customer wants it brought to their door.";
    body = (
      <>
        <div className="actionRow">{maps(links.pointMaps, "Open directions")}</div>
        <button type="button" className="btn" disabled={busy} onClick={() => act("pickup_from_point")}>
          I have the parcel
        </button>
      </>
    );
  } else if (stage === 3) {
    title = "Step 2: Take it to the customer";
    detail = `Deliver to ${doorText}.`;
    body = (
      <>
        <div className="actionRow">
          {maps(links.doorMaps, "Open directions")}
          {whatsapp(links.customerWhatsapp, "Message the customer")}
        </div>
        <div className="actionRow">
          {quick("heading_customer", "I'm on my way")}
          {quick("arrived_customer", "I've arrived")}
        </div>
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
        <button type="button" className="btn" disabled={busy || pin.length !== 4} onClick={() => act("deliver", { pin })}>
          Delivered
        </button>
        <button type="button" className="linkBtn" onClick={() => setTrouble((t) => !t)} aria-expanded={trouble}>
          I couldn&apos;t deliver it
        </button>
        {trouble && (
          <div className="card stack" style={{ gap: 10 }}>
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
    );
  }

  const canGiveBack = stage === 0 || (stage === 2 && choice === "door");

  return (
    <section className="card jobPanel stack" aria-label="Your next step">
      <div>
        <h2>{title}</h2>
        <p className="lead" style={{ marginTop: 4 }}>
          {detail}
        </p>
      </div>
      {body}
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

      {canGiveBack && (
        <button type="button" className="linkBtn" disabled={busy} onClick={async () => (await act("release")) && router.push("/runner")}>
          I can&apos;t do this job. Give it back.
        </button>
      )}
    </section>
  );
}
