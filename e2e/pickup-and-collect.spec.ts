import { authFile, expect, test } from "./fixtures";

// Somewhere in Langa, close to the Fresh Cuts Barber Iza point.
const NEAR_BARBER = { latitude: -33.9426, longitude: 18.5319 };

test("a business shares its location, and the runner can open the pickup spot in Maps", async ({ browser, baseURL, as }) => {
  const sender = await browser.newContext({
    baseURL,
    storageState: authFile("business"),
    geolocation: { latitude: -33.9441, longitude: 18.5298 },
    permissions: ["geolocation"],
  });
  const page = await sender.newPage();
  await page.goto("/send");
  await page.getByRole("button", { name: "Use my location" }).click();
  await expect(page.getByText("Location saved.")).toBeVisible();
  await page.getByLabel("Their name").fill("Location Test");
  await page.getByLabel("Their WhatsApp number").fill("086 222 3333");
  await page.getByRole("button", { name: "Book it" }).click();
  await expect(page.getByText("Enkosi! It's booked.")).toBeVisible();
  const code = (await page.locator(".bigCode").innerText()).trim();

  const runner = await (await as("runner")).newPage();
  await runner.goto("/runner");
  const link = runner.locator("article", { hasText: code }).getByRole("link", { name: "Open the pickup spot in Maps" });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("href", /destination=-33\.9441,18\.5298/);
  await sender.close();
});

test("a booking needs a pickup place or location, a name, a number and a point, and says so plainly", async ({ as }) => {
  const page = await (await as("business")).newPage();
  await page.goto("/send");
  await page.getByRole("button", { name: "Book it" }).click();
  await expect(page.locator("form [role=alert]")).toContainText("where to collect it");
  await page.getByLabel("Pick up from").fill("Somewhere");
  await page.getByRole("button", { name: "Book it" }).click();
  await expect(page.locator("form [role=alert]")).toContainText("who the parcel is for");
  await page.getByLabel("Their name").fill("Someone");
  await page.getByLabel("Their WhatsApp number").fill("12");
  await page.getByRole("button", { name: "Book it" }).click();
  await expect(page.locator("form [role=alert]")).toContainText("WhatsApp number");
});

test("typing a place shows suggestions, and choosing one saves its location", async ({ as }) => {
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
  await page.getByLabel("Pick up from").fill("Langa");
  const option = page.getByRole("option", { name: "Langa, Cape Town, South Africa" });
  await expect(option).toBeVisible();
  await option.click();
  await expect(page.getByLabel("Pick up from")).toHaveValue("Langa, Cape Town, South Africa");
  await expect(page.getByText("Location saved.")).toBeVisible();
});

test("the points finder lists approved points and puts the closest one first", async ({ browser, baseURL }) => {
  const ctx = await browser.newContext({ baseURL, geolocation: NEAR_BARBER, permissions: ["geolocation"] });
  const page = await ctx.newPage();
  await page.goto("/points");
  await expect(page.getByRole("heading", { name: "Iza points near you" })).toBeVisible();
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

test("the home screen shows each person only the extra door that is theirs", async ({ as }) => {
  const customer = await (await as("customer")).newPage();
  await customer.goto("/");
  await expect(customer.getByRole("link", { name: /Earn with Iza/ })).toBeVisible();
  await expect(customer.getByRole("link", { name: /Today's jobs/ })).toHaveCount(0);
  await expect(customer.getByRole("link", { name: /Team dashboard/ })).toHaveCount(0);

  const runner = await (await as("runner")).newPage();
  await runner.goto("/");
  await expect(runner.getByRole("link", { name: /Today's jobs/ })).toBeVisible();

  const admin = await (await as("admin")).newPage();
  await admin.goto("/");
  await expect(admin.getByRole("link", { name: /Team dashboard/ })).toBeVisible();
});

test("the home screen is simple: four things to do and a code box", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "What would you like to do?" })).toBeVisible();
  for (const name of ["Send a parcel", "Collect nearby", "Where's my parcel?", "For my business"]) {
    await expect(page.getByRole("link", { name: new RegExp(name) })).toBeVisible();
  }
  const small = await page.evaluate(
    () =>
      [...document.querySelectorAll("a.btn, button.btn, a.tile, a.tab")]
        .map((el) => el.getBoundingClientRect())
        .filter((r) => r.height > 0 && r.height < 44).length,
  );
  expect(small).toBe(0);
});
