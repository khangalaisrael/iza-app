import { readFileSync, mkdirSync, copyFileSync } from "node:fs";
import { devices, expect, request as pwRequest, test, type BrowserContext, type Page } from "@playwright/test";
import { authFile, type Role } from "./fixtures";

// The pitch video: one long delivery from Woolsack Residence (the hub) to Mfuleni, about 20 km away. It opens on the customer typing the
// place. The parts that matter are held for a fixed time so the story is easy to cut to: typing the place 2.5 s, the trip on a
// zoomed-out map 6 s, typing the delivery code 3 s, the photo (zooming in) 4 s, the four finished steps 2.5 s, and "Delivered. Enkosi!"
// zoomed in for 2 s. The booking, the hub's hand-over and the runner taking the job happen before the recording starts. One phone, one
// recording: the same browser swaps between the runner and the customer.

const PHOTO = "demo/package-blur.jpg"; // the photo the runner takes, with the children's faces softened (scripts/blur-faces.mjs)
const HUB = { name: "Woolsack Residence", lat: -33.9573, lng: 18.4633 }; // near the UCT residence, on Woolsack Drive

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
        "position:fixed;top:10px;left:10px;right:10px;z-index:2147483647;display:flex;gap:12px;align-items:center;padding:12px 14px;border-radius:18px;background:rgba(255,255,255,.97);box-shadow:0 10px 30px rgba(0,0,0,.35);font-family:system-ui,sans-serif;color:#1d1a16;transform:translateY(-120px);transition:transform .45s ease";
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

