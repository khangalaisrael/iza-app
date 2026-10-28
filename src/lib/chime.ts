// A short, friendly two-note chime made in the browser, so there is no sound file to download. Phones only let a page play sound after
// the person has touched it once, so the first touch quietly unlocks the sound, and every chime after that works.
let ctx: AudioContext | null = null;

export function soundOn(): boolean {
  try {
    return localStorage.getItem("izza_sound") !== "off";
  } catch {
    return true;
  }
}

export function setSound(on: boolean): void {
  try {
    localStorage.setItem("izza_sound", on ? "on" : "off");
  } catch {
    // Storage is blocked. The sound stays on for this visit.
  }
}

export function unlockAudio(): void {
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    ctx ??= new Ctor();
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    // No audio on this device.
  }
}

function note(frequency: number, start: number, length: number): void {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = frequency;
  // A quick fade in and a smooth fade out, so it is a chime and not a click or a buzz.
  gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + length);
  osc.connect(gain).connect(ctx.destination);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + length + 0.05);
}

// Plays the chime and a short buzz, if the person has not turned sound off.
export function chime(): void {
  if (!soundOn()) return;
  // A running count of chimes, so a test (which cannot hear) can tell that one was meant to play.
  const w = window as unknown as { __izzaChimes?: number };
  w.__izzaChimes = (w.__izzaChimes ?? 0) + 1;
  try {
    navigator.vibrate?.([120, 60, 120]);
  } catch {
    // Not every phone can vibrate.
  }
  if (!ctx || ctx.state !== "running") return;
  note(880, 0, 0.18);
  note(1318.5, 0.16, 0.32);
}
