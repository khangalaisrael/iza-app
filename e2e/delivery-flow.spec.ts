import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

const CODE = /^IZA-[2-9A-HJ-NP-Z]{6}$/;

// A business books a parcel to Corner Shop for someone, and gets the code back.
async function book(page: Page, opts: { from: string; to: string; phone: string; point?: string }) {
  await page.goto("/send");
  await page.getByLabel("Pick up from").fill(opts.from);
  await page.getByLabel("Their name").fill(opts.to);
  await page.getByLabel("Their WhatsApp number").fill(opts.phone);
  await page.getByText(opts.point ?? "Corner Shop", { exact: true }).click();
  await page.getByRole("button", { name: "Book it" }).click();
  await expect(page.getByText("Enkosi! It's booked.")).toBeVisible();
  const code = (await page.locator(".bigCode").innerText()).trim();
  expect(code).toMatch(CODE);
  return code;
}

test("the customer collects: business books, runner brings it to the point, the shop hands it over", async ({ as, browser, baseURL }) => {
  const business = await (await as("business")).newPage();
  const code = await book(business, { from: "Thembi's Kitchen", to: "Nomvula", phone: "082 111 2222" });

  // The business gets a WhatsApp message ready to send.
  await expect(business.getByRole("link", { name: "Send the code on WhatsApp" })).toHaveAttribute("href", /wa\.me\/27821112222\?text=.*IZA-/);

  // The customer needs no account. Their code is enough, and they choose to collect.
  const customer = await browser.newPage({ baseURL });
  await customer.goto(`/track/${code}`);
  await expect(customer.getByRole("heading", { name: "How would you like it?" })).toBeVisible();
  await customer.getByText("I'll collect it").click();
  await customer.getByRole("button", { name: "Confirm" }).click();
  await expect(customer.getByText("Saved. Thank you!")).toBeVisible();

  // A runner accepts the collection job and drops it at the point.
  const runner = await (await as("runner")).newPage();
  await runner.goto("/runner");
  const job = runner.locator("article", { hasText: code });
  await expect(job.getByText("Collect from a business")).toBeVisible();
  await job.getByRole("button", { name: "Accept this job" }).click();
  await expect(job.getByRole("button", { name: "I dropped it at the Iza point" })).toBeVisible();
  await job.getByRole("button", { name: "I dropped it at the Iza point" }).click();

  // The parcel is now waiting to be collected, so it is NOT a runner job.
  await runner.reload();
  await expect(runner.locator("article", { hasText: code })).toHaveCount(0);

  // The shop hands it over by code.
  const shop = await (await as("point")).newPage();
  await shop.goto("/point");
  await expect(shop.getByText(code)).toBeVisible();
  await shop.getByLabel("Someone at the counter?").fill(code.toLowerCase());
  await shop.getByRole("button", { name: "Hand over" }).click();
  await expect(shop.getByText(`${code} handed over. Enkosi!`)).toBeVisible();

  await customer.reload();
  await expect(customer.getByRole("heading", { name: "Delivered. Enkosi!" })).toBeVisible();
});

test("the customer asks for their door: a second job appears for runners", async ({ as, browser, baseURL }) => {
  const business = await (await as("business")).newPage();
  const code = await book(business, { from: "Sipho's Spaza", to: "Zanele", phone: "083 333 4444" });

  const customer = await browser.newPage({ baseURL });
  await customer.goto(`/track/${code}`);
  await customer.getByText("Bring it to my door").click();
  // Without a landmark or a pin there is nowhere to bring it.
  await customer.getByRole("button", { name: "Confirm" }).click();
  await expect(customer.locator("form [role=alert]")).toContainText("Tell us where to bring it");
  await customer.getByLabel("Where should we bring it?").fill("Blue gate opposite the Engen");
  await customer.getByRole("button", { name: "Confirm" }).click();
  await expect(customer.getByText("Saved. Thank you!")).toBeVisible();

  const runner = await (await as("runner")).newPage();
  await runner.goto("/runner");
  let job = runner.locator("article", { hasText: code });
  await job.getByRole("button", { name: "Accept this job" }).click();
  await runner.locator("article", { hasText: code }).getByRole("button", { name: "I dropped it at the Iza point" }).click();

  // Now a delivery job: from the point to the customer's door.
  await runner.reload();
  job = runner.locator("article", { hasText: code });
  await expect(job.getByText("Deliver to a door")).toBeVisible();
  await expect(job.getByText("Blue gate opposite the Engen")).toBeVisible();
  await job.getByRole("button", { name: "Accept this delivery" }).click();
  await runner.locator("article", { hasText: code }).getByRole("button", { name: "I delivered it" }).click();

  await customer.reload();
  await expect(customer.getByRole("heading", { name: "Delivered. Enkosi!" })).toBeVisible();
});

test("the shop cannot hand over a parcel the customer wants at their door", async ({ as, browser, baseURL }) => {
  const business = await (await as("business")).newPage();
  const code = await book(business, { from: "Door Test Bakery", to: "Door Test", phone: "084 555 6666" });
  const customer = await browser.newPage({ baseURL });
  await customer.goto(`/track/${code}`);
  await customer.getByText("Bring it to my door").click();
  await customer.getByLabel("Where should we bring it?").fill("Red gate");
  await customer.getByRole("button", { name: "Confirm" }).click();
  await expect(customer.getByText("Saved. Thank you!")).toBeVisible();

  const runner = await as("runner");
  const r = await runner.newPage();
  await r.goto("/runner");
  await r.locator("article", { hasText: code }).getByRole("button", { name: "Accept this job" }).click();
  await r.locator("article", { hasText: code }).getByRole("button", { name: "I dropped it at the Iza point" }).click();

  const shop = await as("point");
  const res = await shop.request.patch(`/api/parcels/${code}`, { data: { action: "collect" } });
  expect(res.status()).toBe(409);
});

test("an unknown parcel code says so", async ({ page }) => {
  await page.goto("/track/NOPE-0000");
  await expect(page.getByText("We couldn't find that code")).toBeVisible();
});

test("a runner cannot report a location for a parcel that is not theirs", async ({ as }) => {
  const ctx = await as("runner");
  const res = await ctx.request.patch("/api/parcels/IZA-4830", {
    data: { action: "location", lat: -33.94, lng: 18.53 },
  });
  expect(res.status()).toBe(403);
});

test("a stranger sees where a parcel is, but not who it is for or where it is going", async ({ as, browser, baseURL }) => {
  const business = await (await as("business")).newPage();
  const code = await book(business, { from: "Secret Bakery", to: "Private Person", phone: "085 777 8888" });

  const stranger = await browser.newPage({ baseURL });
  await stranger.goto(`/track/${code}`);
  await expect(stranger.getByText("A runner will collect it today")).toBeVisible();
  await expect(stranger.getByText("to see more about this parcel")).toBeVisible();
  await expect(stranger.getByText("Secret Bakery")).toHaveCount(0);
  await expect(stranger.getByText("Private Person")).toHaveCount(0);
  await expect(stranger.getByText("0857778888")).toHaveCount(0);
  await stranger.close();
});
