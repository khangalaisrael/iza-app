import { authFile, expect, test, topMenu } from "./fixtures";

// Somewhere in Langa, close to the Fresh Cuts Barber Izza point.
const NEAR_BARBER = { latitude: -33.9426, longitude: 18.5319 };

test("the runner gets directions inside the page for a door delivery from a hub", async ({ as, baseURL }) => {
  const business = await (await as("business")).newPage();
  await business.goto("/send");
  await business.getByText("Corner Shop", { exact: true }).click();
  await business.getByLabel("Their name").fill("Location Test");
  await business.getByLabel("Their WhatsApp number").fill("086 222 3333");
  await business.getByText("Bring to their door").click();
  await business.getByLabel("Their address or landmark").fill("Blue gate, Main Rd");
  await business.getByRole("button", { name: "Book it" }).click();
  await expect(business.getByText("Enkosi! It's booked.")).toBeVisible();
  const code = (await business.locator(".bigCode").innerText()).trim();

  // The hub takes it in, and the delivery is open to a runner.
  const hub = await as("point");
  const received = await hub.request.patch(`/api/parcels/${code}`, { data: { action: "receive", paid: true }, headers: { origin: baseURL! } });
  expect(received.ok()).toBeTruthy();

  const runner = await (await as("runner")).newPage();
  await runner.goto("/runner");
  await runner.locator("article", { hasText: code }).getByRole("button", { name: "Accept this delivery" }).click();
  const directions = runner.getByRole("region", { name: /Directions to/ });
  await expect(directions).toBeVisible();
  await expect(directions.getByText("Going to")).toBeVisible();
});

test("a booking needs a name, a number and a hub, and says so plainly", async ({ as }) => {
  const page = await (await as("business")).newPage();
  await page.goto("/send");
  await page.getByRole("button", { name: "Book it" }).click();
  await expect(page.locator("form [role=alert]")).toContainText("who the parcel is for");
  await page.getByLabel("Their name").fill("Someone");
  await page.getByLabel("Their WhatsApp number").fill("12");
  await page.getByRole("button", { name: "Book it" }).click();
  await expect(page.locator("form [role=alert]")).toContainText("WhatsApp number");
  await page.getByLabel("Their WhatsApp number").fill("082 345 6789");
  await page.getByRole("button", { name: "Book it" }).click();
  await expect(page.locator("form [role=alert]")).toContainText("Choose which Izza point");
});

test("typing their address shows suggestions, and choosing one saves its location", async ({ as }) => {
  const page = await (await as("business")).newPage();
  // Pretend to be Google, so the test does not depend on the internet.
  await page.route("https://places.googleapis.com/v1/places:autocomplete", (route) =>
    route.fulfill({
      json: { suggestions: [{ placePrediction: { placeId: "abc", text: { text: "Langa, Cape Town, South Africa" } } }] },
    }),
  );
  await page.route("https://places.googleapis.com/v1/places/abc*", (route) =>
    route.fulfill({ json: { location: { latitude: -33.9437, longitude: 18.5305 } } }),
  );

  await page.goto("/send");
  await page.getByText("Bring to their door").click();
  await page.getByLabel("Their address or landmark").fill("Langa");
  const option = page.getByRole("option", { name: "Langa, Cape Town, South Africa" });
  await expect(option).toBeVisible();
  await option.click();
  await expect(page.getByLabel("Their address or landmark")).toHaveValue("Langa, Cape Town, South Africa");
  await expect(page.getByText("Location saved.")).toBeVisible();
});

