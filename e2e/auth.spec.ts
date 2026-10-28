import type { Page } from "@playwright/test";
import { expect, test, PASSWORD, signIn, topMenu } from "./fixtures";

const stamp = () => Date.now().toString().slice(-8);

async function signUp(page: Page, opts: { role: string; name: string; id: string; password?: string }) {
  await page.goto("/signup");
  await page.getByText(opts.role, { exact: true }).click();
  await page.getByLabel(/Your name|Business name/).fill(opts.name);
  await page.getByLabel("Phone number or email").fill(opts.id);
  await page.getByLabel("Password").fill(opts.password ?? "a-good-long-password");
}

test("signed-out visitors are sent to sign in, then back where they were going", async ({ page }) => {
  for (const path of ["/send", "/runner", "/point", "/ops"]) {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(`/signin\\?next=${encodeURIComponent(path)}`));
  }

  await page.goto("/send");
  await page.getByLabel("Phone number or email").fill("thembi@iza.test");
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/send$/);
  await expect(page.getByRole("heading", { name: "Send a parcel" })).toBeVisible();
});

test("a wrong password gives one plain message, and does not say whether the account exists", async ({ page }) => {
  await signIn(page, "thembi@iza.test", "not-the-password");
  await expect(page.locator("form [role=alert]")).toHaveText("That phone number, email or password isn't right.");
  await signIn(page, "nobody@iza.test", "not-the-password");
  await expect(page.locator("form [role=alert]")).toHaveText("That phone number, email or password isn't right.");
});

