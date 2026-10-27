import { expect, test } from "./fixtures";

test("nothing scrolls sideways at phone width", async ({ page }) => {
  for (const path of ["/", "/welcome", "/signin", "/signup", "/send", "/track", "/points", "/runner", "/point", "/ops"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `${path} overflows by ${overflow}px`).toBeLessThanOrEqual(0);
  }
});

test("nothing scrolls sideways when signed in either", async ({ as }) => {
  const page = await (await as("admin")).newPage();
  for (const path of ["/", "/send", "/track", "/runner", "/point", "/ops"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `${path} overflows by ${overflow}px`).toBeLessThanOrEqual(0);
  }
});

test("the website opens with a heading and a way to send and track", async ({ page }) => {
  await page.goto("/welcome");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Order anywhere. Collect around the corner.");
  await expect(page.getByRole("link", { name: "Send a parcel" }).first()).toBeVisible();
  await page.getByLabel("Parcel code").fill("IZA-4821");
  await page.getByRole("button", { name: "Find it" }).click();
  await expect(page).toHaveURL(/\/track\/IZA-4821$/);
});

test("the website questions open and close", async ({ page }) => {
  await page.goto("/welcome");
  await page.getByText("How much does it cost?").click();
  await expect(page.getByText("R12 if you collect at an Iza point")).toBeVisible();
});

test("a signed-in customer sees their own parcels, and nobody else's", async ({ as, page }) => {
  await page.goto("/track");
  await expect(page.getByText("to see the parcels you have sent")).toBeVisible();

  const customer = await (await as("customer")).newPage();
  await customer.goto("/track");
  await expect(customer.getByText("IZA-4821")).toBeVisible();
  await expect(customer.getByText("IZA-4830")).toHaveCount(0); // someone else's example parcel
});
