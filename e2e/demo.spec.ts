import { readFileSync, mkdirSync, copyFileSync } from "node:fs";
import { devices, expect, request as pwRequest, test, type BrowserContext, type Page } from "@playwright/test";
import { authFile, type Role } from "./fixtures";

// The pitch video, at normal speed, and only the part that matters most: the delivery. A runner collects a parcel, photographs it,
// navigates to the door turn by turn, the customer follows the runner live on the map, and the delivery ends with the customer's code.
// The booking and the hub's hand-over happen before the recording starts. One phone, one recording: the same browser swaps between the
// runner and the customer by swapping the saved sign-in.

const HUB_ID = "LANGA-CORNER-02"; // Corner Shop, at -33.944, 18.529
const DOOR = { lat: -33.9462, lng: 18.533 }; // about 620 m away, along real roads

type Pt = { lat: number; lng: number };

async function become(ctx: BrowserContext, role: Role | null) {
  await ctx.clearCookies();
  if (role) await ctx.addCookies(JSON.parse(readFileSync(authFile(role), "utf8")).cookies);
}

// A caption in a dark pill at the top of the screen, so a viewer with the sound off still follows the story. null removes it.
async function caption(page: Page, text: string | null) {
  await page.evaluate((t) => {
    let el = document.getElementById("demo-cap");
    if (t === null) return el?.remove();
    if (!el) {
      el = document.createElement("div");
      el.id = "demo-cap";
      el.style.cssText =
        "position:fixed;top:58px;left:50%;transform:translateX(-50%);z-index:2147483647;max-width:92vw;padding:10px 18px;border-radius:999px;background:#1d1a16;color:#fff;font:700 15px system-ui,sans-serif;text-align:center;box-shadow:0 6px 24px rgba(0,0,0,.35);pointer-events:none;white-space:nowrap";
      document.body.appendChild(el);
    }
    el.textContent = t;
  }, text);
}

// Points spread evenly along a line, so a phone that "drives" it moves at a steady pace.
function along(path: Pt[], n: number): Pt[] {
  const d = (a: Pt, b: Pt) => Math.hypot((a.lat - b.lat) * 111_000, (a.lng - b.lng) * 92_000);
  const total = path.slice(1).reduce((s, p, i) => s + d(path[i], p), 0);
  const out: Pt[] = [];
  for (let k = 0; k <= n; k++) {
    let want = (total * k) / n;
    for (let i = 1; i < path.length; i++) {
      const seg = d(path[i - 1], path[i]);
      if (want <= seg || i === path.length - 1) {
        const f = seg === 0 ? 0 : Math.min(1, want / seg);
        out.push({ lat: path[i - 1].lat + (path[i].lat - path[i - 1].lat) * f, lng: path[i - 1].lng + (path[i].lng - path[i - 1].lng) * f });
        break;
      }
      want -= seg;
    }
  }
  return out;
}

