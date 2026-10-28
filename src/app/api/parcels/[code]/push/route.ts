import { sameOrigin, userFromRequest } from "@/lib/auth";
import { saveSubscription } from "@/lib/push";
import { getParcel, keyMatches } from "@/lib/store";

const deny = (error: string, status: number) => Response.json({ error }, { status });

// A phone asks for notifications about one parcel. Only people who can already see the parcel can ask: the receiver (their link's
// key, or signed in as them), the sender, or the team. Anyone else would just be reading someone's parcel by another route.
export async function POST(request: Request, ctx: RouteContext<"/api/parcels/[code]/push">) {
  if (!sameOrigin(request)) return deny("Not allowed.", 403);
  const { code } = await ctx.params;
  const parcel = await getParcel(decodeURIComponent(code));
  if (!parcel) return deny("Parcel not found.", 404);

  const body = (await request.json().catch(() => null)) as { subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } }; key?: string; url?: string } | null;
  const user = await userFromRequest(request);
  const allowed =
    keyMatches(parcel, body?.key) ||
    (!!user &&
      user.status === "active" &&
      (user.role === "admin" || user.id === parcel.ownerId || (!!parcel.recipientPhone && user.identifier === parcel.recipientPhone)));
  if (!allowed) return deny("Open your own link to get updates.", 403);

  const sub = body?.subscription;
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth || !/^https:\/\//.test(sub.endpoint) || sub.endpoint.length > 1000) {
    return deny("That subscription can't be used.", 400);
  }
  // Open the page the person was on, and only a page on this site.
  const url = typeof body?.url === "string" && body.url.startsWith("/track/") ? body.url.slice(0, 300) : `/track/${parcel.code}`;
  await saveSubscription(parcel.code, { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } }, url);
  return Response.json({ ok: true });
}
