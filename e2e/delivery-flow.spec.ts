import { expect, test } from "./fixtures";

const CODE = /^IZA-[2-9A-HJ-NP-Z]{6}$/;

test("a parcel goes from booked to delivered across customer, runner and shop", async ({ as }) => {
  // The customer books.
  const customer = await (await as("customer")).newPage();
  await customer.goto("/send");
  await customer.getByLabel("Pick up from").fill("Thembi's Kitchen");
  await customer.getByLabel(/Deliver to/).fill("Blue gate by the Engen");
  await customer.getByRole("button", { name: "Book delivery" }).click();
  await expect(customer.getByText("Enkosi! Your parcel is booked.")).toBeVisible();
  const code = (await customer.locator(".mono").first().innerText()).trim();
  expect(code).toMatch(CODE);

  await customer.goto(`/track/${code}`);
  await expect(customer.getByText("A runner will collect it today")).toBeVisible();
  await expect(customer.getByText("Delivering to Blue gate by the Engen")).toBeVisible();

  // The runner takes it and drops it at the Iza point.
  const runner = await (await as("runner")).newPage();
  await runner.goto("/runner");
  const job = runner.locator("section", { hasText: code });
  await job.getByRole("button", { name: "Take this job" }).click();
  await expect(job.getByRole("button", { name: "Dropped at the Iza point" })).toBeVisible();
  await job.getByRole("button", { name: "Dropped at the Iza point" }).click();

  // The shop sees it waiting and hands it over by typing the code.
  const shop = await (await as("point")).newPage();
  await shop.goto("/point");
  await expect(shop.getByText(code)).toBeVisible();
  await shop.getByLabel("Someone at the counter?").fill(code.toLowerCase());
  await shop.getByRole("button", { name: "Hand over" }).click();
  await expect(shop.getByText(`${code} handed over. Enkosi!`)).toBeVisible();

  // The customer sees it delivered.
  await customer.goto(`/track/${code}`);
  await expect(customer.getByRole("heading", { name: "Delivered. Enkosi!" })).toBeVisible();
});

test("the booking form needs a pickup and a landmark", async ({ as }) => {
  const ctx = await as("customer");
  const res = await ctx.request.post("/api/parcels", { data: { from: "", landmark: "" } });
  expect(res.status()).toBe(400);
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
  const customer = await (await as("customer")).newPage();
  await customer.goto("/send");
  await customer.getByLabel("Pick up from").fill("Secret Bakery");
  await customer.getByLabel(/Deliver to/).fill("Third house past the red wall");
  await customer.getByRole("button", { name: "Book delivery" }).click();
  await expect(customer.getByText("Enkosi! Your parcel is booked.")).toBeVisible();
  const code = (await customer.locator(".mono").first().innerText()).trim();

  const stranger = await browser.newPage({ baseURL });
  await stranger.goto(`/track/${code}`);
  await expect(stranger.getByText("A runner will collect it today")).toBeVisible();
  await expect(stranger.getByText("to see the delivery address and the map")).toBeVisible();
  await expect(stranger.getByText("Third house past the red wall")).toHaveCount(0);
  await expect(stranger.getByText("Secret Bakery")).toHaveCount(0);
  await expect(stranger.getByText("Lindiwe")).toHaveCount(0);
  await stranger.close();
});
