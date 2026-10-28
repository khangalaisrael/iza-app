import { sameOrigin, userFromRequest } from "@/lib/auth";
import { getPointById } from "@/lib/pointStore";
import { addEvent, getParcel, getPhoto, keyMatches, savePhoto } from "@/lib/store";

const PREFIX = "data:image/jpeg;base64,";
const MAX_CHARS = 600_000; // a phone photo shrunk to about 800 px is far smaller than this

const deny = (error: string, status: number) => Response.json({ error }, { status });

// The runner on the job takes a photo of the parcel at the door.
export async function POST(request: Request, ctx: RouteContext<"/api/parcels/[code]/photo">) {
  if (!sameOrigin(request)) return deny("Not allowed.", 403);
  const user = await userFromRequest(request);
  if (!user) return deny("Please sign in.", 401);

  const { code } = await ctx.params;
  const parcel = await getParcel(decodeURIComponent(code));
  if (!parcel) return deny("Parcel not found.", 404);
  if (user.status !== "active" || (user.role !== "admin" && !(user.role === "runner" && parcel.runnerId === user.id))) {
    return deny("Only the runner on this job can add a photo.", 403);
  }
  if (parcel.stage < 3) return deny("Take the photo once you have the parcel.", 409);

  const body = (await request.json().catch(() => null)) as { image?: string } | null;
  const image = body?.image;
  if (typeof image !== "string" || !image.startsWith(PREFIX) || image.length > MAX_CHARS || !/^[A-Za-z0-9+/=]+$/.test(image.slice(PREFIX.length))) {
    return deny("That photo can't be used. Try again.", 400);
  }
  await savePhoto(parcel.code, image, user.name);
  await addEvent(parcel.code, "photo", "A photo of the parcel was taken.", user.name, user.id);
  return Response.json({ ok: true });
}

// Only the people involved in the parcel can see the photo, the same as the private details on the tracking page.
export async function GET(request: Request, ctx: RouteContext<"/api/parcels/[code]/photo">) {
  const user = await userFromRequest(request);

  const { code } = await ctx.params;
  const parcel = await getParcel(decodeURIComponent(code));
  if (!parcel) return deny("Parcel not found.", 404);

  // The receiver's link carries a key, so they can see it without an account.
  const hasKey = keyMatches(parcel, new URL(request.url).searchParams.get("k"));
  if (!user && !hasKey) return deny("Please sign in.", 401);

  const point = parcel.pointId ? await getPointById(parcel.pointId) : undefined;
  const involved =
    !!user &&
    (user.role === "admin" ||
      user.id === parcel.ownerId ||
      user.id === parcel.runnerId ||
      (!!parcel.recipientPhone && user.identifier === parcel.recipientPhone) ||
      (user.role === "point" && !!point && point.ownerId === user.id));
  if (!involved && !hasKey) return deny("Not allowed.", 403);

  const image = await getPhoto(parcel.code);
  if (!image) return deny("No photo yet.", 404);
  const bytes = Buffer.from(image.slice(PREFIX.length), "base64");
  return new Response(bytes, { headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, no-store" } });
}
