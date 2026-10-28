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

test("on a phone the header has tabs, and each one opens a dropdown", async ({ page }) => {
  await page.goto("/join");
  const menu = await topMenu(page);
  for (const name of ["Send", "Collect", "For my business", "Why Izza"]) {
    await expect(menu.getByText(name, { exact: true })).toBeVisible();
  }
  // Opening one shows its links; opening another closes the first; tapping elsewhere closes it.
  await menu.getByText("Send", { exact: true }).click();
  await expect(page.getByRole("link", { name: "How sending works" })).toBeVisible();
  await menu.getByText("Collect", { exact: true }).click();
  await expect(page.getByRole("link", { name: "Find an Izza point" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "How sending works" })).toBeHidden();
  await page.mouse.click(8, 880);
  await expect(page.getByRole("link", { name: "Collect with my code" })).toBeHidden();
});

test("the website opens with a heading and a way to send and track", async ({ page }) => {
  await page.goto("/welcome");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Order anywhere. Collect around the corner.");
  await page.getByLabel("Parcel code").fill("IZA-4821");
  await page.getByRole("button", { name: "Find it" }).click();
  await expect(page).toHaveURL(/\/track\/IZA-4821$/);
});

test("the website questions open and close", async ({ page }) => {
  await page.goto("/");
  await page.getByText("How much does it cost?").click();
  await expect(page.getByText("R12 if you collect at an Izza point")).toBeVisible();
});

test("join us offers runners, Izza points and businesses their own way in", async ({ page }) => {
  await page.goto("/join");
  await page.getByRole("link", { name: "Apply to be a runner" }).click();
  await expect(page).toHaveURL(/\/signup\?as=runner/);
  await expect(page.getByRole("radio", { name: /I want to deliver/ })).toBeChecked();

  await page.goto("/join");
  await page.getByRole("link", { name: "Register your place" }).click();
  await expect(page.getByRole("radio", { name: /host an Izza point/ })).toBeChecked();
  await expect(page.getByLabel("When are you open?")).toBeVisible();

  await page.goto("/join");
  await page.getByRole("main").getByRole("link", { name: "Open a business account" }).click();
  await expect(page.getByRole("radio", { name: /I send parcels/ })).toBeChecked();
});

test("the business page explains what the customer pays", async ({ page }) => {
  await page.goto("/business");
  await expect(page.getByRole("heading", { name: "Your customers, reached. Wherever they live." })).toBeVisible();
  await expect(page.getByText(/R12 to an Izza point/)).toBeVisible();
  await expect(page.getByText(/they pay R8 extra/)).toBeVisible();
});

test("a customer sees the parcels addressed to their number, and nobody else's", async ({ as, page }) => {
  await page.goto("/track");
  await expect(page.getByText("to see your parcels")).toBeVisible();

  const customer = await (await as("customer")).newPage();
  await customer.goto("/track");
  await expect(customer.getByText("IZA-4821")).toBeVisible();
  await expect(customer.getByText("IZA-4830")).toHaveCount(0); // for someone else
});

test("the header is one row: the logo, the tabs and Sign in share a single bar, and it stays pinned", async ({ page }) => {
  await page.goto("/");
  const logo = page.getByRole("link", { name: "Izza home" });
  const tabs = page.getByRole("navigation", { name: "Menu" }).getByText("Send", { exact: true });
  const signIn = page.getByRole("link", { name: "Sign in" }).first();
  const [a, b, c] = await Promise.all([logo.boundingBox(), tabs.boundingBox(), signIn.boundingBox()]);
  // All three sit on the same line, inside a bar no taller than a normal header.
  for (const box of [a, b, c]) expect(box!.y + box!.height).toBeLessThan(90);
  expect(Math.abs((a!.y + a!.height / 2) - (b!.y + b!.height / 2))).toBeLessThan(30);

  await page.evaluate(() => window.scrollTo(0, 900));
  await page.waitForTimeout(300);
  await expect(tabs).toBeInViewport();
  await expect(logo).toBeInViewport();
});
