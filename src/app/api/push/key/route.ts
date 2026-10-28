import { vapidPublicKey } from "@/lib/push";

// The public half of the site's notification key. A phone needs it to subscribe. It is meant to be public.
export async function GET() {
  return Response.json({ key: await vapidPublicKey() });
}
