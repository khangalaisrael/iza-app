import { sameOrigin, userFromRequest } from "@/lib/auth";
import { NO_RUNNER, type Parcel } from "@/lib/parcels";
import { encodePlusCode } from "@/lib/pluscode";
import { newParcelCode, saveParcel } from "@/lib/store";

type Body = {
  from?: string; // the place to collect it from, in words
  landmark?: string; // where it should go, in words
  speed?: string; // "door" or "shop"
  lat?: number; // where it should go, as coordinates
  lng?: number;
  pickupLat?: number; // where to collect it, as coordinates (from the sender's phone or a map pin)
  pickupLng?: number;
};

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const inRange = (v: unknown, limit: number): v is number =>
  typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= limit;

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Not allowed." }, { status: 403 });

  const user = await userFromRequest(request);
  if (!user) return Response.json({ error: "Please sign in to book." }, { status: 401 });
  if (user.status !== "active" || (user.role !== "customer" && user.role !== "admin")) {
    return Response.json({ error: "Only customers can book a delivery." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as Body | null;
  const hasPickupPin = inRange(body?.pickupLat, 90) && inRange(body?.pickupLng, 180);
  const hasPin = inRange(body?.lat, 90) && inRange(body?.lng, 180);

  // Words or coordinates are both fine for the pickup. Neither is not.
  const from = text(body?.from, 120) || (hasPickupPin ? "Pinned location" : "");
  const landmark = text(body?.landmark, 200);
  if (!from) {
    return Response.json({ error: "Tell us where to collect it: share your location or name the place." }, { status: 400 });
  }
  if (!landmark) {
    return Response.json({ error: "Tell us where it should go. A landmark is enough." }, { status: 400 });
  }

  const parcel: Parcel = {
    code: await newParcelCode(),
    to: user.name,
    pickup: from,
    landmark,
    runner: NO_RUNNER,
    stage: 0,
    point: body?.speed === "door" ? "Main hub" : "Corner Shop",
    ownerId: user.id,
    ...(hasPickupPin && {
      pickupLat: body!.pickupLat,
      pickupLng: body!.pickupLng,
      pickupPlusCode: encodePlusCode(body!.pickupLat!, body!.pickupLng!),
    }),
    ...(hasPin && {
      lat: body!.lat,
      lng: body!.lng,
      plusCode: encodePlusCode(body!.lat!, body!.lng!),
    }),
  };

  await saveParcel(parcel);
  return Response.json({ code: parcel.code, plusCode: parcel.plusCode ?? null }, { status: 201 });
}
