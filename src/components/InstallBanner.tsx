"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

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

// "Add Izza to your home screen", the same idea as AMNA's. Android and computers install in one tap when the browser offers it;
// an iPhone can't be asked, so the card shows the two taps instead. Hidden once installed, or once someone closes it.
export default function InstallBanner() {
  const offer = useSyncExternalStore(onInstalled, worthOffering, () => false);
  const [closed, setClosed] = useState(false);
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [iosSteps, setIosSteps] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPrompt);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!offer || closed) return null;

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
      setIosSteps(true);
    }
  }

  return (
    <aside className="installCard" aria-label="Add Izza to your home screen">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/icon-192.png" alt="" width={44} height={44} />
      <div className="installText">
        <strong>Add Izza to your home screen</strong>
        {iosSteps ? (
          <span>
            Tap <b>Share</b> at the bottom of Safari, then <b>Add to Home Screen</b>.
          </span>
        ) : (
          <span>Open it in one tap, like an app.</span>
        )}
      </div>
      {!iosSteps && (
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
