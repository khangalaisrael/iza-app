"use client";

import { useState } from "react";

// The sender is the one standing at the hub with the parcel, so the sender says it has been handed in. That is what lets a runner start
// or the receiver collect. The hub can still tap Received too (and take the cash).
export default function HandedIn({ code, point }: { code: string; point: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setState("busy");
    setError(null);
    const res = await fetch(`/api/parcels/${encodeURIComponent(code)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "receive" }),
    });
    if (!res.ok) {
      setError((await res.json().catch(() => null))?.error ?? "Something went wrong.");
      setState("idle");
      return;
    }
    setState("done");
  }

  if (state === "done") {
    return (
      <p className="confirmed" role="status">
        <strong>
          <span aria-hidden="true">✓ </span>It&apos;s at {point}
        </strong>
        <span className="muted">The receiver and the runner can see it now.</span>
      </p>
    );
  }
  return (
    <>
      <button type="button" className="btn btn-primary" disabled={state === "busy"} onClick={confirm}>
        {state === "busy" ? "Saving…" : `I've dropped it at ${point}`}
      </button>
      {error && (
        <p role="alert" className="problem">
          {error}
        </p>
      )}
    </>
  );
}
