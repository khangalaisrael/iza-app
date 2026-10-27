import { authFile, expect, test } from "./fixtures";

// Somewhere in Langa, close to the Fresh Cuts Barber Iza point.
const NEAR_BARBER = { latitude: -33.9426, longitude: 18.5319 };

test("sharing a location sets the pickup spot, and the runner can open it in Maps", async ({ browser, baseURL, as }) => {
  const sender = await browser.newContext({
    baseURL,
    storageState: authFile("customer"),
    geolocation: { latitude: -33.9441, longitude: 18.5298 },
    permissions: ["geolocation"],
  });
  const page = await sender.newPage();
  await page.goto("/send");
  await page.getByRole("button", { name: "Use my location" }).click();
  await expect(page.getByText(/Location saved/)).toBeVisible();
  await page.getByLabel("Deliver to").fill("Blue gate by the Engen");
  await page.getByRole("button", { name: "Book it" }).click();
  await expect(page.getByText("Enkosi! It's booked.")).toBeVisible();
  const code = (await page.locator(".bigCode").innerText()).trim();

  const runner = await (await as("runner")).newPage();
  await runner.goto("/runner");
  const job = runner.locator("section", { hasText: code });
  const link = job.getByRole("link", { name: "Open the pickup spot in Maps" });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("href", /destination=-33\.9441,18\.5298/);
  await sender.close();
});

test("a booking needs a pickup place or location, and says so plainly", async ({ as }) => {
  const page = await (await as("customer")).newPage();
  await page.goto("/send");
  await page.getByLabel("Deliver to").fill("Blue gate");
  await page.getByRole("button", { name: "Book it" }).click();
  await expect(page.locator("form [role=alert]")).toContainText("where to collect it");
});

test("collect nearby lists every Iza point, and puts the closest one first", async ({ browser, baseURL }) => {
  const ctx = await browser.newContext({ baseURL, geolocation: NEAR_BARBER, permissions: ["geolocation"] });
  const page = await ctx.newPage();
  await page.goto("/collect");
  await expect(page.getByRole("heading", { name: "Collect nearby" })).toBeVisible();
  await expect(page.locator("ul.plainList > li")).toHaveCount(3);

  await page.getByRole("button", { name: "Find the closest to me" }).click();
  const first = page.locator("ul.plainList > li").first();
  await expect(first).toContainText("Fresh Cuts Barber");
  await expect(first).toContainText("closest to you");
  await expect(first.getByRole("link", { name: "Directions" })).toHaveAttribute("href", /google\.com\/maps\/dir/);
  await ctx.close();
});

test("collect nearby still works when location is refused", async ({ page }) => {
  await page.goto("/collect");
  await page.getByRole("button", { name: "Find the closest to me" }).click();
  await expect(page.locator("p.problem[role=alert]")).toBeVisible();
  await expect(page.locator("ul.plainList > li")).toHaveCount(3);
});

test("a parcel waiting at a shop shows up under Ready for you", async ({ as }) => {
  const page = await (await as("customer")).newPage();
  await page.goto("/collect");
  const ready = page.getByRole("region", { name: "Ready for you" });
  await expect(ready).toContainText("IZA-4825");
  await expect(ready.getByRole("link", { name: "Directions" }).first()).toBeVisible();
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
  for (const name of ["Send something", "Collect nearby", "Where's my parcel?", "For my business"]) {
    await expect(page.getByRole("link", { name: new RegExp(name) })).toBeVisible();
  }
  // Everything people press is big enough for a thumb (44px at least).
  const small = await page.evaluate(
    () =>
      [...document.querySelectorAll("a.btn, button.btn, a.tile, a.tab")]
        .map((el) => el.getBoundingClientRect())
        .filter((r) => r.height > 0 && r.height < 44).length,
  );
  expect(small).toBe(0);
});
