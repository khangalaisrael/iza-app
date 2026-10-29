import { sameOrigin, userFromRequest } from "@/lib/auth";
import { FEE_DOOR, FEE_POINT, NO_RUNNER, type Parcel } from "@/lib/parcels";
import { getPointById } from "@/lib/pointStore";
import { encodePlusCode } from "@/lib/pluscode";
import { addEvent, newAccessKey, newDeliveryPin, newParcelCode, saveParcel } from "@/lib/store";
import { notifyTeam } from "@/lib/notify";
import { normalizeIdentifier } from "@/lib/users";

type Body = {
  toName?: string; // who it is for
  toPhone?: string; // their WhatsApp number
  pointId?: string; // the Izza point the sender chose, and will take the parcel to
  size?: string;
  note?: string;
  toLandmark?: string; // where it is going, when the sender knows. Otherwise the receiver pins it.
  toLat?: number;
  toLng?: number;
  delivery?: string; // "door": a runner brings it to their door. Otherwise they collect it at the hub.
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
  const fromCustomer = user.role === "customer";

  const toName = text(body?.toName, 60);
  if (toName.length < 2) return bad("Tell us who the parcel is for.");

  const phone = normalizeIdentifier(text(body?.toPhone, 30));
  if (!phone || phone.includes("@")) return bad("Enter their WhatsApp number, for example 082 345 6789.");

  // "To their door": the receiver is asked to pin their own address, so the sender never needs to know it.
  const toDoor = body?.delivery === "door";
  // The sender may know where it is going. If they say, it is saved, and the receiver only checks it. If not, the receiver pins it.
  const toLandmark = toDoor ? text(body?.toLandmark, 200) : "";
  const toPinned = toDoor && inRange(body?.toLat, 90) && inRange(body?.toLng, 180);
  const knownAddress = !!toLandmark || toPinned;

  const point = body?.pointId ? await getPointById(text(body.pointId, 80)) : undefined;
  if (!point || point.status !== "approved") return bad("Choose which Izza point it should go to.");

  const parcel: Parcel = {
    code: await newParcelCode(),
    to: toName,
    recipientPhone: phone,
    pickup: "Brought to the hub by the sender",
    landmark: toLandmark || (toPinned ? "Pinned location" : ""),
    ...(toPinned && { lat: body!.toLat, lng: body!.toLng, plusCode: encodePlusCode(body!.toLat!, body!.toLng!) }),
    runner: NO_RUNNER,
    stage: 0,
    point: point.name,
    pointId: point.id,
    fee: toDoor ? FEE_DOOR : FEE_POINT,
    ...(toDoor && { choice: "door" as const }),
    size: ["Small", "Medium", "Large"].includes(text(body?.size, 10)) ? text(body?.size, 10) : "Small",
    ...(text(body?.note, 200) && { note: text(body?.note, 200) }),
    ownerId: user.id,
    // The sender takes it to the hub. Izza does not collect from senders.
    dropoff: "self",
    senderKind: fromCustomer ? "customer" : "business",
    deliveryPin: newDeliveryPin(),
    accessKey: newAccessKey(),
  };

  await saveParcel(parcel);
  await addEvent(
    parcel.code,
    "booked",
    `Booked. Waiting for it to be brought to ${point.name}.${toDoor ? (knownAddress ? " It will then be taken to the address the sender gave." : " It will then be taken to the receiver's door once they pin their address.") : ""}`,
    user.name,
  );
  // The team is told about every parcel a customer sends to the hub. It shows at the top of their dashboard.
  if (fromCustomer) {
    await addEvent(parcel.code, "sent_by_customer", `A customer sent a parcel to ${point.name}. The team has been told.`, user.name);
    notifyTeam(`${user.name} sent parcel ${parcel.code} to ${point.name}.`, "A customer sent a parcel.");
  }
  return Response.json({ code: parcel.code, key: parcel.accessKey, point: point.name, phone, dropoff: "self", delivery: toDoor ? "door" : "shop", knownAddress }, { status: 201 });
}