test("record the pitch video", async ({ browser, baseURL }) => {
  const origin = baseURL!;
  const api = (role: Role) => pwRequest.newContext({ baseURL: origin, storageState: authFile(role), extraHTTPHeaders: { origin } });

  // The road the runner takes, from the real routing service the app uses.
  const hub = { lat: -33.944, lng: 18.529 };
  const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${hub.lng},${hub.lat};${DOOR.lng},${DOOR.lat}?overview=full&geometries=geojson`);
  const road: Pt[] = (await res.json()).routes[0].geometry.coordinates.map(([lng, lat]: number[]) => ({ lat, lng }));
  const drive = along(road, 36);

  // A photo of the parcel, drawn as a cardboard box with the Izza label, to stand in for the one the runner takes.
  mkdirSync("demo", { recursive: true });
  const art = await browser.newPage({ viewport: { width: 800, height: 600 } });
  await art.setContent(
    `<body style="margin:0;background:linear-gradient(#cdbfa6,#b9a98c);display:grid;place-items:center;height:600px;font-family:system-ui">
      <div style="width:520px;height:340px;background:#c79a63;border-radius:10px;box-shadow:0 30px 40px rgba(0,0,0,.35);position:relative">
        <div style="position:absolute;left:230px;top:0;width:60px;height:100%;background:#e3c79a"></div>
        <div style="position:absolute;left:60px;top:200px;background:#fff;padding:12px 18px;border-radius:6px;font:700 26px ui-monospace,monospace">IZA · Nokuthula</div>
      </div></body>`,
  );
  await art.screenshot({ path: "demo/package.png" });
  await art.close();

  // Everything before the delivery, off camera: a business books a door delivery, the sender drops it at the hub, a runner takes the job.
  const business = await api("business");
  const booked = await business.post("/api/parcels", {
    data: { toName: "Nokuthula", toPhone: "0825550100", pointId: HUB_ID, delivery: "door", toLandmark: "Blue gate, 14 Mqhayi St", toLat: DOOR.lat, toLng: DOOR.lng },
  });
  expect(booked.ok()).toBeTruthy();
  const { code, key } = await booked.json();
  const hubApi = await api("point");
  expect((await hubApi.patch(`/api/parcels/${code}`, { data: { action: "receive", paid: true } })).ok()).toBeTruthy();
  const runnerApi = await api("runner");
  expect((await runnerApi.patch(`/api/parcels/${code}`, { data: { action: "accept" } })).ok()).toBeTruthy();
  const peek = await browser.newPage({ baseURL: origin });
  await peek.goto(`/track/${code}?k=${key}`);
  const pin = (await peek.locator(".pinCard .bigCode").innerText()).trim();
  await peek.close();

  // The recording: a phone that starts at the hub.
  const ctx = await browser.newContext({
    ...devices["Pixel 7"],
    baseURL,
    permissions: ["geolocation"],
    geolocation: { latitude: hub.lat, longitude: hub.lng },
    recordVideo: { dir: "demo/raw", size: { width: 412, height: 839 } },
  });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    const style = document.createElement("style");
    style.textContent = ".waFab{display:none!important}";
    document.addEventListener("DOMContentLoaded", () => document.head.appendChild(style));
  });
  const pause = (ms: number) => page.waitForTimeout(ms);

  // 1. The runner collects it from the hub.
  await become(ctx, "runner");
  await page.goto(`/runner/${code}`);
  await expect(page.getByRole("region", { name: "Your next step" })).toBeVisible();
  await caption(page, "The runner collects it from the hub");
  await pause(2800);
  await page.getByRole("button", { name: /I've collected it from/ }).click();

  // 2. A photo of the parcel, kept as proof.
  await caption(page, "A photo of the parcel, as proof");
  await expect(page.getByRole("button", { name: /Take a photo of the parcel/ })).toBeVisible();
  await pause(1200);
  await page.getByLabel("Photo of the parcel").setInputFiles("demo/package.png");
  await expect(page.getByRole("button", { name: /Photo saved/ })).toBeVisible();
  await pause(1800);
  await page.getByRole("button", { name: "I'm on my way to the customer" }).click();
  await pause(800);

  // 3. Turn-by-turn navigation, full screen. The phone drives the first part of the road.
  await caption(page, "Turn-by-turn navigation, like a driver's app");
  await pause(1500);
  await page.getByRole("button", { name: "Start navigation" }).click();
  const nav = page.getByRole("dialog", { name: "Navigation" });
  await expect(nav).toBeVisible();
  await caption(page, null);
  await pause(1500);
  const half = Math.floor(drive.length * 0.55);
  for (let i = 1; i <= half; i++) {
    await ctx.setGeolocation({ latitude: drive[i].lat, longitude: drive[i].lng });
    await pause(380);
  }

  // 4. The customer follows the runner live while the runner finishes the road.
  await become(ctx, null);
  await page.goto(`/track/${code}?k=${key}`);
  await caption(page, "The customer follows the runner, live");
  const live = (async () => {
    for (let i = half + 1; i < drive.length; i++) {
      await runnerApi.patch(`/api/parcels/${code}`, { data: { action: "location", lat: drive[i].lat, lng: drive[i].lng } });
      await new Promise((r) => setTimeout(r, 620));
    }
  })();
  await pause(1200);
  // The runner is a pin on the map, and it moves.
  await page.locator(".gm-style").first().evaluate((el) => el.scrollIntoView({ behavior: "smooth", block: "center" }));
  await pause(4500);
  await page.locator(".tracker").evaluate((el) => el.scrollIntoView({ behavior: "smooth", block: "center" }));
  await pause(2800);
  await live;
  await pause(500);

  // 5. The runner arrives, and the delivery ends with the customer's code.
  await become(ctx, "runner");
  await ctx.setGeolocation({ latitude: DOOR.lat, longitude: DOOR.lng });
  await page.goto(`/runner/${code}`);
  await caption(page, "Delivered only with the customer's code");
  await page.getByRole("button", { name: "I've arrived at the customer" }).click();
  await pause(900);
  const box = page.getByLabel("Ask the customer for their 4-digit code");
  await box.click();
  await box.pressSequentially(pin, { delay: 220 });
  await pause(700);
  await page.getByRole("button", { name: "End trip" }).click();
  await expect(page.getByRole("heading", { name: "Done. Enkosi!" })).toBeVisible();
  await pause(1800);

  // 6. The customer sees it arrive, with the photo.
  await become(ctx, null);
  await page.goto(`/track/${code}?k=${key}`);
  await caption(page, "Delivered. Enkosi!");
  await pause(2800);
  await caption(page, "Izza. Bringing it closer.");
  await pause(2200);

  const video = page.video();
  await ctx.close();
  copyFileSync(await video!.path(), "demo/izza-demo.webm");
});
