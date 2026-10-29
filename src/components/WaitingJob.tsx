"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// A runner has taken a door delivery that cannot move yet: the address, or the hub's hand-over, is still to come. The page refreshes
// by itself, so the runner can put the phone down, and the steps appear the moment the job is ready.
export default function WaitingJob({ code, title, detail }: { code: string; title: string; detail: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function giveBack() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/parcels/${encodeURIComponent(code)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "release" }),
    });
    setBusy(false);
    if (!res.ok) {
      setError((await res.json().catch(() => null))?.error ?? "Something went wrong.");
      return;
    }
    router.push("/runner");
  }

  return (
    <section className="card stack" role="status" aria-label="Waiting">
      <span className="chip">Waiting</span>
      <h2>{title}</h2>
      <p className="lead" style={{ margin: 0 }}>
        {detail}
      </p>
      <p className="muted" style={{ margin: 0 }}>
        This job is yours. This page updates by itself and your steps appear here when it is ready.
      </p>
      {error && (
        <p role="alert" className="problem">
          {error}
        </p>
      )}
      <button type="button" className="linkBtn" disabled={busy} onClick={giveBack}>
        {busy ? "Giving it back…" : "I can't do this one"}
      </button>
    </section>
  );
}
