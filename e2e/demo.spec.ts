import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { devices, expect, request as pwRequest, test, type BrowserContext, type Page } from "@playwright/test";
import { authFile, type Role } from "./fixtures";

// The pitch video: one long delivery from Woolsack Residence (the hub) to Mfuleni, about 20 km away. It opens on the customer typing the
// place, and every part that matters is held for a fixed time so the story is easy to cut to: typing the place 1.5 s, the trip on a
// zoomed-out map 4 s, typing the delivery code 3 s, the photo (zooming in) 3 s, the four finished steps 2 s, and "Delivered. Enkosi!" 1 s.
//
// It is recorded as full-resolution frames rather than with Playwright's own video, which is soft. The waits between screens (pages
// loading, the route being fetched, the photo uploading) happen with the recording paused, so they never appear in the video. The
// phone is then placed in the middle of a 1920 x 1080 landscape picture. The booking, the hub's hand-over and the runner taking the job
// happen before the recording starts. One phone: the same browser swaps between the runner and the customer.

const PHOTO = "demo/package-blur.jpg"; // the photo the runner took, with the children's faces softened (scripts/blur-faces.mjs)
const HUB = { name: "Woolsack Residence", lat: -33.9573, lng: 18.4633 }; // near the UCT residence, on Woolsack Drive
const FPS = 30;
const BACKDROP = "0x17291f"; // the dark green of the Izza header

type Pt = { lat: number; lng: number };
type Frame = { t: number; jpg: Buffer };

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
        "position:fixed;top:58px;left:50%;transform:translateX(-50%);z-index:2147483647;max-width:94vw;padding:10px 18px;border-radius:999px;background:#1d1a16;color:#fff;font:700 15px system-ui,sans-serif;text-align:center;box-shadow:0 6px 24px rgba(0,0,0,.35);pointer-events:none;white-space:nowrap";
      document.body.appendChild(el);
    }
    el.textContent = t;
  }, text);
}

