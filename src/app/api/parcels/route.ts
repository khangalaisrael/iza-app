import { sameOrigin, userFromRequest } from "@/lib/auth";
import { FEE_DOOR, FEE_POINT, NO_RUNNER, type Parcel } from "@/lib/parcels";
import { getPointById } from "@/lib/pointStore";
import { encodePlusCode } from "@/lib/pluscode";
import { addEvent, newAccessKey, newDeliveryPin, newParcelCode, saveParcel } from "@/lib/store";
import { normalizeIdentifier } from "@/lib/users";

type Body = {
  from?: string; // where the runner collects it, in words
  pickupLat?: number; // and as coordinates, from the sender's location or a map pin
  pickupLng?: number;
  toName?: string; // who it is for
  toPhone?: string; // their WhatsApp number
  pointId?: string; // the Izza point it goes to
  size?: string;
  note?: string;
  delivery?: string; // "door": the sender does not know where the receiver is, so the receiver pins it. Otherwise the receiver chooses.
  dropoff?: string; // "self": the sender brings it to the hub. "runner": a runner collects it from them.
};

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const inRange = (v: unknown, limit: number): v is number =>
  typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= limit;
const bad = (error: string, status = 400) => Response.json({ error }, { status });

// A business or a customer sends a parcel to an Izza point. The person it is for chooses collect or door later.
export async function POST(request: Request) {
  if (!sameOrigin(request)) return bad("Not allowed.", 403);

  const user = await userFromRequest(request);
  if (!user) return bad("Please sign in to book.", 401);
  if (user.status !== "active" || (user.role !== "business" && user.role !== "admin" && user.role !== "customer")) {
    return bad("Only customers and approved businesses can send parcels.", 403);
  }

  const body = (await request.json().catch(() => null)) as Body | null;
  const hasPickupPin = inRange(body?.pickupLat, 90) && inRange(body?.pickupLng, 180);

  const dropoff = body?.dropoff === "self" ? "self" : "runner";
  const fromCustomer = user.role === "customer";

  // A runner needs to know where to go. If the sender brings it to the hub, no place is needed.
  const from =
    dropoff === "self"
      ? "Brought to the hub by the sender"
      : text(body?.from, 120) || (hasPickupPin ? "Pinned location" : "");
  if (!from) return bad("Tell us where to collect it: type the place, or share your location.");

  const toName = text(body?.toName, 60);
  if (toName.length < 2) return bad("Tell us who the parcel is for.");

  const phone = normalizeIdentifier(text(body?.toPhone, 30));
  if (!phone || phone.includes("@")) return bad("Enter their WhatsApp number, for example 082 345 6789.");

  // "To their door": the receiver is asked to pin their own address, so the sender never needs to know it.
  const toDoor = body?.delivery === "door";

  const point = body?.pointId ? await getPointById(text(body.pointId, 80)) : undefined;
  if (!point || point.status !== "approved") return bad("Choose which Izza point it should go to.");

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
    fee: toDoor ? FEE_DOOR : FEE_POINT,
    ...(toDoor && { choice: "door" as const }),
    size: ["Small", "Medium", "Large"].includes(text(body?.size, 10)) ? text(body?.size, 10) : "Small",
    ...(text(body?.note, 200) && { note: text(body?.note, 200) }),
    ownerId: user.id,
    dropoff,
    senderKind: fromCustomer ? "customer" : "business",
    deliveryPin: newDeliveryPin(),
    accessKey: newAccessKey(),
    ...(dropoff === "runner" && hasPickupPin && {
      pickupLat: body!.pickupLat,
      pickupLng: body!.pickupLng,
      pickupPlusCode: encodePlusCode(body!.pickupLat!, body!.pickupLng!),
    }),
  };

  await saveParcel(parcel);
  await addEvent(
    parcel.code,
    "booked",
    dropoff === "self"
      ? `Booked. Waiting for it to be brought to ${point.name}.${toDoor ? " It will be taken to the receiver's door once they pin their address." : ""}`
      : `Booked. A runner will collect it and take it to ${point.name}.${toDoor ? " It will be taken to the receiver's door once they pin their address." : ""}`,
    user.name,
  );
  // The team is told about every parcel a customer sends to the hub. It shows at the top of their dashboard.
  if (fromCustomer) {
    await addEvent(parcel.code, "sent_by_customer", `A customer sent a parcel to ${point.name}. The team has been told.`, user.name);
  }
  return Response.json({ code: parcel.code, key: parcel.accessKey, point: point.name, phone, dropoff, delivery: toDoor ? "door" : "shop" }, { status: 201 });
}
