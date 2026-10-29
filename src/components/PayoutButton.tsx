"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// The team records that a runner has been paid what they are owed.
export default function PayoutButton({ runnerId, name, owed }: { runnerId: string; name: string; owed: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runnerId }),
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
      <button type="button" className="btn btn-soft" disabled={busy || owed <= 0} onClick={pay} aria-label={`Mark ${name} as paid R${owed}`}>
        {busy ? "Saving…" : `Paid R${owed}`}
      </button>
      {error && (
        <span role="alert" className="problem">
          {error}
        </span>
      )}
    </>
  );
}
