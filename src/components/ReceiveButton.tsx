"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// The Izza point confirms a sender has brought a parcel in.
export default function ReceiveButton({ code }: { code: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function receive() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/parcels/${encodeURIComponent(code)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "receive" }),
    });
    setBusy(false);
    if (!res.ok) {
      setError((await res.json().catch(() => null))?.error ?? "Something went wrong.");
      return;
    }
    router.refresh();
  }

  return (
    <>
      <button type="button" className="btn btn-primary" disabled={busy} onClick={receive}>
        {busy ? "Saving…" : "I have received it"}
      </button>
      {error && (
        <p role="alert" className="problem">
          {error}
        </p>
      )}
    </>
  );
}