test("the points finder lists approved points and puts the closest one first", async ({ browser, baseURL }) => {
  const ctx = await browser.newContext({ baseURL, geolocation: NEAR_BARBER, permissions: ["geolocation"] });
  const page = await ctx.newPage();
  await page.goto("/points");
  await expect(page.getByRole("heading", { name: "Izza points near you" })).toBeVisible();
  // The three seeded points are there, and others may have been added by other tests.
  await expect.poll(() => page.locator("ul.plainList > li").count()).toBeGreaterThanOrEqual(3);

  await page.getByRole("button", { name: "Use my location" }).click();
  const first = page.locator("ul.plainList > li").first();
  await expect(first).toContainText("Fresh Cuts Barber");
  await expect(first).toContainText("closest to you");
  await expect(first.getByRole("link", { name: "Directions" })).toHaveAttribute("href", /google\.com\/maps\/dir/);

  // Narrow it down by type, as on the design.
  await page.getByLabel("Type of point").selectOption("Salon and barber");
  await expect(page.locator("ul.plainList > li")).toHaveCount(1);
  await expect(page.locator("ul.plainList > li").first()).toContainText("Fresh Cuts Barber");

  // Sending mode links each point to the booking form.
  await page.getByRole("button", { name: "I'm sending" }).click();
  await expect(page.getByRole("link", { name: "Send here" })).toHaveAttribute("href", /\/send\?point=/);
  await ctx.close();
});

test("collect nearby still works when location is refused", async ({ page }) => {
  await page.goto("/collect");
  await page.getByRole("button", { name: "Use my location" }).click();
  await expect(page.locator("p.problem[role=alert]")).toBeVisible();
  await expect.poll(() => page.locator("ul.plainList > li").count()).toBeGreaterThanOrEqual(3);
});

test("a parcel waiting at a shop shows up under Ready for you for the person it is addressed to", async ({ as }) => {
  const page = await (await as("customer")).newPage();
  await page.goto("/collect");
  const ready = page.getByRole("region", { name: "Ready for you" });
  await expect(ready).toContainText("IZA-4825");
  await expect(ready.getByRole("link", { name: "Directions" }).first()).toBeVisible();
});

test("the runner has a map with a find-my-location button that works on a computer too", async ({ browser, baseURL }) => {
  const ctx = await browser.newContext({
    baseURL,
    storageState: authFile("runner"),
    viewport: { width: 1280, height: 800 },
    geolocation: { latitude: -33.9441, longitude: 18.5298 },
    permissions: ["geolocation"],
  });
  const page = await ctx.newPage();
  await page.goto("/runner");
  await expect(page.getByRole("heading", { name: "Jobs you can take" })).toBeVisible();
  // On a computer the list and the map sit side by side.
  const list = await page.getByRole("heading", { name: "Jobs you can take" }).boundingBox();
  const map = await page.getByRole("complementary", { name: "Map" }).boundingBox();
  expect(map!.x).toBeGreaterThan(list!.x + 300);

  await page.getByRole("button", { name: "Find my location" }).click();
  await expect(page.getByRole("button", { name: "Find me again" })).toBeVisible();
  await ctx.close();
});

test("the home screen is for customers, and everyone who works is taken to their own place", async ({ as }) => {
  const customer = await (await as("customer")).newPage();
  await customer.goto("/");
  await expect(customer.getByRole("link", { name: /Earn with Izza/ })).toBeVisible();
  await expect((await topMenu(customer)).getByText("For my business", { exact: true })).toHaveCount(0);

  const lands: [Parameters<typeof as>[0], RegExp][] = [
    ["runner", /\/runner$/],
    ["point", /\/point$/],
    ["business", /\/parcels$/],
    ["admin", /\/ops$/],
  ];
  for (const [role, url] of lands) {
    const page = await (await as(role)).newPage();
    await page.goto("/");
    await expect(page, role).toHaveURL(url);
  }
});

test("the home page explains Izza, with a code box and big buttons", async ({ page }) => {
  await page.goto("/");
  for (const name of ["How Izza works", "Then you choose", "Safe, because it is local", "Izza is for everyone on the street"]) {
    await expect(page.getByRole("heading", { name })).toBeVisible();
  }
  await expect(page.getByLabel("Parcel code")).toBeVisible();
  const small = await page.evaluate(
    () =>
      [...document.querySelectorAll("a.btn, button.btn, a.tile, a.tab")]
        .map((el) => el.getBoundingClientRect())
        .filter((r) => r.height > 0 && r.height < 44).length,
  );
  expect(small).toBe(0);
});