test("five wrong tries lock the account for a while, even with the right password", async ({ page }) => {
  const id = `lockme-${Date.now()}@iza.test`;
  await signUp(page, { role: "I'm getting a parcel", name: "Lock Me", id, password: PASSWORD });
  await page.getByRole("button", { name: "Create my account" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.getByLabel(/Account menu/).click();
  await page.getByRole("button", { name: "Sign out" }).click();

  for (let i = 0; i < 5; i++) await signIn(page, id, "wrong-password");
  await signIn(page, id, PASSWORD);
  await expect(page.locator("form [role=alert]")).toContainText("Too many tries");
});

test("a new customer can join straight away", async ({ page }) => {
  await signUp(page, { role: "I'm getting a parcel", name: "Nomsa", id: `08${stamp()}` });
  await page.getByRole("button", { name: "Create my account" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByLabel(/Account menu/)).toBeVisible();
});

test("signing up twice with the same email is refused", async ({ page }) => {
  await signUp(page, { role: "I'm getting a parcel", name: "Copy Cat", id: "THEMBI@iza.test" });
  await page.getByRole("button", { name: "Create my account" }).click();
  await expect(page.locator("form [role=alert]")).toContainText("already has an account");
});

test("a short password is refused", async ({ page }) => {
  await signUp(page, { role: "I'm getting a parcel", name: "Short Pass", id: "short@iza.test", password: "short" });
  await page.getByRole("button", { name: "Create my account" }).click();
  await expect(page.locator("form [role=alert]")).toContainText("at least 8 characters");
});

test("a new runner waits for approval, and the team can approve them", async ({ page, as }) => {
  const id = `runner-${Date.now()}@iza.test`;
  await signUp(page, { role: "I want to deliver", name: "Zola Runner", id });
  await page.getByRole("button", { name: "Send my application" }).click();
  await expect(page).toHaveURL(/\/pending$/);

  await page.goto("/runner");
  await expect(page).toHaveURL(/\/pending$/);

  const admin = await (await as("admin")).newPage();
  await admin.goto("/ops");
  await expect(admin.getByText("Zola Runner")).toBeVisible();
  await admin.locator("div", { hasText: "Zola Runner" }).getByRole("button", { name: "Approve" }).last().click();
  await expect(admin.getByRole("region", { name: "Waiting for approval" }).getByText("Zola Runner")).toHaveCount(0);

  await page.goto("/runner");
  await expect(page.getByRole("heading", { name: "Jobs you can take" })).toBeVisible();
});

test("a new business waits for approval, then can book parcels", async ({ page, as }) => {
  const id = `biz-${Date.now()}@iza.test`;
  await signUp(page, { role: "I send parcels", name: "Mama Lindiwe's Cakes", id });
  await page.getByRole("button", { name: "Send my application" }).click();
  await expect(page).toHaveURL(/\/pending$/);

  const admin = await (await as("admin")).newPage();
  await admin.goto("/ops");
  await expect(admin.getByText("Mama Lindiwe's Cakes")).toBeVisible();
  await admin.locator("div", { hasText: "Mama Lindiwe's Cakes" }).getByRole("button", { name: "Approve" }).last().click();

  await page.goto("/send");
  await expect(page.getByRole("heading", { name: "Send a parcel" })).toBeVisible();
});

test("someone applies to host an Izza point, and it only shows on the map once the team approves", async ({ browser, baseURL, as }) => {
  // The shop owner is standing in the shop, so they use their location.
  const ctx = await browser.newContext({ baseURL, geolocation: { latitude: -33.9441, longitude: 18.5311 }, permissions: ["geolocation"] });
  const page = await ctx.newPage();
  const id = `shop-${Date.now()}@iza.test`;
  await signUp(page, { role: "I'll host an Izza point", name: "Mama Joy", id });
  await page.getByLabel("Name of your shop or place").fill("Joy's Tuckshop");
  await page.getByRole("button", { name: "Use my location" }).click();
  await expect(page.getByText("Location saved.")).toBeVisible();
  await page.getByLabel("When are you open?").fill("07:00 to 20:00");
  await page.getByRole("button", { name: "Send my application" }).click();
  await expect(page).toHaveURL(/\/pending$/);

  // Not on the public list yet.
  const visitor = await browser.newPage({ baseURL });
  await visitor.goto("/points");
  await expect(visitor.getByRole("heading", { name: "Izza points near you" })).toBeVisible();
  await expect(visitor.getByText("Joy's Tuckshop")).toHaveCount(0);

  // The team sees what was applied for, and approves.
  const admin = await (await as("admin")).newPage();
  await admin.goto("/ops");
  await expect(admin.getByText(/Joy's Tuckshop, Spaza shop/)).toBeVisible();
  await admin.locator("div", { hasText: "Mama Joy" }).getByRole("button", { name: "Approve" }).last().click();

  await visitor.reload();
  await expect(visitor.getByText("Joy's Tuckshop")).toBeVisible();
  await ctx.close();
});

test("a point application needs the place's name, a location and its hours", async ({ page }) => {
  await signUp(page, { role: "I'll host an Izza point", name: "Half Done", id: `half-${Date.now()}@iza.test` });
  await page.getByRole("button", { name: "Send my application" }).click();
  await expect(page.locator("form [role=alert]")).toContainText("name of your shop");
  // What was typed is still there after an error. Only the password has to be typed again.
  await expect(page.getByLabel("Your name")).toHaveValue("Half Done");
  await page.getByLabel("Name of your shop or place").fill("Half Done Shop");
  await page.getByLabel("Password").fill("a-good-long-password");
  await page.getByRole("button", { name: "Send my application" }).click();
  await expect(page.locator("form [role=alert]")).toContainText("Search for your place");
});

test("everyone who works lands in their own place after signing in", async ({ browser, baseURL }) => {
  const lands: [string, RegExp][] = [
    ["sipho@iza.test", /\/runner$/],
    ["thembi@iza.test", /\/parcels$/],
    ["cornershop@iza.test", /\/point$/],
    ["admin@iza.test", /\/ops$/],
  ];
  for (const [who, url] of lands) {
    const page = await browser.newPage({ baseURL });
    await signIn(page, who);
    await expect(page, who).toHaveURL(url);
    await page.close();
  }
});

test("a runner's screens have no Send tab, and a business has one", async ({ as }) => {
  const runner = await (await as("runner")).newPage();
  await runner.goto("/track/IZA-4821");
  const bar = await topMenu(runner);
  await expect(bar.getByRole("link", { name: "My jobs" })).toBeVisible();
  await expect(bar.getByText("Send", { exact: true })).toHaveCount(0);
  await expect(bar.getByText("Collect", { exact: true })).toHaveCount(0);

  const business = await (await as("business")).newPage();
  await business.goto("/track/IZA-4821");
  await expect((await topMenu(business)).getByText("Send", { exact: true })).toBeVisible();
});

test("people can only open the screens for their own role", async ({ as }) => {
  const customer = await (await as("customer")).newPage();
  for (const path of ["/runner", "/point", "/ops", "/parcels"]) {
    await customer.goto(path);
    await expect(customer).toHaveURL(/\/$/);
  }
  // A customer can send a parcel from home to the hub.
  await customer.goto("/send");
  await expect(customer.getByRole("heading", { name: "Send a parcel from home" })).toBeVisible();

  // A runner who tries anywhere else is brought back to their jobs.
  const runner = await (await as("runner")).newPage();
  for (const path of ["/ops", "/point", "/parcels", "/"]) {
    await runner.goto(path);
    await expect(runner, path).toHaveURL(/\/runner$/);
  }

  const business = await (await as("business")).newPage();
  for (const path of ["/runner", "/ops", "/point"]) {
    await business.goto(path);
    await expect(business, path).toHaveURL(/\/parcels$/);
  }
});

test("the booking and status APIs refuse people who should not use them", async ({ as, request }) => {
  const booking = { from: "a", toName: "Someone", toPhone: "0821112222", pointId: "LANGA-CORNER-02" };

  // Signed out.
  expect((await request.post("/api/parcels", { data: booking })).status()).toBe(401);
  expect((await request.patch("/api/parcels/IZA-4830", { data: { action: "accept" } })).status()).toBe(401);

  // Customers and businesses book. Runners and shops do not.
  for (const role of ["runner", "point"] as const) {
    const ctx = await as(role);
    expect((await ctx.request.post("/api/parcels", { data: booking })).status(), role).toBe(403);
  }

  // A customer or a business cannot take a runner's job, and a runner cannot hand over at a shop.
  const customer = await as("customer");
  expect((await customer.request.patch("/api/parcels/IZA-4830", { data: { action: "accept" } })).status()).toBe(403);
  const business = await as("business");
  expect((await business.request.patch("/api/parcels/IZA-4830", { data: { action: "accept" } })).status()).toBe(403);
  const runner = await as("runner");
  expect((await runner.request.patch("/api/parcels/IZA-4825", { data: { action: "collect" } })).status()).toBe(403);

  // Writes from another website are refused.
  const biz = await as("business");
  const forged = await biz.request.post("/api/parcels", { data: booking, headers: { Origin: "https://evil.example" } });
  expect(forged.status()).toBe(403);
});

test("signing out ends the session", async ({ page }) => {
  await signIn(page, "thembi@iza.test");
  await expect(page.getByLabel(/Account menu/)).toBeVisible();
  await page.getByLabel(/Account menu/).click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.goto("/send");
  await expect(page).toHaveURL(/\/signin\?next=%2Fsend/);
});

test("the team can add an Izza point themselves, and it is live straight away", async ({ browser, baseURL, as }) => {
  const ctx = await browser.newContext({
    baseURL,
    storageState: "e2e/.auth/admin.json",
    geolocation: { latitude: -33.9452, longitude: 18.5322 },
    permissions: ["geolocation"],
  });
  const page = await ctx.newPage();
  await page.goto("/ops");
  const form = page.getByRole("region", { name: "Add an Izza point" });
  await form.getByRole("button", { name: "Add this Izza point" }).click();
  await expect(form.getByRole("alert")).toContainText("Give the place a name");

  await form.getByLabel("Name of the place").fill("Hub Test Corner");
  await form.getByRole("button", { name: "Use my location" }).click();
  await expect(form.getByText("Location saved.")).toBeVisible();
  await form.getByLabel("When is it open?").fill("08:00 to 17:00");
  await form.getByRole("button", { name: "Add this Izza point" }).click();
  await expect(page).toHaveURL(/\/ops\?added=1/);

  const visitor = await browser.newPage({ baseURL });
  await visitor.goto("/points");
  await expect(visitor.getByText("Hub Test Corner")).toBeVisible();
  await ctx.close();
});

test("the team gives someone a one-time link to choose a new password", async ({ page, as, browser, baseURL }) => {
  const id = `forgot-${Date.now()}@iza.test`;
  await signUp(page, { role: "I'm getting a parcel", name: "Forgetful", id, password: "the-old-password" });
  await page.getByRole("button", { name: "Create my account" }).click();
  await expect(page).toHaveURL(/\/$/);

  // Only the team can make a link.
  const team = await (await as("admin")).newPage();
  await team.goto("/ops");
  await team.getByLabel("Their phone number or email").fill("nobody@iza.test");
  await team.getByRole("button", { name: "Make a reset link" }).click();
  await expect(team.locator("form [role=alert]")).toContainText("No active account");
  await team.getByLabel("Their phone number or email").fill(id);
  await team.getByRole("button", { name: "Make a reset link" }).click();
  const link = await team.getByLabel("Reset link").inputValue();
  expect(link).toMatch(/\/reset\/[\w-]{20,}$/);
  const path = new URL(link).pathname;

  const signedOut = await browser.newPage({ baseURL });
  await signedOut.goto("/ops");
  await expect(signedOut).toHaveURL(/\/signin/);

  // They open the link, and the two passwords must match.
  const person = await browser.newPage({ baseURL });
  await person.goto(path);
  await person.getByLabel("New password").fill("the-new-password");
  await person.getByLabel("Type it again").fill("something-else-entirely");
  await person.getByRole("button", { name: "Save my new password" }).click();
  await expect(person.locator("form [role=alert]")).toContainText("don't match");
  // The form clears itself after an error, so both boxes are filled again.
  await person.getByLabel("New password").fill("the-new-password");
  await person.getByLabel("Type it again").fill("the-new-password");
  await person.getByRole("button", { name: "Save my new password" }).click();
  await expect(person).toHaveURL(/\/$/);
  await expect(person.getByLabel(/Account menu/)).toBeVisible();

  // The old password stops working, the new one works, and the link cannot be used again.
  await signIn(signedOut, id, "the-old-password");
  await expect(signedOut.locator("form [role=alert]")).toContainText("isn't right");
  await signIn(signedOut, id, "the-new-password");
  await expect(signedOut.getByLabel(/Account menu/)).toBeVisible();
  await person.goto(path);
  await expect(person.getByRole("heading", { name: "This link doesn't work any more" })).toBeVisible();
});

test("the privacy notice is linked from the footer and the sign-up form", async ({ page }) => {
  await page.goto("/signup");
  await page.getByRole("link", { name: "privacy notice" }).click();
  await expect(page.getByRole("heading", { name: "What we keep" })).toBeVisible();
  await page.goto("/");
  await expect(page.getByRole("contentinfo").getByRole("link", { name: "Privacy notice" })).toBeVisible();
});

test("someone who forgot their password asks on the sign-in page, the team sends the link, and it works", async ({ page, as, browser, baseURL }) => {
  const id = `lost-${Date.now()}@iza.test`;
  await signUp(page, { role: "I'm getting a parcel", name: "Lost Pass", id, password: "the-old-password" });
  await page.getByRole("button", { name: "Create my account" }).click();
  await expect(page).toHaveURL(/\/$/);

  const person = await browser.newPage({ baseURL });
  await person.goto("/signin");
  await person.getByRole("link", { name: "Forgot your password?" }).click();
  await expect(person).toHaveURL(/\/forgot$/);

  // The answer is the same for a number that has no account, so it cannot be used to find who has one.
  await person.getByLabel("Phone number or email").fill("nobody-here@iza.test");
  await person.getByRole("button", { name: "Ask for a reset link" }).click();
  await expect(person.getByRole("heading", { name: "Request sent" })).toBeVisible();

  await person.goto("/forgot");
  await person.getByLabel("Phone number or email").fill(id);
  await person.getByRole("button", { name: "Ask for a reset link" }).click();
  await expect(person.getByRole("heading", { name: "Request sent" })).toBeVisible();

  // The team sees only the real account on their list, and makes the link in one tap.
  const team = await (await as("admin")).newPage();
  await team.goto("/ops");
  const row = team.locator("div.stack", { hasText: id }).last();
  await expect(team.getByText("nobody-here@iza.test")).toHaveCount(0);
  await row.getByRole("button", { name: "Make reset link" }).click();
  const link = await team.getByLabel("Reset link for Lost Pass").inputValue();

  await person.goto(new URL(link).pathname);
  await person.getByLabel("New password").fill("the-new-password");
  await person.getByLabel("Type it again").fill("the-new-password");
  await person.getByRole("button", { name: "Save my new password" }).click();
  await expect(person.getByLabel(/Account menu/)).toBeVisible();

  // Making the link took the person off the waiting list.
  await team.reload();
  await expect(team.getByText(id)).toHaveCount(0);
});

test("Collect has a place to type your code", async ({ page }) => {
  await page.goto("/collect");
  await page.getByLabel("Parcel code").fill("iza-4821");
  await page.getByRole("button", { name: "Find my parcel" }).click();
  await expect(page).toHaveURL(/\/track\/IZA-4821$/);
});

test("the Team tab shows how many things are waiting for the team", async ({ page, as, browser, baseURL }) => {
  const id = `waiting-${Date.now()}@iza.test`;
  await signUp(page, { role: "I'm getting a parcel", name: "Waiting Wendy", id });
  await page.getByRole("button", { name: "Create my account" }).click();
  await expect(page).toHaveURL(/\/$/);

  const team = await (await as("admin")).newPage();
  await team.goto("/ops");
  const count = async () => Number((await team.getByLabel(/ waiting$/).first().textContent({ timeout: 2000 }).catch(() => "0")) ?? 0);
  const before = await count();

  // Wendy forgets her password and asks for a link. The team's count goes up by one.
  const asker = await browser.newPage({ baseURL });
  await asker.goto("/forgot");
  await asker.getByLabel("Phone number or email").fill(id);
  await asker.getByRole("button", { name: "Ask for a reset link" }).click();
  await expect(asker.getByRole("heading", { name: "Request sent" })).toBeVisible();

  await team.reload();
  await expect(team.getByLabel(/ waiting$/).first()).toBeVisible();
  expect(await count()).toBe(before + 1);

  // Nobody else sees a count.
  const business = await (await as("business")).newPage();
  await business.goto("/parcels");
  await expect(business.getByLabel(/ waiting$/)).toHaveCount(0);
});

test("the team page shows how to get alerts on a phone, with a private channel that stays the same", async ({ as }) => {
  const team = await (await as("admin")).newPage();
  await team.goto("/ops");
  const channel = team.getByLabel("Alert channel name");
  const name = await channel.inputValue();
  expect(name).toMatch(/^izza-team-[0-9a-f]{24}$/);
  await expect(team.getByRole("link", { name: "Or open the channel in your browser" })).toHaveAttribute("href", `https://ntfy.sh/${name}`);
  // The same channel every time, so the phone does not need setting up again.
  await team.reload();
  expect(await team.getByLabel("Alert channel name").inputValue()).toBe(name);
  // Only the team has it.
  const business = await (await as("business")).newPage();
  await business.goto("/ops");
  await expect(business.getByLabel("Alert channel name")).toHaveCount(0);
});
