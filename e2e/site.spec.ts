import { expect, test, topMenu } from "./fixtures";

const PUBLIC_PAGES = ["/", "/welcome", "/join", "/business", "/why", "/signin", "/signup", "/send", "/track", "/points", "/collect", "/runner", "/point", "/ops"];

test("nothing scrolls sideways at phone width", async ({ page }) => {
  test.setTimeout(120_000);
  for (const path of PUBLIC_PAGES) {
    await page.goto(path);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(400);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `${path} overflows by ${overflow}px`).toBeLessThanOrEqual(0);
  }
});

test("nothing scrolls sideways when signed in either", async ({ as }) => {
  const checks: [Parameters<typeof as>[0], string[]][] = [
    ["admin", ["/", "/ops", "/runner", "/point", "/send"]],
    ["business", ["/", "/send", "/track"]],
    ["runner", ["/", "/runner"]],
    ["point", ["/", "/point"]],
    ["customer", ["/", "/collect", "/track"]],
  ];
  for (const [role, paths] of checks) {
    const page = await (await as(role)).newPage();
    for (const path of paths) {
      await page.goto(path);
      await page.waitForLoadState("load");
      await page.waitForTimeout(400);
      // A page can redirect or refresh itself while it settles, which throws away the page being measured. Measure again.
      const measure = () =>
        page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      const overflow = await measure().catch(async () => {
        await page.waitForLoadState("load");
        return measure();
      });
      expect(overflow, `${role} ${path} overflows by ${overflow}px`).toBeLessThanOrEqual(0);
    }
  }
});

