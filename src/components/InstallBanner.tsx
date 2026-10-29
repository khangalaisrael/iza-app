"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { INSTALL_COPY, installDevice, type InstallDevice } from "@/lib/installDevice";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISSED = "izza_install_dismissed";

// Worth offering only in a browser tab (not once it is on the home screen) and only until someone closes the card.
function worthOffering() {
  const installed =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  try {
    return !installed && localStorage.getItem(DISMISSED) !== "1";
  } catch {
    return !installed; // Storage blocked: still offer it, it can be closed for this visit.
  }
}

function onInstalled(changed: () => void) {
  window.addEventListener("appinstalled", changed);
  return () => window.removeEventListener("appinstalled", changed);
}

const noChange = () => () => {};
const thisDevice = (): InstallDevice => installDevice(navigator.userAgent, navigator.maxTouchPoints ?? 0);

// "Add Izza to your home screen", the same idea as AMNA's, worded for the device in hand: Add to Dock on a Mac with Safari,
// Share then Add to Home Screen on an iPhone or iPad, one tap where the browser offers its own install box (Chrome, Edge,
// Android). Hidden once installed, once someone closes it, and on computer browsers that can't install at all.
export default function InstallBanner() {
  const offer = useSyncExternalStore(onInstalled, worthOffering, () => false);
  const device = useSyncExternalStore(noChange, thisDevice, (): InstallDevice => "computer");
  const [closed, setClosed] = useState(false);
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [showSteps, setShowSteps] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPrompt);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const { title, steps } = INSTALL_COPY[device];
  if (!offer || closed || (!prompt && !steps)) return null;

  function close() {
    try {
      localStorage.setItem(DISMISSED, "1");
    } catch {
      // Storage blocked: it only stays closed for this visit.
    }
    setClosed(true);
  }

  async function add() {
    if (prompt) {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      setPrompt(null);
      if (outcome === "accepted") setClosed(true);
    } else {
      setShowSteps(true);
    }
  }

  return (
    <aside className="installCard" aria-label={title}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/icon-192.png" alt="" width={44} height={44} />
      <div className="installText">
        <strong>{title}</strong>
        <span>{showSteps && steps ? steps : "Open it in one tap, like an app."}</span>
      </div>
      {!showSteps && (
        <button type="button" className="btn btn-soft installAdd" onClick={add}>
          Add
        </button>
      )}
      <button type="button" className="installClose" onClick={close} aria-label="Close">
        ×
      </button>
    </aside>
  );
}
