import webpush from "web-push";
import { after } from "next/server";
import { db } from "./db";

// Notifications that come from the website itself, with no account and no keys to set up. A person taps "Get updates on this phone"
// once on their parcel page, and the phone then shows a notification when the parcel moves. The site makes its own signing keys
// the first time they are needed and keeps them in the database.
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://izza-app.vercel.app";

// The steps that are worth a notification, for the person receiving and for the person sending.
const PUSH_KINDS = new Set([
  "accepted",
  "collected",
  "received",
  "dropped",
  "picked_from_point",
  "heading_customer",
  "arrived_customer",
  "delivered",
  "returned",
  "cancelled",
]);

async function vapid(): Promise<{ publicKey: string; privateKey: string }> {
  const d = await db();
  const get = async (key: string) => (await d.query<{ value: string }>("SELECT value FROM settings WHERE key = $1", [key]))[0]?.value;
  let publicKey = await get("vapid_public");
  let privateKey = await get("vapid_private");
  if (!publicKey || !privateKey) {
    const keys = webpush.generateVAPIDKeys();
    // If two requests make keys at the same moment, the first pair saved is the one everyone uses.
    await d.query("INSERT INTO settings (key, value) VALUES ('vapid_public', $1) ON CONFLICT (key) DO NOTHING", [keys.publicKey]);
    await d.query("INSERT INTO settings (key, value) VALUES ('vapid_private', $1) ON CONFLICT (key) DO NOTHING", [keys.privateKey]);
    publicKey = await get("vapid_public");
    privateKey = await get("vapid_private");
  }
  return { publicKey: publicKey!, privateKey: privateKey! };
}

export async function vapidPublicKey(): Promise<string> {
  return (await vapid()).publicKey;
}

export type PushSubscriptionJson = { endpoint: string; keys: { p256dh: string; auth: string } };

export async function saveSubscription(code: string, sub: PushSubscriptionJson, url: string): Promise<void> {
  await (
    await db()
  ).query(
    `INSERT INTO push_subscriptions (endpoint, code, p256dh, auth, url, created_at) VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (endpoint, code) DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, url = EXCLUDED.url`,
    [sub.endpoint, code, sub.keys.p256dh, sub.keys.auth, url, Date.now()],
  );
}

type Row = { endpoint: string; p256dh: string; auth: string; url: string };

async function send(code: string, body: string): Promise<void> {
  try {
    const d = await db();
    const rows = await d.query<Row>("SELECT endpoint, p256dh, auth, url FROM push_subscriptions WHERE code = $1", [code]);
    if (rows.length === 0) return;
    const keys = await vapid();
    for (const r of rows) {
      try {
        await webpush.sendNotification(
          { endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } },
          JSON.stringify({ title: `Izza parcel ${code}`, body, url: r.url }),
          { TTL: 3600, vapidDetails: { subject: SITE, publicKey: keys.publicKey, privateKey: keys.privateKey } },
        );
      } catch (err) {
        // A phone that has uninstalled or blocked notifications answers 404 or 410. Forget it.
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) await d.query("DELETE FROM push_subscriptions WHERE endpoint = $1 AND code = $2", [r.endpoint, code]);
        else console.error("Push failed", status ?? err);
      }
    }
  } catch (err) {
    console.error("Push failed", err); // a notification that fails must never fail the job
  }
}

// Called for every parcel event. Sent after the response has gone out.
export function pushForEvent(code: string, kind: string, text: string): void {
  if (!PUSH_KINDS.has(kind)) return;
  try {
    after(() => send(code, text));
  } catch {
    void send(code, text);
  }
}
