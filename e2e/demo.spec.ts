import { readFileSync, mkdirSync, copyFileSync } from "node:fs";
import { devices, expect, test, type BrowserContext, type Page } from "@playwright/test";
import { authFile, type Role } from "./fixtures";

// The pitch video: a sender books a door delivery, the hub takes it in, a runner takes the job, and the customer follows it.
// One phone, one recording. The same browser switches between the four people by swapping the saved sign-in.

async function become(ctx: BrowserContext, role: Role) {
  await ctx.clearCookies();
  await ctx.addCookies(JSON.parse(readFileSync(authFile(role), "utf8")).cookies);
}

// A caption in a dark pill at the top of the screen, so a viewer with the sound off still follows the story.
async function caption(page: Page, text: string) {
  await page.evaluate((t) => {
    let el = document.getElementById("demo-cap");
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

test("record the pitch video", async ({ browser, baseURL }) => {
  const ctx = await browser.newContext({
    ...devices["Pixel 7"],
    baseURL,
    recordVideo: { dir: "demo/raw", size: { width: 412, height: 839 } },
  });
  const page = await ctx.newPage();
  // The floating chat button covers a corner of the screen and says nothing about the story.
  await page.addInitScript(() => {
    const style = document.createElement("style");
    style.textContent = ".waFab{display:none!important}";
    document.addEventListener("DOMContentLoaded", () => document.head.appendChild(style));
  });
  // Everything is held longer than a quick test would, so a viewer can read each screen.
  const SLOW = 1.3;
  const pause = (ms: number) => page.waitForTimeout(ms * SLOW);
  const type = async (label: string, text: string) => {
    const box = page.getByLabel(label);
    await box.click();
    await box.pressSequentially(text, { delay: 70 });
  };

  // 1. The sender
  await become(ctx, "business");
  await page.goto("/send");
  await page.waitForLoadState("networkidle");
  await caption(page, "1 · The sender picks a hub");
  await pause(1300);
  await page.getByText("Corner Shop", { exact: true }).click();
  await pause(800);
  await caption(page, "2 · Says who it is for");
  await type("Their name", "Nokuthula");
  await type("Their WhatsApp number", "082 555 0100");
  await page.getByText("Bring to their door").click();
  await type("Their address or landmark", "Blue gate, 14 Mqhayi St");
  // Place suggestions can open over the button while someone types. Close them.
  await page.keyboard.press("Escape");
  await page.getByRole("heading", { name: "3 How do they get it?" }).click();
  await page.mouse.wheel(0, 500);
  await pause(900);
  await page.getByRole("button", { name: "Book it" }).click();
  await expect(page.getByText("Enkosi! It's booked.")).toBeVisible();
  await caption(page, "3 · The sender drops it at the hub");
  const code = (await page.locator(".bigCode").innerText()).trim();
  const href = decodeURIComponent((await page.getByRole("link", { name: /^Send (the code|them the link) on WhatsApp$/ }).getAttribute("href")) ?? "");
  const key = href.match(/[?]k=([A-Za-z0-9_-]+)/)?.[1];
  await pause(2000);
  await page.getByRole("button", { name: /^I've dropped it at / }).click();
  await caption(page, "3 · Confirmed. It's at the hub");
  await pause(2200);

  // 3. The runner
  await become(ctx, "runner");
  await page.goto("/runner");
  await caption(page, "4 · A local runner takes the job");
  await pause(1200);
  await page.locator("article", { hasText: code }).getByRole("button", { name: "Accept this delivery" }).click();
  await pause(1500);
  await page.getByRole("button", { name: /I've collected it from/ }).click();
  await pause(1500);
  await page.getByRole("button", { name: "I'm on my way to the customer" }).click();
  await pause(1500);

  // 4. The customer
  await ctx.clearCookies();
  await page.goto(`/track/${code}?k=${key}`);
  await caption(page, "5 · The customer follows it, live");
  await page.evaluate(() => window.scrollTo(0, 0));
  await pause(1800);
  await page.locator(".tracker").evaluate((el) => el.scrollIntoView({ behavior: "smooth", block: "center" }));
  await pause(3000);
  await caption(page, "Izza. Bringing it closer.");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await pause(2200);

  const video = page.video();
  await ctx.close();
  mkdirSync("demo", { recursive: true });
  copyFileSync(await video!.path(), "demo/izza-demo.webm");
});
