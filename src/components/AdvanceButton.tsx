"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  /** "advance" moves one stage; "collect" hands a parcel at the point to its owner. */
  action?: "advance" | "collect";
  code: string;
  label: string;
  /** Name sent as the runner when this step claims the job. */
  runner?: string;
  secondary?: boolean;
};

export default function AdvanceButton({ code, label, runner, secondary, action = "advance" }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/parcels/${encodeURIComponent(code)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, runner }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Something went wrong.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <button
        type="button"
        className={secondary ? "btn btn-primary" : "btn"}
        onClick={onClick}
        disabled={busy}
      >
        {busy ? "Saving…" : label}
      </button>
      {error && (
        <span role="alert" style={{ color: "var(--danger)", fontSize: 13, fontWeight: 600 }}>
          {error}
        </span>
      )}
    </div>
  );
}
