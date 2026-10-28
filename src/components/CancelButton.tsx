"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// The sender cancels a parcel that nobody has collected yet. It asks once, so a slip of the thumb does not cancel it.
export default function CancelButton({ code }: { code: string }) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/parcels/${encodeURIComponent(code)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });
    setBusy(false);
    if (!res.ok) {
      setError((await res.json().catch(() => null))?.error ?? "Something went wrong.");
      return;
    }
    router.refresh();
  }

  if (!asking) {
    return (
      <button type="button" className="linkBtn" onClick={() => setAsking(true)}>
        Cancel this parcel
      </button>
    );
  }

  return (
    <section className="card stack" aria-label="Cancel this parcel" style={{ gap: 10 }}>
      <p style={{ margin: 0 }}>
        <strong>Cancel this parcel?</strong> The runner will be told not to come, and the receiver will see it is cancelled.
      </p>
      <div className="actionRow">
        <button type="button" className="btn btn-primary" disabled={busy} onClick={cancel}>
          {busy ? "Cancelling…" : "Yes, cancel it"}
        </button>
        <button type="button" className="btn btn-soft" disabled={busy} onClick={() => setAsking(false)}>
          Keep it
        </button>
      </div>
      {error && (
        <p role="alert" className="problem">
          {error}
        </p>
      )}
    </section>
  );
}
