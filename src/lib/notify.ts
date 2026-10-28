import { after } from "next/server";
import { db } from "./db";
import { whatsappNumber } from "./whatsapp";

// The updates the customer gets on WhatsApp by themselves. Everything else stays on the tracking page.
const NOTIFY_KINDS = new Set(["received", "dropped", "heading_customer", "arrived_customer", "delivered", "returned"]);

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://izza-app.vercel.app";

// Sends through the WhatsApp Business Cloud API (Meta). It needs WHATSAPP_TOKEN and WHATSAPP_PHONE_ID.
// A business can only start a chat with an approved message template, so set WHATSAPP_TEMPLATE to a template whose
// body is one variable, {{1}}, and optionally WHATSAPP_TEMPLATE_LANG (default en). Without the keys this does nothing.
async function send(to: string, text: string): Promise<void> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) return;

  const template = process.env.WHATSAPP_TEMPLATE;
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

// Called for every parcel event. Only customer-facing steps are sent, after the response has gone out.
export function notifyCustomer(code: string, kind: string, text: string): void {
  if (!process.env.WHATSAPP_TOKEN || !NOTIFY_KINDS.has(kind)) return;
  try {
    after(() => run(code, text));
  } catch {
    void run(code, text);
  }
}
