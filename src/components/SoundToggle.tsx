"use client";

import { useEffect, useState } from "react";
import { chime, setSound, soundOn, unlockAudio } from "@/lib/chime";

// Turns the sound of new updates on or off for this phone. Turning it on plays the chime once, so people know what to expect.
export default function SoundToggle() {
  const [on, setOn] = useState<boolean | null>(null);
  useEffect(() => setOn(soundOn()), []);
  if (on === null) return null;
  return (
    <button
      type="button"
      className="btn btn-soft btn-block"
      aria-pressed={on}
      onClick={() => {
        const next = !on;
        setSound(next);
        setOn(next);
        if (next) {
          unlockAudio();
          setTimeout(chime, 50);
        }
      }}
    >
      {on ? "Sound is on. Tap to turn it off" : "Sound is off. Tap to turn it on"}
    </button>
  );
}
