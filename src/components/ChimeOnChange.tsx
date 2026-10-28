"use client";

import { useEffect, useRef } from "react";
import { chime, unlockAudio } from "@/lib/chime";

// Plays the chime when something new turns up on a page that refreshes itself. Give it a number (it chimes when the number goes
// up, such as more open jobs) or an id (it chimes when the id changes, such as a new update on a parcel). It stays quiet the
// first time the page opens, so people are not chimed at for what was already there.
export default function ChimeOnChange({ value }: { value: number | string | undefined }) {
  const before = useRef(value);

  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    const was = before.current;
    before.current = value;
    if (was === undefined || value === undefined || was === value) return;
    if (typeof value === "number" && typeof was === "number" && value < was) return;
    chime();
  }, [value]);

  return null;
}
