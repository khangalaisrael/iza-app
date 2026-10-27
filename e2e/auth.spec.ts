import { expect, test, PASSWORD, signIn } from "./fixtures";

test("signed-out visitors are sent to sign in, then back where they were going", async ({ page }) => {
  for (const path of ["/send", "/runner", "/point", "/ops"]) {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(`/signin\\?next=${encodeURIComponent(path).replace("%", "%")}`));
  }

  await page.goto("/send");
  await page.getByLabel("Phone number or email").fill("lindiwe@iza.test");
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/send$/);
  await expect(page.getByRole("heading", { name: "Send something" })).toBeVisible();
});

test("a wrong password gives one plain message, and does not say whether the account exists", async ({ page }) => {
  await signIn(page, "lindiwe@iza.test", "not-the-password");
  await expect(page.locator("form [role=alert]")).toHaveText("That phone number, email or password isn't right.");

  await signIn(page, "nobody@iza.test", "not-the-password");
  await expect(page.locator("form [role=alert]")).toHaveText("That phone number, email or password isn't right.");
});

test("five wrong tries lock the account for a while, even with the right password", async ({ page }) => {
  // Its own account, so locking it does not disturb the other tests.
  const id = `lockme-${Date.now()}@iza.test`;
  await page.goto("/signup");
  await page.getByLabel("Your name").fill("Lock Me");
  await page.getByLabel("Phone number or email").fill(id);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create my account" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.getByLabel(/Account menu/).click();
  await page.getByRole("button", { name: "Sign out" }).click();

  for (let i = 0; i < 5; i++) await signIn(page, id, "wrong-password");
  await signIn(page, id, PASSWORD);
  await expect(page.locator("form [role=alert]")).toContainText("Too many tries");
});

test("a new customer can join and send straight away", async ({ page }) => {
  await page.goto("/signup?next=/send");
  await page.getByLabel("Your name").fill("Nomsa");
  await page.getByLabel("Phone number or email").fill(`08${Date.now().toString().slice(-8)}`);
  await page.getByLabel("Password").fill("a-good-long-password");
  await page.getByRole("button", { name: "Create my account" }).click();
  await expect(page).toHaveURL(/\/send$/);
  await expect(page.getByRole("heading", { name: "Send something" })).toBeVisible();
});

test("signing up twice with the same email is refused", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("Your name").fill("Copy Cat");
  await page.getByLabel("Phone number or email").fill("LINDIWE@iza.test");
  await page.getByLabel("Password").fill("a-good-long-password");
  await page.getByRole("button", { name: "Create my account" }).click();
  await expect(page.locator("form [role=alert]")).toContainText("already has an account");
});

test("a short password is refused", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("Your name").fill("Short Pass");
  await page.getByLabel("Phone number or email").fill("short@iza.test");
  await page.getByLabel("Password").fill("short");
  await page.getByRole("button", { name: "Create my account" }).click();
  await expect(page.locator("form [role=alert]")).toContainText("at least 8 characters");
});

test("a new runner waits for approval, and the team can approve them", async ({ page, as }) => {
  const id = `runner-${Date.now()}@iza.test`;
  await page.goto("/signup");
  await page.getByLabel("Your name").fill("Zola Runner");
  await page.getByText("Deliver as a runner").click();
  await page.getByLabel("Phone number or email").fill(id);
  await page.getByLabel("Password").fill("a-good-long-password");
  await page.getByRole("button", { name: "Create my account" }).click();
  await expect(page).toHaveURL(/\/pending$/);

  // Still waiting: the runner screen stays closed.
  await page.goto("/runner");
  await expect(page).toHaveURL(/\/pending$/);

  // The team approves.
  const admin = await (await as("admin")).newPage();
  await admin.goto("/ops");
  await expect(admin.getByText("Zola Runner")).toBeVisible();
  await admin.getByRole("button", { name: "Approve" }).first().click();
  await expect(admin.getByText("Zola Runner")).toHaveCount(0);

  // Now the runner screen opens.
  await page.goto("/runner");
  await expect(page.getByRole("heading", { name: "Today's jobs" })).toBeVisible();
});

test("people can only open the screens for their own role", async ({ as }) => {
  const customer = await (await as("customer")).newPage();
  for (const path of ["/runner", "/point", "/ops"]) {
    await customer.goto(path);
    await expect(customer).toHaveURL(/\/$/);
  }

  const runner = await (await as("runner")).newPage();
  await runner.goto("/ops");
  await expect(runner).toHaveURL(/\/$/);
});

test("the booking and status APIs refuse people who should not use them", async ({ as, request }) => {
  // Signed out.
  expect((await request.post("/api/parcels", { data: { from: "a", landmark: "b" } })).status()).toBe(401);
  expect((await request.patch("/api/parcels/IZA-4830", { data: { action: "advance" } })).status()).toBe(401);

  // A customer cannot move a parcel along or hand one over.
  const customer = await as("customer");
  expect((await customer.request.patch("/api/parcels/IZA-4830", { data: { action: "advance" } })).status()).toBe(403);
  expect((await customer.request.patch("/api/parcels/IZA-4825", { data: { action: "collect" } })).status()).toBe(403);

  // A runner cannot book.
  const runner = await as("runner");
  expect((await runner.request.post("/api/parcels", { data: { from: "a", landmark: "b" } })).status()).toBe(403);

  // Writes from another website are refused.
  const forged = await customer.request.post("/api/parcels", {
    data: { from: "a", landmark: "b" },
    headers: { Origin: "https://evil.example" },
  });
  expect(forged.status()).toBe(403);
});

test("signing out ends the session", async ({ page }) => {
  // A fresh sign-in of its own: signing out ends only that session, not the saved ones other tests use.
  await signIn(page, "lindiwe@iza.test");
  await expect(page.getByLabel(/Account menu/)).toBeVisible();
  await page.getByLabel(/Account menu/).click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.goto("/send");
  await expect(page).toHaveURL(/\/signin\?next=%2Fsend/);
});
