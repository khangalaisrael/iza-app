"use client";

import { useEffect, useState } from "react";

type State = "checking" | "idle" | "working" | "on" | "blocked" | "iphone" | "unsupported" | "error";

function toBytes(base64Url: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const raw = atob((base64Url + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

// "Get updates on this phone": one tap, and the phone shows a notification each time the parcel moves.
export default function NotifyButton({ code, accessKey }: { code: string; accessKey?: string }) {
  const [state, setState] = useState<State>("checking");

  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const installed = window.matchMedia("(display-mode: standalone)").matches;
    if (!supported) {
      setState(ios && !installed ? "iphone" : "unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("blocked");
      return;
    }
    navigator.serviceWorker
      .getRegistration("/sw.js")
      .then((reg) => reg?.pushManager.getSubscription())
      .then((sub) => setState(sub && Notification.permission === "granted" ? "on" : "idle"))
      .catch(() => setState("idle"));
  }, []);

  async function enable() {
    setState("working");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("blocked");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const { key } = await (await fetch("/api/push/key")).json();
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toBytes(key) }));
      const res = await fetch(`/api/parcels/${encodeURIComponent(code)}/push`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON(), key: accessKey, url: location.pathname + location.search }),
      });
      setState(res.ok ? "on" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "checking") return null;
  if (state === "on") {
    return (
      <p role="status" className="saved" style={{ margin: 0 }}>
        You will get a notification on this phone when the parcel moves.
      </p>
    );
  }
  if (state === "iphone") {
    return (
      <p className="muted" style={{ margin: 0 }}>
        To get updates on an iPhone: tap Share, then <strong>Add to Home Screen</strong>, open Izza from there and tap this again.
      </p>
    );
  }
  if (state === "unsupported") {
    return (
      <p className="muted" style={{ margin: 0 }}>
        This browser can&apos;t send notifications. Keep this page open, or ask for the WhatsApp link.
      </p>
    );
  }
  return (
    <div className="stack" style={{ gap: 6 }}>
      <button type="button" className="btn btn-soft btn-block" disabled={state === "working"} onClick={enable}>
        {state === "working" ? "Setting up…" : "Get updates on this phone"}
      </button>
      {state === "blocked" && (
        <p className="muted" style={{ margin: 0 }}>
          Notifications are blocked for this site. Turn them on in your browser&apos;s site settings, then try again.
        </p>
      )}
      {state === "error" && (
        <p role="alert" className="problem" style={{ margin: 0 }}>
          That didn&apos;t work. Try again in a moment.
        </p>
      )}
    </div>
  );
}
