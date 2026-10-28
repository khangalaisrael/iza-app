import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

const CODE = /^IZA-[2-9A-HJ-NP-Z]{6}$/;

// The key in the receiver's link. The short code alone only shows where a parcel is.
const KEYS = new Map<string, string>();
const receiverUrl = (code: string) => `/track/${code}?k=${KEYS.get(code)}`;

// A business books a parcel to Corner Shop for someone, and gets the code back.
async function book(page: Page, opts: { from: string; to: string; phone: string; point?: string; toDoor?: boolean }) {
  await page.goto("/send");
  if (opts.toDoor) await page.getByText("Bring it to their door").click();
  await page.getByLabel("Pick up from").fill(opts.from);
  await page.getByLabel("Their name").fill(opts.to);
  await page.getByLabel("Their WhatsApp number").fill(opts.phone);
  await page.getByText(opts.point ?? "Corner Shop", { exact: true }).click();
  await page.getByRole("button", { name: "Book it" }).click();
  await expect(page.getByText("Enkosi! It's booked.")).toBeVisible();
  const code = (await page.locator(".bigCode").innerText()).trim();
  expect(code).toMatch(CODE);
  // The link the sender sends on WhatsApp carries the receiver's key.
  const href = decodeURIComponent((await page.getByRole("link", { name: /^Send (the code|them the link) on WhatsApp$/ }).getAttribute("href")) ?? "");
  const key = href.match(/[?]k=([A-Za-z0-9_-]+)/)?.[1];
  expect(key, "the WhatsApp link has the receiver's key").toBeTruthy();
  KEYS.set(code, key!);
  return code;
}

// The customer opens their code, with no account, and chooses.
async function chooseDoor(page: Page, code: string, landmark: string) {
  await page.goto(receiverUrl(code));
  await page.getByText("Bring it to my door").click();
  await page.getByLabel("Where should we bring it?").fill(landmark);
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByText("Saved. Thank you!")).toBeVisible();
}

