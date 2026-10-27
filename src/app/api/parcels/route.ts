import { sameOrigin, userFromRequest } from "@/lib/auth";
import { FEE_POINT, NO_RUNNER, type Parcel } from "@/lib/parcels";
import { getPointById } from "@/lib/pointStore";
import { encodePlusCode } from "@/lib/pluscode";
import { addEvent, newDeliveryPin, newParcelCode, saveParcel } from "@/lib/store";
import { normalizeIdentifier } from "@/lib/users";

type Body = {
  from?: string; // where the runner collects it, in words
  pickupLat?: number; // and as coordinates, from the sender's location or a map pin
  pickupLng?: number;
  toName?: string; // who it is for
  toPhone?: string; // their WhatsApp number
  pointId?: string; // the Iza point it goes to
  size?: string;
  note?: string;
};

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const inRange = (v: unknown, limit: number): v is number =>
  typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= limit;
const bad = (error: string, status = 400) => Response.json({ error }, { status });

// A business books a parcel to an Iza point. The customer chooses collect or door later.
export async function POST(request: Request) {
  if (!sameOrigin(request)) return bad("Not allowed.", 403);

  const user = await userFromRequest(request);
  if (!user) return bad("Please sign in to book.", 401);
  if (user.status !== "active" || (user.role !== "business" && user.role !== "admin")) {
    return bad("Only approved businesses can send parcels.", 403);
  }

  const body = (await request.json().catch(() => null)) as Body | null;
  const hasPickupPin = inRange(body?.pickupLat, 90) && inRange(body?.pickupLng, 180);

  // Words or coordinates are both fine for the pickup. Neither is not.
  const from = text(body?.from, 120) || (hasPickupPin ? "Pinned location" : "");
  if (!from) return bad("Tell us where to collect it: type the place, or share your location.");

  const toName = text(body?.toName, 60);
  if (toName.length < 2) return bad("Tell us who the parcel is for.");

  const phone = normalizeIdentifier(text(body?.toPhone, 30));
  if (!phone || phone.includes("@")) return bad("Enter their WhatsApp number, for example 082 345 6789.");

  const point = body?.pointId ? await getPointById(text(body.pointId, 80)) : undefined;
  if (!point || point.status !== "approved") return bad("Choose which Iza point it should go to.");

  const parcel: Parcel = {
    code: await newParcelCode(),
    to: toName,
    recipientPhone: phone,
    pickup: from,
    landmark: "",
    runner: NO_RUNNER,
    stage: 0,
    point: point.name,
    pointId: point.id,
    fee: FEE_POINT,
    size: ["Small", "Medium", "Large"].includes(text(body?.size, 10)) ? text(body?.size, 10) : "Small",
    ...(text(body?.note, 200) && { note: text(body?.note, 200) }),
    ownerId: user.id,
    deliveryPin: newDeliveryPin(),
    ...(hasPickupPin && {
      pickupLat: body!.pickupLat,
      pickupLng: body!.pickupLng,
      pickupPlusCode: encodePlusCode(body!.pickupLat!, body!.pickupLng!),
    }),
  };

  await saveParcel(parcel);
  await addEvent(parcel.code, "booked", `Booked. A runner will collect it and take it to ${point.name}.`, user.name);
  return Response.json({ code: parcel.code, point: point.name, phone }, { status: 201 });
}
