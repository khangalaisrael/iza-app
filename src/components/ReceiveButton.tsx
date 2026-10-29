"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// The hub says a parcel has arrived. If the sender is still to pay, one tap also records that the cash was taken, so the hub does not
// have to press two buttons while someone waits at the counter.
export default function ReceiveButton({ code, fee }: { code: string; fee?: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function receive(paid: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/parcels/${encodeURIComponent(code)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "receive", ...(paid && { paid: true }) }),
      });
      if (!res.ok) {
        setError((await res.json().catch(() => null))?.error ?? "Something went wrong.");
        return;
      }
      router.refresh();
    } catch {
      // No signal: say so, and let the button be pressed again.
      setError("No signal. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {fee ? (
        <>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => receive(true)}>
            {busy ? "Saving…" : `Received, R${fee} cash taken`}
          </button>
          <button type="button" className="linkBtn" disabled={busy} onClick={() => receive(false)}>
            Received, cash comes later
          </button>
        </>
      ) : (
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => receive(false)}>
          {busy ? "Saving…" : "I have received it"}
        </button>
      )}
      {error && (
        <p role="alert" className="problem">
          {error}
        </p>
      )}
    </>
  );
}
