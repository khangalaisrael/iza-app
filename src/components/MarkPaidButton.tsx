"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Records that the cash for a parcel has been received.
export default function MarkPaidButton({ code }: { code: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function markPaid() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/parcels/${encodeURIComponent(code)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_paid", what: "send" }),
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
      <button type="button" className="btn btn-soft" disabled={busy} onClick={markPaid}>
        {busy ? "Saving…" : "Cash received"}
      </button>
      {error && (
        <p role="alert" className="problem">
          {error}
        </p>
      )}
    </>
  );
}
