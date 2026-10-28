"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// The team gives a waiting job to a runner.
export default function AssignRunner({ code, runners }: { code: string; runners: { id: string; name: string }[] }) {
  const router = useRouter();
  const [runnerId, setRunnerId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function assign() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/parcels/${encodeURIComponent(code)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "assign", runnerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (runners.length === 0) return <span className="muted">No approved runners yet</span>;

  return (
    <span className="assignRow">
      <select aria-label={`Runner for ${code}`} className="input" value={runnerId} onChange={(e) => setRunnerId(e.target.value)}>
        <option value="">Choose a runner</option>
        {runners.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>
      <button type="button" className="btn btn-soft" disabled={busy || !runnerId} onClick={assign}>
        Assign
      </button>
      {error && (
        <span role="alert" className="problem">
          {error}
        </span>
      )}
    </span>
  );
}
