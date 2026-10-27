"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Taking a job is a promise, so it is one clear button that then opens the job.
export default function AcceptButton({ code, label = "Accept this job" }: { code: string; label?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/parcels/${encodeURIComponent(code)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      router.push(`/runner/${encodeURIComponent(code)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack" style={{ gap: 6 }}>
      <button type="button" className="btn" onClick={accept} disabled={busy}>
        {busy ? "Taking it…" : label}
      </button>
      {error && (
        <span role="alert" className="problem">
          {error}
        </span>
      )}
    </div>
  );
}