test("record the pitch video", async ({ browser, baseURL }) => {
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

  // The recording: a phone that starts at the hub.
  const ctx = await browser.newContext({
    ...devices["Pixel 7"],
    baseURL,
    permissions: ["geolocation"],
    geolocation: { latitude: HUB.lat, longitude: HUB.lng },
    recordVideo: { dir: "demo/raw", size: { width: 412, height: 839 } },
  });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    const style = document.createElement("style");
    style.textContent = ".waFab{display:none!important}";
    document.addEventListener("DOMContentLoaded", () => document.head.appendChild(style));
  });
  const pause = (ms: number) => page.waitForTimeout(ms);
  const customerUrl = `/track/${code}?k=${key}`;

  // 1. The customer types where they are: Mfuleni. 2.5 seconds of typing.
  await become(ctx, null);
  await page.goto(customerUrl);
  await expect(page.getByText("Tell us exactly where you are.")).toBeVisible();
  await caption(page, `${HUB.name}  →  Mfuleni`);
  const where = page.getByLabel("Where should we bring it?");
  await where.click();
  await where.pressSequentially("Mfuleni", { delay: 360 });
  const suggestion = page.getByRole("listbox", { name: "Suggested places" }).getByRole("option").first();
  await expect(suggestion).toBeVisible();
  await pause(700);
  await suggestion.click();
  await expect(page.getByText("Location saved.")).toBeVisible();
  await pause(900);
  const saved = page.waitForRequest((r) => r.method() === "PATCH" && r.url().includes(`/api/parcels/${code}`) && (r.postData() ?? "").includes("choose"));
  await page.getByRole("button", { name: "Save my choice" }).click();
  const sent = JSON.parse((await saved).postData() ?? "{}");
  const door: Pt = { lat: sent.lat, lng: sent.lng };
  expect(Number.isFinite(door.lat) && Number.isFinite(door.lng)).toBeTruthy();
  await expect(page.getByText("Saved. Thank you!")).toBeVisible();
  const pin = (await page.locator(".pinCard .bigCode").innerText()).trim();
  await caption(page, "Saved. The runner can see where to go");
  await pause(900);

  // The road the runner takes, from the real routing service the app uses.
  const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${HUB.lng},${HUB.lat};${door.lng},${door.lat}?overview=full&geometries=geojson`);
  const road: Pt[] = (await res.json()).routes[0].geometry.coordinates.map(([lng, lat]: number[]) => ({ lat, lng }));
  const drive = along(road, 300);
  const at = (p: number) => drive[Math.min(drive.length - 1, Math.round(p * (drive.length - 1)))];

  // 2. The runner collects it, photographs it, and sets off.
  await become(ctx, "runner");
  await page.goto(`/runner/${code}`);
  await expect(page.getByRole("region", { name: "Your next step" })).toBeVisible();
  await caption(page, "The runner collects it at the hub");
  await pause(900);
  await page.getByRole("button", { name: /I've collected it from/ }).click();
  await caption(page, "And photographs the parcel");
  await expect(page.getByRole("button", { name: /Take a photo of the parcel/ })).toBeVisible();
  await pause(600);
  await page.getByLabel("Photo of the parcel").setInputFiles(PHOTO);
  await expect(page.getByRole("button", { name: /Photo saved/ })).toBeVisible();
  await pause(600);
  await page.getByRole("button", { name: "I'm on my way to the customer" }).click();
  await caption(page, "Turn-by-turn to Mfuleni");
  await pause(700);
  await page.getByRole("button", { name: "Start navigation" }).click();
  const nav = page.getByRole("dialog", { name: "Navigation" });
  await expect(nav).toBeVisible();
  // The route for a long trip takes a moment to arrive.
  await expect(nav.locator(".navTop")).not.toContainText("Finding the route", { timeout: 30000 });
  await pause(500);

  // 3. The whole trip, zoomed out so the area can be seen. 6 seconds, sped up.
  await nav.getByRole("button", { name: "Whole trip" }).click();
  await caption(page, null);
  await pause(1200);
  await badge(page, true);
  await over(6000, async (p) => {
    const here = at(p);
    await ctx.setGeolocation({ latitude: here.lat, longitude: here.lng });
    await pause(70);
  });
  await badge(page, false);
  await expect(nav.locator(".navTop")).toContainText("You have arrived", { timeout: 20000 });
  await pause(500);
  await nav.getByRole("button", { name: "Done" }).click();
  await page.getByRole("button", { name: "I've arrived at the customer" }).click();

  // 4. The customer's code, then the runner types it for real: 3 seconds.
  await become(ctx, null);
  await page.goto(customerUrl);
  await page.locator(".pinCard").evaluate((el) => el.scrollIntoView({ block: "center" }));
  await caption(page, "The customer has a 4-digit code");
  await pause(1300);
  await become(ctx, "runner");
  await page.goto(`/runner/${code}`);
  const box = page.getByLabel("Ask the customer for their 4-digit code");
  await box.scrollIntoViewIfNeeded();
  await caption(page, "The runner types it to finish");
  await pause(300);
  await box.click();
  await box.pressSequentially(pin, { delay: 700 });
  await pause(200);
  await page.getByRole("button", { name: "End trip" }).click();
  await expect(page.getByRole("heading", { name: "Done. Enkosi!" })).toBeVisible();

  // 5. The picture the customer gets, for 4 seconds. It zooms in on the child holding the muffin, so the eye knows where to look.
  await become(ctx, null);
  await page.goto(customerUrl);
  await expect(page.getByRole("heading", { name: "Delivered. Enkosi!" })).toBeVisible();
  const photo = page.getByAltText("Your parcel at the door");
  await expect(photo).toBeVisible();
  await page.getByRole("heading", { name: "Photo from the runner" }).evaluate((el) => el.scrollIntoView({ block: "start" }));
  await caption(page, "The customer sees the delivery photo");
  await photo.evaluate((img) => {
    const frame = img.parentElement as HTMLElement;
    frame.style.overflow = "hidden";
    frame.style.borderRadius = "12px";
    img.style.transformOrigin = "58% 46%";
    img.animate([{ transform: "scale(1)" }, { transform: "scale(1.9)" }], { duration: 3400, delay: 400, easing: "ease-in-out", fill: "forwards" });
  });
  await pause(4000);

  // 6. All four steps, finished: the updates the customer got. 2.5 seconds.
  await page.locator(".tracker").evaluate((el) => el.scrollIntoView({ block: "center" }));
  await caption(page, "An update at every step");
  await pause(2500);

  // 7. Delivered, and the customer is told. Zoomed in for 2 seconds, and the video ends.
  await page.evaluate(() => window.scrollTo({ top: 0 }));
  await caption(page, null);
  await notification(page, code, "Delivered. Trip ended. Enkosi!");
  await page.locator(".hero").evaluate((hero) => {
    (hero as HTMLElement).style.overflow = "hidden";
    const words = hero.querySelector("h1") as HTMLElement;
    words.style.transformOrigin = "0% 50%";
    words.animate([{ transform: "scale(1)" }, { transform: "scale(1.3)" }], { duration: 1600, delay: 300, easing: "ease-in-out", fill: "forwards" });
  });
  await pause(2000);

  const video = page.video();
  await ctx.close();
  mkdirSync("demo", { recursive: true });
  copyFileSync(await video!.path(), "demo/izza-demo.webm");
});
