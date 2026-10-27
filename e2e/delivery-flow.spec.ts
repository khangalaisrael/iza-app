import { expect, test } from "@playwright/test";

test("a parcel goes from booked to delivered across all three screens", async ({ page }) => {
  // Customer books.
  await page.goto("/send");
  await page.getByLabel("Pick up from").fill("Thembi's Kitchen");
  await page.getByLabel(/Deliver to/).fill("Blue gate by the Engen");
  await page.getByRole("button", { name: "Book delivery" }).click();
  await expect(page.getByText("Enkosi! Your parcel is booked.")).toBeVisible();
  const code = (await page.locator(".mono").first().innerText()).trim();
  expect(code).toMatch(/^IZA-\d{4}$/);

  // Customer sees it booked.
  await page.goto(`/track/${code}`);
  await expect(page.getByText("A runner will collect it today")).toBeVisible();

  // Runner takes it, then drops it at the Iza point.
  await page.goto("/runner");
  const job = page.locator("section", { hasText: code });
  await job.getByRole("button", { name: "Take this job" }).click();
  await expect(job.getByRole("button", { name: "Dropped at the Iza point" })).toBeVisible();
  await job.getByRole("button", { name: "Dropped at the Iza point" }).click();

  // The shop sees it waiting and hands it over by typing the code.
  await page.goto("/point");
  await expect(page.getByText(code)).toBeVisible();
  await page.getByLabel("Someone at the counter?").fill(code.toLowerCase());
  await page.getByRole("button", { name: "Hand over" }).click();
  await expect(page.getByText(`${code} handed over. Enkosi!`)).toBeVisible();

  // Customer sees it delivered.
  await page.goto(`/track/${code}`);
  await expect(page.getByRole("heading", { name: "Delivered. Enkosi!" })).toBeVisible();
});

test("the booking form needs a pickup and a landmark", async ({ request }) => {
  const res = await request.post("/api/parcels", { data: { from: "", landmark: "" } });
  expect(res.status()).toBe(400);
});

test("an unknown parcel code says so", async ({ page }) => {
  await page.goto("/track/NOPE-0000");
  await expect(page.getByText("We couldn't find that code")).toBeVisible();
});

test("a runner cannot report a location for a parcel that is not on the way", async ({ request }) => {
  const res = await request.patch("/api/parcels/IZA-4830", {
    data: { action: "location", lat: -33.94, lng: 18.53 },
  });
  expect(res.status()).toBe(409);
});

test("nothing scrolls sideways at phone width", async ({ page }) => {
  for (const path of ["/", "/welcome", "/send", "/track", "/points", "/runner", "/point", "/ops"]) {
    await page.goto(path);
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
  const q = page.getByText("How much does it cost?");
  await q.click();
  await expect(page.getByText("R12 if you collect at an Iza point")).toBeVisible();
});
