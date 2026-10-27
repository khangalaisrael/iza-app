"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CollectForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (!clean) return;
    const res = await fetch(`/api/parcels/${encodeURIComponent(clean)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "collect" }),
    });
    if (res.ok) {
      setMessage({ ok: true, text: `${clean} handed over. Enkosi!` });
      setCode("");
      router.refresh();
    } else {
      setMessage({ ok: false, text: (await res.json()).error ?? "Something went wrong." });
    }
  }

  return (
    <form className="card" onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <label htmlFor="collect-code" style={{ fontWeight: 600, fontSize: 15 }}>
        Someone at the counter?
      </label>
      <div className="code-row" style={{ background: "var(--bg)" }}>
        <input
          id="collect-code"
          placeholder="Type their code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoComplete="off"
        />
        <button className="btn" type="submit">
          Hand over
        </button>
      </div>
      {message && (
        <p
          role={message.ok ? "status" : "alert"}
          style={{ margin: 0, fontWeight: 600, color: message.ok ? "var(--ink)" : "var(--danger)" }}
        >
          {message.text}
        </p>
      )}
    </form>
  );
}
