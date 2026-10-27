import { sameOrigin, userFromRequest } from "@/lib/auth";
import { FEE_DOOR, FEE_POINT, LAST_STAGE, type Parcel } from "@/lib/parcels";
import { encodePlusCode } from "@/lib/pluscode";
import { getPointById } from "@/lib/pointStore";
import { getParcel, saveParcel } from "@/lib/store";

type Body = {
  action?: string;
  lat?: number;
  lng?: number;
  choice?: string;
  landmark?: string;
};

const deny = (error: string, status: number) => Response.json({ error }, { status });
const inRange = (v: unknown, limit: number): v is number =>
  typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= limit;

// choose:   the customer decides to collect at the Iza point or to have it brought to their door.
//           Whoever holds the delivery code can do this, until a runner is carrying it.
// advance:  a runner moves a parcel on one step: take a job, drop at the point, take the door delivery, deliver.
// location: the runner's phone reports where it is while the parcel is on the way.
// collect:  the Iza point hands a waiting parcel to the person with the code.
export async function PATCH(request: Request, ctx: RouteContext<"/api/parcels/[code]">) {
  if (!sameOrigin(request)) return deny("Not allowed.", 403);

  const { code } = await ctx.params;
  const parcel = await getParcel(decodeURIComponent(code));
  if (!parcel) return deny("Parcel not found.", 404);

  const body = (await request.json().catch(() => null)) as Body | null;
  const action = body?.action;

  if (action === "choose") return choose(parcel, body);

  const user = await userFromRequest(request);
  if (!user) return deny("Please sign in.", 401);
  if (user.status !== "active") return deny("Your account is waiting for approval.", 403);

  const isAdmin = user.role === "admin";
  const isRunner = user.role === "runner" || isAdmin;
  const assignedToMe = parcel.runnerId === user.id || isAdmin;

  if (action === "location") {
    if (!isRunner || !assignedToMe) return deny("That isn't your parcel.", 403);
    if (!inRange(body?.lat, 90) || !inRange(body?.lng, 180)) return deny("A valid lat and lng are required.", 400);
    if (parcel.stage !== 3) return deny("That parcel isn't on the way.", 409);
    await saveParcel({ ...parcel, runnerLat: body!.lat, runnerLng: body!.lng });
    return Response.json({ ok: true });
  }

  if (action === "collect") {
    const point = parcel.pointId ? await getPointById(parcel.pointId) : undefined;
    const isItsPoint = user.role === "point" && !!point && point.ownerId === user.id;
    if (!isItsPoint && !isAdmin) return deny("Only the Iza point holding this parcel can hand it over.", 403);
    if (parcel.stage !== 2) return deny("That parcel isn't waiting at the Iza point.", 409);
    if (parcel.choice === "door") return deny("This customer asked for door delivery. A runner will take it.", 409);
    await saveParcel({ ...parcel, choice: "point", fee: FEE_POINT, stage: LAST_STAGE });
    return Response.json({ ok: true });
  }

  if (action === "advance") {
    if (!isRunner) return deny("Only runners can take a job.", 403);
    if (parcel.stage >= LAST_STAGE) return deny("Already delivered.", 409);

    // Two kinds of open job: collecting from a business (booked), and bringing it from the point to a door.
    const openJob = parcel.stage === 0 || (parcel.stage === 2 && parcel.choice === "door");
    if (parcel.stage === 2 && parcel.choice !== "door") {
      return deny("Waiting for the customer to choose. Nothing to deliver yet.", 409);
    }
    if (!openJob && !assignedToMe) return deny("That isn't your parcel.", 403);

    await saveParcel({
      ...parcel,
      stage: parcel.stage + 1,
      ...(openJob && { runner: user.name, runnerId: user.id }),
    });
    return Response.json({ ok: true });
  }

  return deny("Unknown action.", 400);
}

async function choose(parcel: Parcel, body: Body | null) {
  if (parcel.stage >= 3) return deny("A runner already has it. It's too late to change.", 409);
  if (body?.choice !== "point" && body?.choice !== "door") return deny("Choose collect or door.", 400);

  if (body.choice === "point") {
    await saveParcel({ ...parcel, choice: "point", fee: FEE_POINT, landmark: "", lat: undefined, lng: undefined, plusCode: undefined });
    return Response.json({ ok: true, fee: FEE_POINT });
  }

  const landmark = typeof body.landmark === "string" ? body.landmark.trim().slice(0, 200) : "";
  const hasPin = inRange(body.lat, 90) && inRange(body.lng, 180);
  if (!landmark && !hasPin) return deny("Tell us where to bring it: search for the place, share your location or drop a pin.", 400);

  await saveParcel({
    ...parcel,
    choice: "door",
    fee: FEE_DOOR,
    landmark: landmark || "Pinned location",
    ...(hasPin
      ? { lat: body.lat, lng: body.lng, plusCode: encodePlusCode(body.lat as number, body.lng as number) }
      : { lat: undefined, lng: undefined, plusCode: undefined }),
  });
  return Response.json({ ok: true, fee: FEE_DOOR });
}
