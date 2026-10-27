import { sameOrigin, userFromRequest } from "@/lib/auth";
import { NO_RUNNER, type Parcel } from "@/lib/parcels";
import { encodePlusCode } from "@/lib/pluscode";
import { newParcelCode, saveParcel } from "@/lib/store";

type Body = {
  from?: string;
  landmark?: string;
  size?: string;
  speed?: string;
  lat?: number;
  lng?: number;
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
  const from = text(body?.from, 120);
  const landmark = text(body?.landmark, 200);
  if (!from || !landmark) {
    return Response.json({ error: "Pickup place and delivery landmark are required." }, { status: 400 });
  }

  const hasPin = inRange(body?.lat, 90) && inRange(body?.lng, 180);
  const parcel: Parcel = {
    code: await newParcelCode(),
    to: user.name,
    pickup: from,
    landmark,
    runner: NO_RUNNER,
    stage: 0,
    point: body?.speed === "door" ? "Main hub" : "Corner Shop",
    ownerId: user.id,
    ...(hasPin && {
      lat: body!.lat,
      lng: body!.lng,
      plusCode: encodePlusCode(body!.lat!, body!.lng!),
    }),
  };

  await saveParcel(parcel);
  return Response.json({ code: parcel.code, plusCode: parcel.plusCode ?? null }, { status: 201 });
}