// What the customer's phone shows when the parcel is delivered. The app sends this as a phone notification, which a screen recording
// of a browser cannot capture, so the banner is drawn over the page with the app's own wording.
async function notification(page: Page, code: string, text: string) {
  await page.evaluate(
    ([c, t]) => {
      const el = document.createElement("div");
      el.style.cssText =
        "position:fixed;top:10px;left:10px;right:10px;z-index:2147483647;display:flex;gap:12px;align-items:center;padding:12px 14px;border-radius:18px;background:rgba(255,255,255,.97);box-shadow:0 10px 30px rgba(0,0,0,.35);font-family:system-ui,sans-serif;color:#1d1a16;transform:translateY(-120px);transition:transform .35s ease";
      el.innerHTML =
        '<div style="width:38px;height:38px;border-radius:10px;background:#c8641e;color:#fff;display:grid;place-items:center;font:800 20px system-ui">i</div>' +
        '<div style="line-height:1.3"><div style="font-size:12px;color:#6b6258">Izza · now</div><div style="font-weight:700;font-size:15px">Parcel ' + c + '</div><div style="font-size:14px">' + t + "</div></div>";
      document.body.appendChild(el);
      requestAnimationFrame(() => requestAnimationFrame(() => (el.style.transform = "translateY(0)")));
    },
    [code, text],
  );
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

// Runs a step for a fixed length of time, handing it how far through (0 to 1) it is, so each part of the video is exactly as long as asked.
async function over(ms: number, step: (progress: number) => Promise<void>) {
  const start = Date.now();
  for (;;) {
    const p = Math.min(1, (Date.now() - start) / ms);
    await step(p);
    if (p >= 1) return;
  }
}

// The small ffmpeg that Playwright installs for its own recordings. It reads a stream of JPEGs and writes WebM.
function ffmpegPath() {
  const base = join(process.env.LOCALAPPDATA ?? join(process.env.HOME ?? "", ".cache"), "ms-playwright");
  const dir = readdirSync(base).find((d) => d.startsWith("ffmpeg-"));
  if (!dir) throw new Error("Playwright's ffmpeg was not found. Run: npx playwright install ffmpeg");
  return join(base, dir, readdirSync(join(base, dir)).find((f) => /^ffmpeg-/.test(f))!);
}

// Steady 30 frames a second from the frames the browser gave us, each shown until the next arrives, placed on a landscape picture.
async function encode(frames: Frame[], endMs: number, out: string) {
  const ff = spawn(
    ffmpegPath(),
    [
      "-hide_banner", "-loglevel", "error", "-y",
      "-f", "image2pipe", "-c:v", "mjpeg", "-framerate", String(FPS), "-i", "pipe:0",
      "-vf", `scale=-2:1080:flags=lanczos,pad=1920:1080:(ow-iw)/2:0:color=${BACKDROP}`,
      "-c:v", "libvpx-vp9", "-crf", "16", "-b:v", "0", "-quality", "good", "-cpu-used", "2", "-row-mt", "1", "-pix_fmt", "yuv420p", "-an", out,
    ],
    { stdio: ["pipe", "inherit", "inherit"] },
  );
  const done = new Promise<void>((resolve, reject) => {
    ff.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited with ${code}`))));
    ff.on("error", reject);
  });
  let i = 0;
  const ticks = Math.floor((endMs / 1000) * FPS);
  for (let k = 0; k < ticks; k++) {
    const at = (k * 1000) / FPS;
    while (i + 1 < frames.length && frames[i + 1].t <= at) i++;
    if (!ff.stdin.write(frames[i].jpg)) await new Promise((r) => ff.stdin.once("drain", r));
  }
  ff.stdin.end();
  await done;
}

test("record the pitch video", async ({ browser, baseURL }) => {
  test.setTimeout(300_000);
  const origin = baseURL!;
  const api = (role: Role) => pwRequest.newContext({ baseURL: origin, storageState: authFile(role), extraHTTPHeaders: { origin } });

  // Off camera: the team puts Woolsack Residence on the map, and a business books a door delivery from it without knowing the address.
  const adminCtx = await browser.newContext({
    baseURL,
    storageState: authFile("admin"),
    geolocation: { latitude: HUB.lat, longitude: HUB.lng },
    permissions: ["geolocation"],
  });
  const admin = await adminCtx.newPage();
  await admin.goto("/ops");
  const form = admin.getByRole("region", { name: "Add an Izza point" });
  await form.getByLabel("Name of the place").fill(HUB.name);
  await form.getByLabel("What kind of place is it?").selectOption("Res reception");
  await form.getByRole("button", { name: "Use my location" }).click();
  await expect(form.getByText("Location saved.")).toBeVisible();
  await form.getByLabel("When is it open?").fill("07:00 to 20:00");
  await form.getByRole("button", { name: "Add this Izza point" }).click();
  await expect(admin).toHaveURL(/added=1/);
  await adminCtx.close();

  const biz = await browser.newContext({ baseURL, storageState: authFile("business") });
  const sendPage = await biz.newPage();
  await sendPage.goto("/send");
  const hubId = await sendPage.getByRole("radio", { name: new RegExp(HUB.name) }).getAttribute("value");
  await biz.close();
  expect(hubId).toBeTruthy();

  const business = await api("business");
  const booked = await business.post("/api/parcels", { data: { toName: "Mfuleni ECD Centre", toPhone: "0825550100", pointId: hubId, delivery: "door" } });
  expect(booked.ok()).toBeTruthy();
  const { code, key } = await booked.json();
  const adminApi = await api("admin");
  expect((await adminApi.patch(`/api/parcels/${code}`, { data: { action: "receive", paid: true } })).ok()).toBeTruthy();
  const runnerApi = await api("runner");
  expect((await runnerApi.patch(`/api/parcels/${code}`, { data: { action: "accept" } })).ok()).toBeTruthy();

  // The recording: a phone that starts at the hub, captured as full-resolution frames.
  const ctx = await browser.newContext({
    ...devices["Pixel 7"],
    baseURL,
    permissions: ["geolocation"],
    geolocation: { latitude: HUB.lat, longitude: HUB.lng },
  });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    const style = document.createElement("style");
    style.textContent = ".waFab{display:none!important}";
    document.addEventListener("DOMContentLoaded", () => document.head.appendChild(style));
  });

  const frames: Frame[] = [];
  const t0 = Date.now();
  let skipped = 0;
  let pausedAt = 0;
  let paused = true;
  const clock = () => Date.now() - t0 - skipped;
  const cdp = await ctx.newCDPSession(page);
  let lastKept = -100;
  cdp.on("Page.screencastFrame", (f) => {
    void cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
    if (paused) return;
    const t = clock();
    if (t - lastKept < 1000 / FPS - 4) return; // no more than 30 a second
    lastKept = t;
    frames.push({ t, jpg: Buffer.from(f.data, "base64") });
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, everyNthFrame: 1 });

  const shot = async () => frames.push({ t: clock(), jpg: await page.screenshot({ type: "jpeg", quality: 92, scale: "device" }) });
  // Things that happen between two screens run with the recording paused, and the screen they end on is captured fresh.
  async function off<T>(fn: () => Promise<T>): Promise<T> {
    paused = true;
    pausedAt = Date.now();
    try {
      return await fn();
    } finally {
      skipped += Date.now() - pausedAt;
      await shot();
      paused = false;
    }
  }
  const pause = (ms: number) => page.waitForTimeout(ms);
  const customerUrl = `/track/${code}?k=${key}`;

  // 1. The customer types where they are: Mfuleni. 1.5 seconds of typing.
  await off(async () => {
    await become(ctx, null);
    await page.goto(customerUrl);
    await expect(page.getByText("Tell us exactly where you are.")).toBeVisible();
    await caption(page, `${HUB.name}  →  Mfuleni`);
  });
  const where = page.getByLabel("Where should we bring it?");
  await where.click();
  await where.pressSequentially("Mfuleni", { delay: 214 });
  const suggestion = page.getByRole("listbox", { name: "Suggested places" }).getByRole("option").first();
  await off(async () => expect(suggestion).toBeVisible());
  await pause(600);
  await suggestion.click();
  await off(async () => expect(page.getByText("Location saved.")).toBeVisible());
  await pause(600);

  // Saving, and the rest of the runner's job up to the road, happen between screens.
  let pin = "";
  let door: Pt = { lat: 0, lng: 0 };
  let road: Pt[] = [];
  await off(async () => {
    const saved = page.waitForRequest((r) => r.method() === "PATCH" && r.url().includes(`/api/parcels/${code}`) && (r.postData() ?? "").includes("choose"));
    await page.getByRole("button", { name: "Save my choice" }).click();
    const sent = JSON.parse((await saved).postData() ?? "{}");
    door = { lat: sent.lat, lng: sent.lng };
    expect(Number.isFinite(door.lat) && Number.isFinite(door.lng)).toBeTruthy();
    await expect(page.getByText("Saved. Thank you!")).toBeVisible();
    pin = (await page.locator(".pinCard .bigCode").innerText()).trim();
    await caption(page, "Saved. The runner can see where to go");
    // The runner collects it at the hub, photographs it and sets off.
    expect((await runnerApi.patch(`/api/parcels/${code}`, { data: { action: "pickup_from_point" } })).ok()).toBeTruthy();
    const photo = `data:image/jpeg;base64,${readFileSync(PHOTO).toString("base64")}`;
    expect((await runnerApi.post(`/api/parcels/${code}/photo`, { data: { image: photo } })).ok()).toBeTruthy();
    expect((await runnerApi.patch(`/api/parcels/${code}`, { data: { action: "update", kind: "heading_customer" } })).ok()).toBeTruthy();
    // The road the runner takes, from the real routing service the app uses.
    const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${HUB.lng},${HUB.lat};${door.lng},${door.lat}?overview=full&geometries=geojson`);
    road = (await res.json()).routes[0].geometry.coordinates.map(([lng, lat]: number[]) => ({ lat, lng }));
  });
  const drive = along(road, 300);
  const at = (p: number) => drive[Math.min(drive.length - 1, Math.round(p * (drive.length - 1)))];
  await pause(800);

  // 2. The whole trip, zoomed out so the area can be seen: 4 seconds, sped up.
  const nav = page.getByRole("dialog", { name: "Navigation" });
  await off(async () => {
    await become(ctx, "runner");
    await page.goto(`/runner/${code}`);
    await page.getByRole("button", { name: "Start navigation" }).click();
    await expect(nav).toBeVisible();
    await expect(nav.locator(".navTop")).not.toContainText("Finding the route", { timeout: 30000 });
    await nav.getByRole("button", { name: "Whole trip" }).click();
    await page.waitForTimeout(1800);
    await caption(page, "Turn-by-turn to Mfuleni");
    await badge(page, true);
  });
  await over(4000, async (p) => {
    const here = at(p);
    await ctx.setGeolocation({ latitude: here.lat, longitude: here.lng });
    await pause(60);
  });
  await off(async () => {
    await expect(nav.locator(".navTop")).toContainText("You have arrived", { timeout: 20000 });
    await badge(page, false);
    await caption(page, null);
  });
  await pause(500);
  await off(async () => {
    await nav.getByRole("button", { name: "Done" }).click();
    await page.getByRole("button", { name: "I've arrived at the customer" }).click();
  });

  // 3. The customer's code, then the runner types it for real: 3 seconds.
  await off(async () => {
    await become(ctx, null);
    await page.goto(customerUrl);
    await page.locator(".pinCard").evaluate((el) => el.scrollIntoView({ block: "center" }));
    await caption(page, "The customer has a 4-digit code");
  });
  await pause(1200);
  await off(async () => {
    await become(ctx, "runner");
    await page.goto(`/runner/${code}`);
    await page.getByLabel("Ask the customer for their 4-digit code").scrollIntoViewIfNeeded();
    await caption(page, "The runner types it to finish");
  });
  const box = page.getByLabel("Ask the customer for their 4-digit code");
  await pause(300);
  await box.click();
  await box.pressSequentially(pin, { delay: 700 });
  await pause(200);
  await off(async () => {
    await page.getByRole("button", { name: "End trip" }).click();
    await expect(page.getByRole("heading", { name: "Done. Enkosi!" })).toBeVisible();
  });

  // 4. The picture the customer gets, for 3 seconds. It zooms in on the child holding the muffin, so the eye knows where to look.
  const photo = page.getByAltText("Your parcel at the door");
  await off(async () => {
    await become(ctx, null);
    await page.goto(customerUrl);
    await expect(page.getByRole("heading", { name: "Delivered. Enkosi!" })).toBeVisible();
    await expect(photo).toBeVisible();
    await page.waitForFunction(() => (document.querySelector('img[alt="Your parcel at the door"]') as HTMLImageElement | null)?.complete === true);
    await page.getByRole("heading", { name: "Photo from the runner" }).evaluate((el) => el.scrollIntoView({ block: "start" }));
    await caption(page, "The customer sees the delivery photo");
    await photo.evaluate((img) => {
      const frame = img.parentElement as HTMLElement;
      frame.style.overflow = "hidden";
      frame.style.borderRadius = "12px";
      img.style.transformOrigin = "58% 46%";
      img.animate([{ transform: "scale(1)" }, { transform: "scale(1.9)" }], { duration: 2600, delay: 250, easing: "ease-in-out", fill: "forwards" });
    });
  });
  await pause(3000);

  // 5. All four steps, finished: the updates the customer got. 2 seconds.
  await off(async () => {
    await page.locator(".tracker").evaluate((el) => el.scrollIntoView({ block: "center" }));
    await caption(page, "An update at every step");
  });
  await pause(2000);

  // 6. Delivered, and the customer is told. Zoomed in for 1 second, and the video ends.
  await off(async () => {
    await page.evaluate(() => window.scrollTo({ top: 0 }));
    await caption(page, null);
  });
  await notification(page, code, "Delivered. Trip ended. Enkosi!");
  await page.locator(".hero").evaluate((hero) => {
    (hero as HTMLElement).style.overflow = "hidden";
    const words = hero.querySelector("h1") as HTMLElement;
    words.style.transformOrigin = "0% 50%";
    words.animate([{ transform: "scale(1)" }, { transform: "scale(1.3)" }], { duration: 800, delay: 100, easing: "ease-in-out", fill: "forwards" });
  });
  await pause(1000);
  const end = clock();
  await cdp.send("Page.stopScreencast");
  await ctx.close();

  expect(frames.length).toBeGreaterThan(30);
  mkdirSync("demo", { recursive: true });
  await encode(frames, end, "demo/izza-demo.webm");
});