test("the website has the same menu on every page, like the design", async ({ browser, baseURL }) => {
  const ctx = await browser.newContext({ baseURL, viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  for (const path of ["/", "/join", "/business", "/why"]) {
    await page.goto(path);
    const nav = page.getByRole("navigation", { name: "Main" });
    for (const name of ["Send", "Collect", "For my business", "Why Izza"]) {
      await expect(nav.getByRole("link", { name, exact: true })).toBeVisible();
    }
    await expect(page.getByRole("link", { name: "Track", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in", exact: true })).toBeVisible();
  }
  // Each choice opens a short list when you point at it.
  await page.goto("/");
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Send", exact: true }).hover();
  await expect(page.getByRole("link", { name: "How sending works" })).toBeVisible();
  await ctx.close();
});

test("on a phone the main choices are a tab bar at the bottom, and More lists the rest", async ({ page }) => {
  await page.goto("/join");
  const tabs = await topMenu(page);
  for (const name of ["Send", "Track", "Join us", "More"]) await expect(tabs.getByText(name, { exact: true })).toBeVisible();

  // The bar is pinned to the bottom of the screen, where the thumb is.
  const box = await tabs.boundingBox();
  const viewport = page.viewportSize()!;
  expect(box!.y + box!.height).toBeGreaterThan(viewport.height - 4);

  await tabs.getByText("More", { exact: true }).click();
  await expect(page).toHaveURL(/\/more$/);
  await expect(page.getByRole("heading", { name: "More", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "How sending works" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open a business account" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Privacy notice" })).toBeVisible();
  await expect(tabs.getByRole("link", { name: "More" })).toHaveAttribute("aria-current", "page");
});

test("the website opens with a heading and a way to send and track", async ({ page }) => {
  await page.goto("/welcome");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bringing it closer.");
  await page.getByLabel("Parcel code").fill("IZA-4821");
  await page.getByRole("button", { name: "Find it" }).click();
  await expect(page).toHaveURL(/\/track\/IZA-4821$/);
});

test("the website questions open and close", async ({ page }) => {
  await page.goto("/");
  await page.getByText("Do I need a street address?").click();
  await expect(page.getByText(/Drop a pin or describe a landmark/)).toBeVisible();
});

test("join us offers runners, Izza points and businesses their own way in", async ({ page }) => {
  await page.goto("/join");
  await page.getByRole("link", { name: "Apply to be a runner" }).click();
  await expect(page).toHaveURL(/\/signup\/runner$/);
  await expect(page.getByRole("heading", { name: "Become a runner" })).toBeVisible();

  await page.goto("/join");
  await page.getByRole("link", { name: "Register your place" }).click();
  await expect(page).toHaveURL(/\/signup\/point$/);
  await expect(page.getByRole("heading", { name: "Host an Izza point" })).toBeVisible();

  await page.goto("/join");
  await page.getByRole("main").getByRole("link", { name: "Open a business account" }).click();
  await expect(page).toHaveURL(/\/signup\/business$/);
  await expect(page.getByRole("heading", { name: "Send parcels for your business" })).toBeVisible();
});

test("the business page explains what the customer pays", async ({ page }) => {
  await page.goto("/business");
  await expect(page.getByRole("heading", { name: "Your customers, reached. Wherever they live." })).toBeVisible();
  await expect(page.getByText(/R20 to an Izza point/)).toBeVisible();
  await expect(page.getByText(/they pay R15 extra/)).toBeVisible();
});

test("a customer sees the parcels addressed to their number, and nobody else's", async ({ as, page }) => {
  await page.goto("/track");
  await expect(page.getByText("to see your parcels")).toBeVisible();

  const customer = await (await as("customer")).newPage();
  await customer.goto("/track");
  await expect(customer.getByText("IZA-4821")).toBeVisible();
  await expect(customer.getByText("IZA-4830")).toHaveCount(0); // for someone else
});

test("the top bar is slim and the tab bar stays pinned while you scroll", async ({ page }) => {
  await page.goto("/");
  const logo = page.getByRole("link", { name: "Izza home" });
  const tabs = await topMenu(page);
  const bar = await logo.boundingBox();
  expect(bar!.y + bar!.height).toBeLessThan(90);
  await page.evaluate(() => window.scrollTo(0, 900));
  await page.waitForTimeout(300);
  await expect(tabs).toBeInViewport();
  await expect(logo).toBeInViewport();
});

test("a page that does not exist has a proper 404 with a way back", async ({ page }) => {
  const res = await page.goto("/this-page-is-not-here");
  expect(res!.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "We couldn't find that page" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Track a parcel" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Izza home" })).toBeVisible();
});

test("English and isiXhosa can be switched at the foot of the track page", async ({ page }) => {
  await page.goto("/track");
  await page.getByRole("button", { name: "isiXhosa" }).click();
  await expect(page.getByRole("heading", { name: "Ikuphi iparcel yam?" })).toBeVisible();
  await page.getByRole("button", { name: "English" }).click();
  await expect(page.getByRole("heading", { name: "Where's my parcel?" })).toBeVisible();
});

test("the privacy page and the staff pages each have one main heading", async ({ page, as }) => {
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  const runner = await (await as("runner")).newPage();
  await runner.goto("/runner");
  await expect(runner.getByRole("heading", { level: 1 })).toHaveCount(1);
  const team = await (await as("admin")).newPage();
  await team.goto("/ops");
  await expect(team.getByRole("heading", { level: 1 })).toHaveCount(1);
});

test("the Send page explains sending in three steps before asking anyone to sign in, and the form is three short steps", async ({ page, as }) => {
  await page.goto("/send");
  await expect(page.getByRole("heading", { name: "Send a parcel" })).toBeVisible();
  await expect(page.getByText("Pick a hub").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Create an account to send" })).toBeVisible();
  await expect(page).toHaveURL(/\/send$/);

  const business = await (await as("business")).newPage();
  await business.goto("/send");
  // Pick a hub, say who it is for, say how they get it. Nothing about pickups or runners.
  await expect(business.getByRole("heading", { name: "Pick a hub" })).toBeVisible();
  await expect(business.getByRole("heading", { name: "Who is it for?" })).toBeVisible();
  await expect(business.getByRole("heading", { name: "How do they get it?" })).toBeVisible();
  await expect(business.getByText("Who takes it to the hub?")).toHaveCount(0);
  await expect(business.getByLabel("Pick up from")).toHaveCount(0);
  // Only a few hubs, so no search box.
  await expect(business.getByLabel("Search Izza points")).toHaveCount(0);
});
