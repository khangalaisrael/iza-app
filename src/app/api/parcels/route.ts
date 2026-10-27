import { encodePlusCode } from "@/lib/pluscode";
import { NO_RUNNER, type Parcel } from "@/lib/parcels";
import { saveParcel } from "@/lib/store";

type Body = {
  from?: string;
  landmark?: string;
  size?: string;
  speed?: string;
  lat?: number;
  lng?: number;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body?.from?.trim() || !body.landmark?.trim()) {
    return Response.json(
      { error: "Pickup place and delivery landmark are required." },
      { status: 400 },
    );
  }

  const hasPin = typeof body.lat === "number" && typeof body.lng === "number";
  const code = `IZA-${Math.floor(1000 + Math.random() * 9000)}`;

  const parcel: Parcel = {
    code,
    to: "Customer",
    pickup: body.from.trim(),
    landmark: body.landmark.trim(),
    runner: NO_RUNNER,
    stage: 0,
    point: body.speed === "door" ? "Main hub" : "Corner Shop",
    ...(hasPin && {
      lat: body.lat,
      lng: body.lng,
      plusCode: encodePlusCode(body.lat!, body.lng!),
    }),
  };

  await saveParcel(parcel);
  return Response.json({ code, plusCode: parcel.plusCode ?? null }, { status: 201 });
}
