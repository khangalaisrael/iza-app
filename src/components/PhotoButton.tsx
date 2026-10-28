"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

const MAX_SIDE = 800;

// Shrinks the photo on the phone first, so it uploads quickly on a weak signal.
async function shrink(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.7);
}

// The runner photographs the parcel at the door as proof of delivery.
export default function PhotoButton({ code, taken }: { code: string; taken: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/parcels/${encodeURIComponent(code)}/photo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: await shrink(file) }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Something went wrong.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        aria-label="Photo of the parcel"
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
      />
      <button type="button" className="btn btn-soft btn-block" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? "Saving photo…" : taken ? "Photo saved. Take another" : "Take a photo of the parcel"}
      </button>
      {error && (
        <p role="alert" className="problem">
          {error}
        </p>
      )}
    </>
  );
}