// A runner accepts the collection job, collects it, and hands it to the point.
async function collectAndDrop(runner: Page, code: string) {
  await runner.goto("/runner");
  await runner.locator("article", { hasText: code }).getByRole("button", { name: "Accept this job" }).click();
  await expect(runner).toHaveURL(new RegExp(`/runner/${code}$`));
  await runner.getByRole("button", { name: "I've collected it" }).click();
  await runner.getByRole("button", { name: /I've handed it to Corner Shop/ }).click();
}

test("the customer collects: the runner works the job, the shop hands it over", async ({ as, browser, baseURL }) => {
  const business = await (await as("business")).newPage();
  const code = await book(business, { from: "Thembi's Kitchen", to: "Nomvula", phone: "082 111 2222" });
  await expect(business.getByRole("link", { name: "Send the code on WhatsApp" })).toHaveAttribute("href", /wa\.me\/27821112222\?text=.*IZA-/);

  const customer = await browser.newPage({ baseURL });
  await customer.goto(receiverUrl(code));
  await expect(customer.getByRole("heading", { name: "How would you like it?" })).toBeVisible();
  await customer.getByText("I'll collect it").click();
  await customer.getByRole("button", { name: "Confirm" }).click();
  await expect(customer.getByText("Saved. Thank you!")).toBeVisible();

  // The runner sees an open job, accepts it, and works through the steps. Each one tells the customer.
  const runner = await (await as("runner")).newPage();
  await runner.goto("/runner");
  const card = runner.locator("article", { hasText: code });
  await expect(card.getByText("Collect from a sender")).toBeVisible();
  await card.getByRole("button", { name: "Accept this job" }).click();
  await expect(runner.getByRole("heading", { name: "Step 1: Go and collect it" })).toBeVisible();
  await runner.getByRole("button", { name: "I'm on my way" }).click();
  await expect(runner.getByText("The customer has been told.")).toBeVisible();
  await runner.getByRole("button", { name: "I've arrived" }).click();
  await runner.getByRole("button", { name: "I've collected it" }).click();
  await expect(runner.getByRole("heading", { name: "Step 2: Take it to Corner Shop" })).toBeVisible();
  await runner.getByRole("button", { name: /I've handed it to Corner Shop/ }).click();
  await expect(runner.getByRole("heading", { name: "Step 2: Take it to Corner Shop" })).toHaveCount(0);
  // Finishing the hand-over thanks the runner. It does not tell them the job is not theirs.
  await expect(runner.getByRole("heading", { name: "Done. Enkosi!" })).toBeVisible();
  await expect(runner.getByRole("heading", { name: "This job isn't on your list" })).toHaveCount(0);

  // The customer reads the runner's updates.
  await customer.reload();
  await expect(customer.getByText(/is on the way to collect it/)).toBeVisible();
  await expect(customer.getByText(/Dropped at Corner Shop/)).toBeVisible();

  // The collection job is finished, and a collect-at-the-point parcel is not a delivery job.
  await runner.goto("/runner");
  await expect(runner.locator("article", { hasText: code })).toHaveCount(0);

  const shop = await (await as("point")).newPage();
  await shop.goto("/point");
  await expect(shop.getByText(code)).toBeVisible();
  await shop.getByLabel("Someone at the counter?").fill(code.toLowerCase());
  await shop.getByRole("button", { name: "Hand over" }).click();
  await expect(shop.getByText(`${code} handed over. Enkosi!`)).toBeVisible();

  await customer.reload();
  await expect(customer.getByRole("heading", { name: "Delivered. Enkosi!" })).toBeVisible();
});

test("door delivery: a second job, finished only with the customer's 4-digit code", async ({ as, browser, baseURL }) => {
  const business = await (await as("business")).newPage();
  const code = await book(business, { from: "Sipho's Spaza", to: "Zanele", phone: "083 333 4444" });

  const customer = await browser.newPage({ baseURL });
  await customer.goto(receiverUrl(code));
  await customer.getByText("Bring it to my door").click();
  await customer.getByRole("button", { name: "Confirm" }).click();
  await expect(customer.locator("form [role=alert]")).toContainText("Tell us where to bring it");
  await customer.getByLabel("Where should we bring it?").fill("Blue gate opposite the Engen");
  await customer.getByRole("button", { name: "Confirm" }).click();
  await expect(customer.getByText("Saved. Thank you!")).toBeVisible();

  const runner = await (await as("runner")).newPage();
  await collectAndDrop(runner, code);

  // Now a delivery job: from the point to the customer's door.
  await runner.goto("/runner");
  const card = runner.locator("article", { hasText: code });
  await expect(card.getByText("Deliver to a door")).toBeVisible();
  await expect(card.getByText("Blue gate opposite the Engen")).toBeVisible();
  await card.getByRole("button", { name: "Accept this delivery" }).click();
  await runner.getByRole("button", { name: /I've collected it from Corner Shop/ }).click();
  await expect(runner.getByRole("heading", { name: "Step 2: Take it to the customer" })).toBeVisible();
  await expect(runner.getByRole("link", { name: "Message the customer" })).toHaveAttribute("href", /wa\.me\/27833334444/);

  // The customer sees their code, and the runner cannot finish without it.
  await customer.reload();
  const pin = (await customer.locator(".pinCard .bigCode").innerText()).trim();
  expect(pin).toMatch(/^\d{4}$/);

  const wrong = pin === "0000" ? "1111" : "0000";
  // The trip goes: on the way, arrived, end trip. The code is only asked for at the end.
  await runner.getByRole("button", { name: "I'm on my way to the customer" }).click();
  await runner.getByRole("button", { name: "I've arrived at the customer" }).click();
  await expect(runner.getByLabel("Ask the customer for their 4-digit code")).toBeVisible();
  await runner.getByLabel("Ask the customer for their 4-digit code").fill(wrong);
  await runner.getByRole("button", { name: "End trip" }).click();
  await expect(runner.locator("p.problem[role=alert]")).toContainText("That code isn't right");

  await runner.getByLabel("Ask the customer for their 4-digit code").fill(pin);
  await runner.getByRole("button", { name: "End trip" }).click();
  await expect(runner.getByRole("heading", { name: "Done. Enkosi!" })).toBeVisible();
  await expect(runner.getByText(/Trip ended. This parcel/)).toBeVisible();

  await customer.reload();
  await expect(customer.getByRole("heading", { name: "Delivered. Enkosi!" })).toBeVisible();
  // The wrong code is for the team's records, not the customer's screen.
  await expect(customer.getByText(/wrong delivery code/)).toHaveCount(0);
});

test("the sender's R12 is recorded at the hub, and the customer's R8 only when they chose a door", async ({ as, browser, baseURL }) => {
  const business = await (await as("business")).newPage();
  const code = await book(business, { from: "Thembi's Kitchen", to: "Buhle", phone: "084 555 6666" });

  const customer = await browser.newPage({ baseURL });
  await chooseDoor(customer, code, "Green gate next to the creche");

  const runner = await (await as("runner")).newPage();
  await collectAndDrop(runner, code);

  // The runner's finished collection counts towards what they have earned (R5 each).
  await runner.goto("/runner");
  await expect(runner.locator(".stat", { hasText: "Earned" })).toContainText(/R\d+/);
  await expect(runner.locator(".stat", { hasText: "Earned" })).not.toContainText("0 collected");

  // The hub records the business's R12. It cannot be recorded twice.
  const shop = await (await as("point")).newPage();
  await shop.goto("/point");
  const card = shop.locator(".card", { hasText: code });
  await expect(card.getByText("Sender owes R12")).toBeVisible();
  await card.getByRole("button", { name: "Cash received" }).click();
  await expect(card.getByText("Sender paid R12")).toBeVisible();

  // The sender sees it as paid on the tracking page; a stranger sees no payment details at all.
  await business.goto(`/track/${code}`);
  await expect(business.locator(".payRow", { hasText: "Sender's fee" })).toContainText("Paid");
  await expect(business.locator(".payRow", { hasText: "Door delivery extra" })).toContainText("Pay at your door");
  await customer.goto(`/track/${code}`);
  await expect(customer.getByRole("heading", { name: "Payment" })).toHaveCount(0);

  // The door customer pays the R8 extra to the runner on the trip.
  await runner.goto("/runner");
  await runner.locator("article", { hasText: code }).getByRole("button", { name: "Accept this delivery" }).click();
  await runner.getByRole("button", { name: /I've collected it from Corner Shop/ }).click();
  await runner.getByRole("button", { name: "I'm on my way to the customer" }).click();
  await runner.getByRole("button", { name: "Customer paid R8 cash" }).click();
  await expect(runner.getByText("Door fee R8 received.")).toBeVisible();
  await business.reload();
  await expect(business.locator(".payRow", { hasText: "Door delivery extra" })).toContainText("Paid");

  // The runner photographs the parcel at the door. Only people on the parcel can see the photo.
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
  await runner.getByLabel("Photo of the parcel").setInputFiles({ name: "door.png", mimeType: "image/png", buffer: png });
  await expect(runner.getByRole("button", { name: /Photo saved/ })).toBeVisible();
  const seen = await runner.request.get(`/api/parcels/${code}/photo`);
  expect(seen.status()).toBe(200);
  expect(seen.headers()["content-type"]).toBe("image/jpeg");
  expect((await customer.request.get(`/api/parcels/${code}/photo`)).status()).toBe(401);

  // A stranger cannot record payments, and the sender's fee cannot be recorded twice.
  const res = await customer.request.patch(`/api/parcels/${code}`, { data: { action: "mark_paid", what: "door" }, headers: { origin: baseURL! } });
  expect(res.status()).toBe(401);
  const second = await shop.request.patch(`/api/parcels/${code}`, { data: { action: "mark_paid", what: "send" }, headers: { origin: baseURL! } });
  expect(second.status()).toBe(409);
});

test("the team pays a runner what they are owed, and only the team can", async ({ as, browser, baseURL }) => {
  const business = await (await as("business")).newPage();
  const code = await book(business, { from: "Thembi's Kitchen", to: "Mandla", phone: "085 777 8888" });
  const runner = await (await as("runner")).newPage();
  await collectAndDrop(runner, code);

  await runner.goto("/runner");
  await expect(runner.locator(".stat", { hasText: "Earned" })).toContainText(/still owed R[1-9]\d*/);

  const refused = await runner.request.post("/api/payouts", { data: { runnerId: "x" }, headers: { origin: baseURL! } });
  expect(refused.status()).toBe(403);

  const team = await (await as("admin")).newPage();
  await team.goto("/ops");
  await team.getByRole("button", { name: /Mark .* as paid R[1-9]/ }).first().click();
  await runner.reload();
  await expect(runner.locator(".stat", { hasText: "Earned" })).toContainText("still owed R0");
});

test("a failed delivery goes back to the Izza point and the customer is told to collect it", async ({ as, browser, baseURL }) => {
  const business = await (await as("business")).newPage();
  const code = await book(business, { from: "Failed Bakery", to: "Not Home", phone: "084 444 5555" });
  const customer = await browser.newPage({ baseURL });
  await chooseDoor(customer, code, "Green gate");

  const runner = await (await as("runner")).newPage();
  await collectAndDrop(runner, code);
  await runner.goto("/runner");
  await runner.locator("article", { hasText: code }).getByRole("button", { name: "Accept this delivery" }).click();
  await runner.getByRole("button", { name: /I've collected it from Corner Shop/ }).click();
  await runner.getByRole("button", { name: "I couldn't deliver it" }).click();
  await runner.getByRole("button", { name: "Nobody was there" }).click();
  await expect(runner.getByRole("heading", { name: "Step 2: Take it to the customer" })).toHaveCount(0);

  await customer.goto(receiverUrl(code));
  await expect(customer.getByText(/back at Corner Shop/)).toBeVisible();
  await expect(customer.getByText("Nobody was there.")).toBeVisible();

  // It is now a collect-at-the-point parcel, so the shop can hand it over.
  const shop = await (await as("point")).newPage();
  await shop.goto("/point");
  await shop.getByLabel("Someone at the counter?").fill(code);
  await shop.getByRole("button", { name: "Hand over" }).click();
  await expect(shop.getByText(`${code} handed over. Enkosi!`)).toBeVisible();
});

test("a runner can give a job back, and it is open again for someone else", async ({ as }) => {
  const business = await (await as("business")).newPage();
  const code = await book(business, { from: "Give Back Cakes", to: "Give Back", phone: "085 666 7777" });

  const runner = await (await as("runner")).newPage();
  await runner.goto("/runner");
  await runner.locator("article", { hasText: code }).getByRole("button", { name: "Accept this job" }).click();
  await runner.getByRole("button", { name: "I can't do this job. Give it back." }).click();
  await expect(runner).toHaveURL(/\/runner$/);
  await expect(runner.locator("article", { hasText: code }).getByRole("button", { name: "Accept this job" })).toBeVisible();
});

test("two runners cannot take the same job, and nobody can work a job they did not accept", async ({ as }) => {
  const business = await (await as("business")).newPage();
  const code = await book(business, { from: "Race Bakery", to: "Race", phone: "086 888 9999" });

  const first = await as("admin");
  expect((await first.request.patch(`/api/parcels/${code}`, { data: { action: "accept" } })).status()).toBe(200);

  const second = await as("runner");
  expect((await second.request.patch(`/api/parcels/${code}`, { data: { action: "accept" } })).status()).toBe(409);
  for (const action of ["collected", "dropped", "release", "pickup_from_point"]) {
    expect((await second.request.patch(`/api/parcels/${code}`, { data: { action } })).status(), action).toBe(403);
  }
  // And the job page itself is closed to a runner who did not take it.
  const page = await second.newPage();
  await page.goto(`/runner/${code}`);
  await expect(page.getByRole("heading", { name: "This job isn't on your list" })).toBeVisible();
});

test("the shop cannot hand over a parcel the customer wants at their door", async ({ as, browser, baseURL }) => {
  const business = await (await as("business")).newPage();
  const code = await book(business, { from: "Door Test Bakery", to: "Door Test", phone: "084 555 6666" });
  const customer = await browser.newPage({ baseURL });
  await chooseDoor(customer, code, "Red gate");

  const runner = await (await as("runner")).newPage();
  await collectAndDrop(runner, code);

  const shop = await as("point");
  const res = await shop.request.patch(`/api/parcels/${code}`, { data: { action: "collect" } });
  expect(res.status()).toBe(409);
});

test("an unknown parcel code says so", async ({ page }) => {
  await page.goto("/track/NOPE-0000");
  await expect(page.getByText("We couldn't find that code")).toBeVisible();
});

test("a stranger sees where a parcel is, but not who it is for or where it is going", async ({ as, browser, baseURL }) => {
  const business = await (await as("business")).newPage();
  const code = await book(business, { from: "Secret Bakery", to: "Private Person", phone: "085 777 8888" });

  const stranger = await browser.newPage({ baseURL });
  await stranger.goto(`/track/${code}`);
  await expect(stranger.getByText("A runner will collect it today")).toBeVisible();
  await expect(stranger.getByText("to see more about this parcel")).toBeVisible();
  await expect(stranger.getByText("Secret Bakery")).toHaveCount(0);
  await expect(stranger.getByText("Private Person")).toHaveCount(0);
  await expect(stranger.getByText("0857778888")).toHaveCount(0);
  await stranger.close();
});

test("a customer sends from home: a runner collects it, the team is told, and it ends up at the shop", async ({ as, browser, baseURL }) => {
  const customer = await (await as("customer")).newPage();
  await customer.goto("/send");
  // There is no question about how it gets to the hub: a runner always collects.
  await expect(customer.getByText("I will bring it to the point")).toHaveCount(0);
  await customer.getByLabel("Pick up from").fill("Gogo's house, Langa");
  await customer.getByLabel("Their name").fill("Gogo Home");
  await customer.getByLabel("Their WhatsApp number").fill("087 111 2222");
  await customer.getByText("Corner Shop", { exact: true }).click();
  await customer.getByRole("button", { name: "Book it" }).click();
  await expect(customer.getByText("Enkosi! It's booked.")).toBeVisible();
  await expect(customer.getByText(/The Izza team has been told/)).toBeVisible();
  const code = (await customer.locator(".bigCode").innerText()).trim();

  // The team sees it at the top of their dashboard.
  const team = await (await as("admin")).newPage();
  await team.goto("/ops");
  await expect(team.getByText("New from a customer").first()).toBeVisible();
  await expect(team.getByRole("link", { name: code }).first()).toBeVisible();

  // A runner collects it and hands it to the shop, which then has it ready to collect.
  const runner = await (await as("runner")).newPage();
  await collectAndDrop(runner, code);
  const shop = await (await as("point")).newPage();
  await shop.goto("/point");
  await expect(shop.getByRole("heading", { name: "Ready to collect" })).toBeVisible();
  await expect(shop.locator("div.card", { hasText: code })).toBeVisible();

  const stranger = await browser.newPage({ baseURL });
  await stranger.goto(`/track/${code}`);
  await expect(stranger.getByText(/It's at Corner Shop/)).toBeVisible();
});

test("the team can give a waiting job to a runner, and only the team can", async ({ as }) => {
  const business = await (await as("business")).newPage();
  const code = await book(business, { from: "Assign Bakery", to: "Assign Me", phone: "088 222 3333" });

  const team = await as("admin");
  const page = await team.newPage();
  await page.goto("/ops");
  const row = page.locator("tr", { hasText: code });
  await row.getByRole("combobox").selectOption({ label: "Sipho" });
  await row.getByRole("button", { name: "Assign" }).click();
  await expect(page.locator("tr", { hasText: code })).toContainText("Sipho");

  const runner = await as("runner");
  const res = await runner.request.patch(`/api/parcels/${code}`, { data: { action: "assign", runnerId: "x" } });
  expect(res.status()).toBe(403);
});

test("a customer can read their parcel in isiXhosa", async ({ as, browser, baseURL }) => {
  const business = await (await as("business")).newPage();
  const code = await book(business, { from: "Thembi's Kitchen", to: "Thandi", phone: "086 123 4567" });

  const customer = await browser.newPage({ baseURL });
  await customer.goto(receiverUrl(code));
  await expect(customer.getByRole("heading", { name: "How would you like it?" })).toBeVisible();

  await customer.context().addCookies([{ name: "iza_lang", value: "xh", url: baseURL! }]);
  await customer.reload();
  await expect(customer.getByRole("heading", { name: "Ungathanda ukuyifumana njani?" })).toBeVisible();
  await expect(customer.getByText("Ndiza kuyithatha")).toBeVisible();
  await expect(customer.getByText("Molo, Thandi")).toBeVisible();
  await expect(customer.getByText("Ibhukishiwe")).toBeVisible();

  // The choice works in isiXhosa too, and the language is remembered on the next page.
  await customer.getByText("Ndiza kuyithatha").click();
  await customer.getByRole("button", { name: "Qinisekisa" }).click();
  await expect(customer.getByText("Kugcinwe. Enkosi!")).toBeVisible();
  await customer.goto("/track");
  await expect(customer.getByRole("heading", { name: "Ikuphi iparcel yam?" })).toBeVisible();

});

test("the sender does not know where they are: the receiver pins their address, and only then can a runner take it", async ({ as, browser, baseURL }) => {
  const business = await (await as("business")).newPage();
  const code = await book(business, { from: "Thembi's Kitchen", to: "Nokuthula", phone: "087 222 3333", toDoor: true });
  await expect(business.getByRole("link", { name: "Send them the link on WhatsApp" })).toHaveAttribute("href", /wa\.me\/27872223333\?text=.*pin/);

  // The receiver opens the link. Door delivery is already chosen, and they are asked where they are.
  const receiver = await browser.newPage({ baseURL });
  await receiver.goto(receiverUrl(code));
  await expect(receiver.getByText("Tell us exactly where you are.")).toBeVisible();
  await expect(receiver.getByLabel("Where should we bring it?")).toBeVisible();

  // It reaches the Izza point, but a runner cannot take a delivery nobody has an address for.
  const runner = await (await as("runner")).newPage();
  await collectAndDrop(runner, code);
  await runner.goto("/runner");
  await expect(runner.locator("article", { hasText: code })).toHaveCount(0);
  const refused = await runner.request.patch(`/api/parcels/${code}`, { data: { action: "accept" }, headers: { origin: baseURL! } });
  expect(refused.status()).toBe(409);

  // They pin where they are, and now the delivery is open.
  await receiver.reload();
  await receiver.getByLabel("Where should we bring it?").fill("House with the red door, 12 Mxolisi St");
  await receiver.getByRole("button", { name: "Save my choice" }).click();
  await expect(receiver.getByText("Saved. Thank you!")).toBeVisible();
  await runner.goto("/runner");
  const card = runner.locator("article", { hasText: code });
  await expect(card.getByText("Deliver to a door")).toBeVisible();
  await expect(card.getByText("House with the red door")).toBeVisible();
});

test("the short code alone shows where a parcel is, but not the delivery code, and nobody can choose without the receiver's key", async ({ as, browser, baseURL }) => {
  const business = await (await as("business")).newPage();
  const code = await book(business, { from: "Thembi's Kitchen", to: "Zinhle", phone: "081 765 4321" });

  // The receiver opens their link and picks the door.
  const receiver = await browser.newPage({ baseURL });
  await chooseDoor(receiver, code, "Yellow house on the corner");

  const runner = await (await as("runner")).newPage();
  await collectAndDrop(runner, code);
  await runner.goto("/runner");
  await runner.locator("article", { hasText: code }).getByRole("button", { name: "Accept this delivery" }).click();
  await runner.getByRole("button", { name: /I've collected it from Corner Shop/ }).click();

  // With the key they see the delivery code.
  await receiver.reload();
  await expect(receiver.locator(".pinCard .bigCode")).toHaveText(/^\d{4}$/);

  // A runner who knows the code, signed in or not, cannot read it or change the choice.
  for (const viewer of [runner, await browser.newPage({ baseURL })]) {
    await viewer.goto(`/track/${code}`);
    await expect(viewer.getByText("Got a link from the sender?")).toBeVisible();
    await expect(viewer.locator(".pinCard")).toHaveCount(0);
    await expect(viewer.getByRole("heading", { name: "How would you like it?" })).toHaveCount(0);
  }
  const noKey = await runner.request.patch(`/api/parcels/${code}`, { data: { action: "choose", choice: "point" }, headers: { origin: baseURL! } });
  expect(noKey.status()).toBe(403);
  const wrongKey = await runner.request.patch(`/api/parcels/${code}`, { data: { action: "choose", choice: "point", key: "not-the-key" }, headers: { origin: baseURL! } });
  expect(wrongKey.status()).toBe(403);
  const photoNoKey = await (await browser.newPage({ baseURL })).request.get(`/api/parcels/${code}/photo`);
  expect([401, 403]).toContain(photoNoKey.status());
});

test("a runner records the sender's R12 at the pickup, and the hub then sees it as paid", async ({ as }) => {
  const business = await (await as("business")).newPage();
  const code = await book(business, { from: "Thembi's Kitchen", to: "Aphiwe", phone: "082 000 1111" });

  const runner = await (await as("runner")).newPage();
  await runner.goto("/runner");
  await runner.locator("article", { hasText: code }).getByRole("button", { name: "Accept this job" }).click();
  await runner.getByRole("button", { name: "Sender paid R12 cash" }).click();
  await expect(runner.getByText("Sender's R12 received.")).toBeVisible();
  await runner.getByRole("button", { name: "I've collected it" }).click();
  await runner.getByRole("button", { name: /I've handed it to Corner Shop/ }).click();

  const shop = await (await as("point")).newPage();
  await shop.goto("/point");
  await expect(shop.locator(".card", { hasText: code })).toContainText("Sender paid R12");
});

test("the sender can cancel a parcel before a runner collects it, and everyone sees it is cancelled", async ({ as, browser, baseURL }) => {
  const business = await (await as("business")).newPage();
  const code = await book(business, { from: "Thembi's Kitchen", to: "Cancelled Cathy", phone: "083 999 0000" });

  const runner = await (await as("runner")).newPage();
  await runner.goto("/runner");
  await expect(runner.locator("article", { hasText: code })).toHaveCount(1);

  await business.goto(`/track/${code}`);
  await business.getByRole("button", { name: "Cancel this parcel" }).click();
  await business.getByRole("button", { name: "Yes, cancel it" }).click();
  await expect(business.getByRole("heading", { name: "Cancelled", exact: true })).toBeVisible();
  await expect(business.getByRole("button", { name: "Cancel this parcel" })).toHaveCount(0);

  // The runner no longer sees the job and cannot take it. The receiver and the business list show it as cancelled.
  await runner.goto("/runner");
  await expect(runner.locator("article", { hasText: code })).toHaveCount(0);
  const take = await runner.request.patch(`/api/parcels/${code}`, { data: { action: "accept" }, headers: { origin: baseURL! } });
  expect(take.status()).toBe(409);
  const receiver = await browser.newPage({ baseURL });
  await receiver.goto(receiverUrl(code));
  await expect(receiver.getByRole("heading", { name: "Cancelled", exact: true })).toBeVisible();
  await expect(receiver.getByRole("heading", { name: "How would you like it?" })).toHaveCount(0);
  await business.goto("/parcels");
  await expect(business.getByRole("heading", { name: "Finished" })).toBeVisible();

  // Only the sender or the team can cancel, and not once a runner has the parcel.
  const other = await (await as("customer")).newPage();
  const forbidden = await other.request.patch(`/api/parcels/${code}`, { data: { action: "cancel" }, headers: { origin: baseURL! } });
  expect([403, 409]).toContain(forbidden.status());
  const second = await book(business, { from: "Thembi's Kitchen", to: "Late Lerato", phone: "083 999 0001" });
  await runner.goto("/runner");
  await runner.locator("article", { hasText: second }).getByRole("button", { name: "Accept this job" }).click();
  await runner.getByRole("button", { name: "I've collected it" }).click();
  const tooLate = await business.request.patch(`/api/parcels/${second}`, { data: { action: "cancel" }, headers: { origin: baseURL! } });
  expect(tooLate.status()).toBe(409);
});

test("phone notifications: only people who can see a parcel can ask for them, and a failing phone never breaks a job", async ({ as, browser, baseURL }) => {
  const business = await (await as("business")).newPage();
  const code = await book(business, { from: "Thembi's Kitchen", to: "Notify Nandi", phone: "084 111 2222" });
  const origin = { origin: baseURL! };

  // The site publishes its notification key, the worker file and an app manifest.
  const guest = await browser.newPage({ baseURL });
  const key = await (await guest.request.get("/api/push/key")).json();
  expect(key.key).toMatch(/^[A-Za-z0-9_-]{80,}$/);
  expect((await guest.request.get("/sw.js")).status()).toBe(200);
  const manifest = await (await guest.request.get("/manifest.webmanifest")).json();
  expect(manifest.short_name).toBe("Izza");

  // The receiver's page offers it. The bare code does not.
  await guest.goto(receiverUrl(code));
  await expect(guest.getByRole("button", { name: "Get updates on this phone" })).toBeVisible();
  const stranger = await browser.newPage({ baseURL });
  await stranger.goto(`/track/${code}`);
  await expect(stranger.getByRole("button", { name: "Get updates on this phone" })).toHaveCount(0);

  const fake = { endpoint: "https://push.invalid/send/abc123", keys: { p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM", auth: "tBHItJI5svbpez7KI4CCXg" } };
  const runner = await (await as("runner")).newPage();
  const refused = await runner.request.post(`/api/parcels/${code}/push`, { data: { subscription: fake }, headers: origin });
  expect(refused.status()).toBe(403);
  const bad = await guest.request.post(`/api/parcels/${code}/push`, { data: { subscription: { endpoint: "http://not-https", keys: fake.keys }, key: KEYS.get(code) }, headers: origin });
  expect(bad.status()).toBe(400);
  const ok = await guest.request.post(`/api/parcels/${code}/push`, { data: { subscription: fake, key: KEYS.get(code), url: receiverUrl(code) }, headers: origin });
  expect(ok.status()).toBe(200);
  // The sender may ask too.
  const sender = await business.request.post(`/api/parcels/${code}/push`, { data: { subscription: { ...fake, endpoint: "https://push.invalid/send/sender" } }, headers: origin });
  expect(sender.status()).toBe(200);

  // With a phone subscribed that cannot be reached, the job still goes through.
  await collectAndDrop(runner, code);
  await expect(runner.getByRole("heading", { name: "Done. Enkosi!" })).toBeVisible();
});
