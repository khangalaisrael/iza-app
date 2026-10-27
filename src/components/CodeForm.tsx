"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CodeForm({ cta = "Find it" }: { cta?: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (clean) router.push(`/track/${encodeURIComponent(clean)}`);
  }

  return (
    <form className="code-row" onSubmit={onSubmit}>
      <label htmlFor="parcel-code" className="visually-hidden">
        Parcel code
      </label>
      <input
        id="parcel-code"
        placeholder="Parcel code, e.g. IZA-4821"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        autoComplete="off"
      />
      <button className="btn" type="submit">
        {cta}
      </button>
    </form>
  );
}
