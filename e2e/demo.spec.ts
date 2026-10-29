import { readFileSync, mkdirSync, copyFileSync } from "node:fs";
import { devices, expect, request as pwRequest, test, type BrowserContext, type Page } from "@playwright/test";
import { authFile, type Role } from "./fixtures";

// The pitch video: the delivery, from a runner taking the job to the customer's code. Normal speed, except the two stretches where
// someone is simply travelling, which run fast and say so. The booking and the hub's hand-over happen before the recording starts.
// One phone, one recording: the same browser swaps between the runner and the customer by swapping the saved sign-in.

const HUB_ID = "LANGA-CORNER-02"; // Corner Shop, at -33.944, 18.529

type Pt = { lat: number; lng: number };

async function become(ctx: BrowserContext, role: Role | null) {
  await ctx.clearCookies();
  if (role) await ctx.addCookies(JSON.parse(readFileSync(authFile(role), "utf8")).cookies);
}

// A small "fast forward" tag under the top edge while time is sped up.
async function badge(page: Page, on: boolean) {
  await page.evaluate((show) => {
    let el = document.getElementById("demo-ff");
    if (!show) return el?.remove();
    if (!el) {
      el = document.createElement("div");
      el.id = "demo-ff";
      el.textContent = "Fast forward ››";
      el.style.cssText =
        "position:fixed;top:104px;left:50%;transform:translateX(-50%);z-index:2147483647;padding:8px 16px;border-radius:999px;background:#c8641e;color:#fff;font:700 14px system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.35);pointer-events:none";
      document.body.appendChild(el);
    }
  }, on);
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
  const hub = { lat: -33.944, lng: 18.529 };

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

  // Off camera: a business books a door delivery without knowing the address, and the sender drops it at the hub.
  const business = await api("business");
  const booked = await business.post("/api/parcels", { data: { toName: "Nokuthula", toPhone: "0825550100", pointId: HUB_ID, delivery: "door" } });
  expect(booked.ok()).toBeTruthy();
  const { code, key } = await booked.json();
  const hubApi = await api("point");
  expect((await hubApi.patch(`/api/parcels/${code}`, { data: { action: "receive", paid: true } })).ok()).toBeTruthy();
  const runnerApi = await api("runner");

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

  // 1. A runner takes the job. It is waiting for the customer's address, and the runner can take it now.
  await become(ctx, "runner");
  await page.goto("/runner");
  const card = page.locator("article", { hasText: code });
  await expect(card).toBeVisible();
  await caption(page, "A runner takes the job");
  await pause(1800);
  await card.getByRole("button", { name: "Accept this delivery" }).click();
  // Accepting opens the job, which waits for the address.
  await expect(page.getByRole("status", { name: "Waiting" })).toBeVisible();
  await caption(page, "It waits for the customer's address");
  await pause(2200);

  // 2. The customer puts a pin on the map to say where they are.
  await become(ctx, null);
  await page.goto(`/track/${code}?k=${key}`);
  await caption(page, "The customer pins where they are");
  await expect(page.getByText("Tell us exactly where you are.")).toBeVisible();
  await pause(1200);
  await page.getByRole("button", { name: "Choose on the map instead" }).click();
  const pickerMap = page.locator(".pickerMap .gm-style").first();
  await expect(pickerMap).toBeVisible();
  await pause(1800);
  await pickerMap.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await pause(600);
  const bounds = (await pickerMap.boundingBox())!;
  const saved = page.waitForRequest((r) => r.method() === "PATCH" && r.url().includes(`/api/parcels/${code}`) && (r.postData() ?? "").includes("choose"));
  // Tap an empty bit of street, away from the zoom buttons and the little place icons that take a tap for themselves.
  for (const [dx, dy] of [[-130, 90], [-90, 60], [-60, -40], [20, 70], [-120, -60]]) {
    const x = bounds.x + bounds.width / 2 + dx;
    const y = bounds.y + bounds.height / 2 + dy;
    await page.mouse.move(x, y, { steps: 6 });
    await page.mouse.down();
    await pause(90);
    await page.mouse.up();
    await pause(700);
    if (await page.getByText("Location saved.").isVisible()) break;
    await page.touchscreen.tap(x, y);
    await pause(700);
    if (await page.getByText("Location saved.").isVisible()) break;
  }
  await expect(page.getByText("Location saved.")).toBeVisible();
  await pause(1500);
  await page.getByRole("button", { name: "Save my choice" }).click();
  const sent = JSON.parse((await saved).postData() ?? "{}");
  const door: Pt = { lat: sent.lat, lng: sent.lng };
  expect(Number.isFinite(door.lat) && Number.isFinite(door.lng)).toBeTruthy();
  await expect(page.getByText("Saved. Thank you!")).toBeVisible();
  await caption(page, "Saved. The runner can see it");
  const pin = (await page.locator(".pinCard .bigCode").innerText()).trim();
  await pause(1800);

  // The road the runner takes, from the real routing service the app uses.
  const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${hub.lng},${hub.lat};${door.lng},${door.lat}?overview=full&geometries=geojson`);
  const road: Pt[] = (await res.json()).routes[0].geometry.coordinates.map(([lng, lat]: number[]) => ({ lat, lng }));
  const drive = along(road, 36);

  // 3. The runner's steps have started: collect it, photograph it.
  await become(ctx, "runner");
  await page.goto(`/runner/${code}`);
  await expect(page.getByRole("region", { name: "Your next step" })).toBeVisible();
  await caption(page, "The runner collects it from the hub");
  await pause(1800);
  await page.getByRole("button", { name: /I've collected it from/ }).click();
  await caption(page, "A photo of the parcel, as proof");
  await expect(page.getByRole("button", { name: /Take a photo of the parcel/ })).toBeVisible();
  await pause(900);
  await page.getByLabel("Photo of the parcel").setInputFiles("demo/package.png");
  await expect(page.getByRole("button", { name: /Photo saved/ })).toBeVisible();
  await pause(1500);
  await page.getByRole("button", { name: "I'm on my way to the customer" }).click();
  await caption(page, "Turn-by-turn navigation");
  await pause(1200);
  await page.getByRole("button", { name: "Start navigation" }).click();
  await expect(page.getByRole("dialog", { name: "Navigation" })).toBeVisible();
  await caption(page, null);
  await pause(1500);

  // 4. Fast forward: the phone drives most of the road, quickly.
  await badge(page, true);
  const half = Math.floor(drive.length * 0.7);
  for (let i = 1; i <= half; i++) {
    await ctx.setGeolocation({ latitude: drive[i].lat, longitude: drive[i].lng });
    await pause(110);
  }
  await badge(page, false);

  // 5. What the customer sees: the runner on the map, closing in. Also fast forward.
  await become(ctx, null);
  await page.goto(`/track/${code}?k=${key}`);
  await page.locator(".gm-style").first().evaluate((el) => el.scrollIntoView({ block: "center" }));
  await caption(page, "The customer follows the runner, live");
  await badge(page, true);
  for (let i = half + 1; i < drive.length; i++) {
    await runnerApi.patch(`/api/parcels/${code}`, { data: { action: "location", lat: drive[i].lat, lng: drive[i].lng } });
    await pause(450);
  }
  await pause(1200);
  await badge(page, false);
  await page.locator(".tracker").evaluate((el) => el.scrollIntoView({ behavior: "smooth", block: "center" }));
  await pause(1800);

  // 6. Normal speed again: the runner arrives, and the delivery ends with the customer's code.
  await become(ctx, "runner");
  await ctx.setGeolocation({ latitude: door.lat, longitude: door.lng });
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
  await pause(1600);

  // 7. The customer sees it arrive, with the photo.
  await become(ctx, null);
  await page.goto(`/track/${code}?k=${key}`);
  await caption(page, "Delivered. Enkosi!");
  await pause(2600);
  await caption(page, "Izza. Bringing it closer.");
  await pause(2000);

  const video = page.video();
  await ctx.close();
  copyFileSync(await video!.path(), "demo/izza-demo.webm");
});
