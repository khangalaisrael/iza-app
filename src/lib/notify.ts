import { after } from "next/server";
import { db } from "./db";
import { teamTopic } from "./settings";
import { whatsappNumber } from "./whatsapp";

// The updates the customer gets on WhatsApp by themselves. Everything else stays on the tracking page.
const NOTIFY_KINDS = new Set(["received", "dropped", "heading_customer", "arrived_customer", "delivered", "returned"]);

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://izza-app.vercel.app";

// Sends through the WhatsApp Business Cloud API (Meta). It needs WHATSAPP_TOKEN and WHATSAPP_PHONE_ID.
// A business can only start a chat with an approved message template, so set WHATSAPP_TEMPLATE to a template whose
// body is one variable, {{1}}, and optionally WHATSAPP_TEMPLATE_LANG (default en). Without the keys this does nothing.
async function send(to: string, text: string, templateName = process.env.WHATSAPP_TEMPLATE): Promise<void> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) return;

  const template = templateName;
  const body = template
    ? {
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: template,
          language: { code: process.env.WHATSAPP_TEMPLATE_LANG ?? "en" },
          components: [{ type: "body", parameters: [{ type: "text", text }] }],
        },
      }
    : { messaging_product: "whatsapp", to, type: "text", text: { body: text } };

  const res = await fetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(phoneId)}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) console.error("WhatsApp send failed", res.status, await res.text().catch(() => ""));
}

async function run(code: string, text: string): Promise<void> {
  try {
    if (!process.env.WHATSAPP_TOKEN) return;
    const [row] = await (await db()).query<{ recipient_phone: string | null; access_key: string | null }>("SELECT recipient_phone, access_key FROM parcels WHERE code = $1", [code]);
    if (!row?.recipient_phone) return;
    await send(whatsappNumber(row.recipient_phone), `Izza: ${text} ${SITE}/track/${code}${row.access_key ? `?k=${row.access_key}` : ""}`);
  } catch (err) {
    console.error("WhatsApp update failed", err); // a failed message must never fail the job
  }
}

// The team's own alerts: a new application, a password request, a parcel a customer sent, a runner's problem.
// Set TEAM_WHATSAPP_NUMBER to the team's WhatsApp number (several can be separated by commas), and, because WhatsApp only lets a
// business start a chat with an approved template, WHATSAPP_TEAM_TEMPLATE to a template whose body is one variable, {{1}}.
// Without the keys and the number this does nothing, and the count on the Team tab is the only alert.
// The phone alert (ntfy.sh, a public service) never names anyone: it only says something is waiting, and the team opens the Team page
// for the details. The WhatsApp message goes through the business's own account, so it can carry the detail.
export function notifyTeam(text: string, generic = "Something is waiting for the team."): void {
  pushToTeamPhones(generic);
  const numbers = (process.env.TEAM_WHATSAPP_NUMBER ?? "").split(",").map((n) => n.trim()).filter(Boolean);
  if (!process.env.WHATSAPP_TOKEN || numbers.length === 0) return;
  const go = async () => {
    for (const n of numbers) {
      try {
        await send(whatsappNumber(n), `Izza team: ${text} ${SITE}/ops`, process.env.WHATSAPP_TEAM_TEMPLATE ?? process.env.WHATSAPP_TEMPLATE);
      } catch (err) {
        console.error("Team alert failed", err); // an alert that fails must never fail the action that caused it
      }
    }
  };
  try {
    after(go);
  } catch {
    void go();
  }
}

// Alerts to the team's phones through ntfy.sh. It needs no account and no keys: the team opens the link on their Team page once.
// Only the live site sends them, so tests and local work never message anyone.
export async function sendTeamPush(text: string, title = "Izza team"): Promise<boolean> {
  if (process.env.VERCEL_ENV !== "production") return false;
  try {
    const topic = await teamTopic();
    const res = await fetch(`https://ntfy.sh/${topic}`, {
      method: "POST",
      headers: { Title: title, Click: `${SITE}/ops`, Tags: "package" },
      body: text,
    });
    return res.ok;
  } catch (err) {
    console.error("Team push failed", err); // an alert that fails must never fail the action that caused it
    return false;
  }
}

function pushToTeamPhones(text: string): void {
  if (process.env.VERCEL_ENV !== "production") return;
  try {
    after(() => sendTeamPush(text));
  } catch {
    void sendTeamPush(text);
  }
}

// Called for every parcel event. Only customer-facing steps are sent, after the response has gone out.
export function notifyCustomer(code: string, kind: string, text: string): void {
  if (!process.env.WHATSAPP_TOKEN || !NOTIFY_KINDS.has(kind)) return;
  try {
    after(() => run(code, text));
  } catch {
    void run(code, text);
  }
}
