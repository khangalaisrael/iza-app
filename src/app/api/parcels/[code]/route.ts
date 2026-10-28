import { sameOrigin, userFromRequest } from "@/lib/auth";
import { FEE_DOOR, FEE_POINT, LAST_STAGE, NO_RUNNER, needsCollection, type Parcel } from "@/lib/parcels";
import { encodePlusCode } from "@/lib/pluscode";
import { getPointById } from "@/lib/pointStore";
import { addEvent, getParcel, listEvents, saveParcel } from "@/lib/store";
import { findUserById, type User } from "@/lib/users";

type Body = {
  action?: string;
  lat?: number;
  lng?: number;
  choice?: string;
  landmark?: string;
  kind?: string;
  reason?: string;
  pin?: string;
  runnerId?: string;
};

const deny = (error: string, status: number) => Response.json({ error }, { status });
const ok = () => Response.json({ ok: true });
const inRange = (v: unknown, limit: number): v is number =>
  typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= limit;

// The quick "tell the customer" buttons, and the step each one belongs to.
const UPDATES: Record<string, { stage: number; text: (who: string, point: string) => string }> = {
  heading_pickup: { stage: 0, text: (who) => `${who} is on the way to collect it.` },
  arrived_pickup: { stage: 0, text: (who) => `${who} has arrived to collect it.` },
  heading_point: { stage: 1, text: (who, point) => `${who} is on the way to ${point}.` },
  arrived_point: { stage: 1, text: (who, point) => `${who} has arrived at ${point}.` },
  heading_customer: { stage: 3, text: (who) => `${who} is on the way to you.` },
  arrived_customer: { stage: 3, text: (who) => `${who} has arrived. Please have your delivery code ready.` },
};

const PROBLEMS: Record<string, string> = {
  no_one_there: "Nobody was there.",
  not_ready: "The parcel wasn't ready.",
  cant_find: "Couldn't find the address.",
  refused: "The parcel was refused.",
  other: "Something went wrong.",
};

// choose:    the customer decides to collect at the Iza point or to have it brought to their door.
//            Whoever holds the delivery code can do this, until a runner is carrying it.
// collect:   the Iza point hands a waiting parcel to the person with the code.
// location:  a runner's phone reports where it is while the parcel is on the way.
// accept, release, update, collected, dropped, pickup_from_point, deliver, return_to_point, problem:
//            the runner's job. A runner can only touch a job they accepted.
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

  if (action === "collect") return collect(parcel, user);
  if (action === "receive") return receive(parcel, user);
  if (action === "assign") return assign(parcel, user, body);
  if (user.role !== "runner" && user.role !== "admin") return deny("Only runners can work on a job.", 403);
  return runnerAction(parcel, user, action, body);
}

// The Iza point confirms that the sender brought the parcel in.
async function receive(parcel: Parcel, user: User) {
  const point = parcel.pointId ? await getPointById(parcel.pointId) : undefined;
  const isItsPoint = user.role === "point" && !!point && point.ownerId === user.id;
  if (!isItsPoint && user.role !== "admin") return deny("Only the Iza point this parcel was sent to can confirm it.", 403);
  if (parcel.stage !== 0 || parcel.dropoff !== "self") return deny("That parcel isn't waiting to be brought in.", 409);
  await saveParcel({ ...parcel, stage: 2 });
  await addEvent(parcel.code, "received", `Received at ${parcel.point}. Ready for you.`, point?.name ?? user.name);
  return ok();
}

// The team gives a job to a runner. This is how stuck jobs get moving.
async function assign(parcel: Parcel, user: User, body: Body | null) {
  if (user.role !== "admin") return deny("Only the team can assign a runner.", 403);
  const runner = typeof body?.runnerId === "string" ? await findUserById(body.runnerId) : undefined;
  if (!runner || runner.role !== "runner" || runner.status !== "active") return deny("Choose an approved runner.", 400);
  const open = needsCollection(parcel) || (parcel.stage === 2 && parcel.choice === "door");
  if (!open) return deny("That parcel isn't waiting for a runner.", 409);
  await saveParcel({ ...parcel, runner: runner.name, runnerId: runner.id });
  await addEvent(parcel.code, "assigned", `${runner.name.split(" ")[0]} will take it.`, user.name);
  return ok();
}

async function collect(parcel: Parcel, user: User) {
  const point = parcel.pointId ? await getPointById(parcel.pointId) : undefined;
  const isItsPoint = user.role === "point" && !!point && point.ownerId === user.id;
  if (!isItsPoint && user.role !== "admin") return deny("Only the Iza point holding this parcel can hand it over.", 403);
  if (parcel.stage !== 2) return deny("That parcel isn't waiting at the Iza point.", 409);
  if (parcel.choice === "door") return deny("This customer asked for door delivery. A runner will take it.", 409);
  await saveParcel({ ...parcel, choice: "point", fee: FEE_POINT, stage: LAST_STAGE });
  await addEvent(parcel.code, "collected_by_customer", "Collected at the Iza point. Enkosi!", point?.name ?? null);
  return ok();
}

async function runnerAction(parcel: Parcel, user: User, action: string | undefined, body: Body | null) {
  const isAdmin = user.role === "admin";
  const mine = parcel.runnerId === user.id || (isAdmin && !!parcel.runnerId);
  const who = user.name.split(" ")[0];
  const code = parcel.code;
  const here = parcel.point;

  // 1. Take a job. Two kinds are open: collecting from a business, and bringing a door delivery from the point.
  if (action === "accept") {
    const open = !parcel.runnerId && (needsCollection(parcel) || (parcel.stage === 2 && parcel.choice === "door"));
    if (!open) return deny("That job isn't open any more. Someone else may have taken it.", 409);
    await saveParcel({ ...parcel, runner: user.name, runnerId: user.id });
    await addEvent(code, "accepted", parcel.stage === 0 ? `${who} will collect it.` : `${who} will bring it to your door.`, user.name);
    return ok();
  }

  // Everything below is only for the runner who accepted the job.
  if (!mine) return deny("That isn't your job. Accept it first.", 403);

  if (action === "release") {
    if (!(parcel.stage === 0 || parcel.stage === 2)) return deny("You are carrying it. Take it back to the Iza point instead.", 409);
    await saveParcel({ ...parcel, runner: NO_RUNNER, runnerId: undefined });
    await addEvent(code, "released", "The runner can't do it, so we are finding another one.", user.name);
    return ok();
  }

  if (action === "update") {
    const u = UPDATES[body?.kind ?? ""];
    if (!u || u.stage !== parcel.stage) return deny("That update doesn't fit this step.", 400);
    await addEvent(code, body!.kind!, u.text(who, here), user.name);
    return ok();
  }

  if (action === "problem") {
    const reason = PROBLEMS[body?.reason ?? ""];
    if (!reason) return deny("Choose what went wrong.", 400);
    await addEvent(code, "problem", reason, user.name);
    return ok();
  }

  if (action === "location") {
    if (!inRange(body?.lat, 90) || !inRange(body?.lng, 180)) return deny("A valid lat and lng are required.", 400);
    if (parcel.stage !== 3) return deny("That parcel isn't on the way.", 409);
    await saveParcel({ ...parcel, runnerLat: body!.lat, runnerLng: body!.lng });
    return ok();
  }

  // Collection: the parcel is in the runner's hands, then at the Iza point.
  if (action === "collected") {
    if (parcel.stage !== 0) return deny("That step is already done.", 409);
    await saveParcel({ ...parcel, stage: 1 });
    await addEvent(code, "collected", `Collected. On its way to ${here}.`, user.name);
    return ok();
  }
  if (action === "dropped") {
    if (parcel.stage !== 1) return deny("You need to collect it first.", 409);
    // The collection job ends here. A door delivery, if the customer wants one, is a new job for anyone.
    await saveParcel({ ...parcel, stage: 2, runnerId: undefined });
    await addEvent(code, "dropped", `Dropped at ${here}. Ready for you.`, user.name);
    return ok();
  }

  // Door delivery: pick it up from the point, then deliver it with the customer's code.
  if (action === "pickup_from_point") {
    if (parcel.stage !== 2 || parcel.choice !== "door") return deny("There is nothing to take from the point.", 409);
    await saveParcel({ ...parcel, stage: 3 });
    await addEvent(code, "picked_from_point", `${who} collected it from ${here}.`, user.name);
    return ok();
  }
  if (action === "deliver") {
    if (parcel.stage !== 3) return deny("You haven't picked it up yet.", 409);
    const tries = (await listEvents(code)).filter((e) => e.kind === "pin_wrong" && Date.now() - e.at < 30 * 60 * 1000).length;
    if (tries >= 5) return deny("Too many wrong codes. Ask the customer to check their code, then try again in 30 minutes.", 429);
    const pin = typeof body?.pin === "string" ? body.pin.trim() : "";
    if (!/^\d{4}$/.test(pin) || pin !== parcel.deliveryPin) {
      await addEvent(code, "pin_wrong", "A wrong delivery code was entered.", user.name);
      return deny("That code isn't right. Ask the customer to read their 4-digit code again.", 400);
    }
    await saveParcel({ ...parcel, stage: LAST_STAGE });
    await addEvent(code, "delivered", "Delivered. Trip ended. Enkosi!", user.name);
    return ok();
  }
  if (action === "return_to_point") {
    if (parcel.stage !== 3) return deny("You are not carrying it.", 409);
    // Nobody to give it to: it goes back to the Iza point and the customer collects it there.
    await saveParcel({
      ...parcel,
      stage: 2,
      choice: "point",
      fee: FEE_POINT,
      runnerId: undefined,
      runnerLat: undefined,
      runnerLng: undefined,
    });
    await addEvent(code, "returned", `We couldn't deliver it, so it is back at ${here}. Please collect it there with your code.`, user.name);
    return ok();
  }

  return deny("Unknown action.", 400);
}

async function choose(parcel: Parcel, body: Body | null) {
  if (parcel.stage >= 3) return deny("A runner already has it. It's too late to change.", 409);
  if (body?.choice !== "point" && body?.choice !== "door") return deny("Choose collect or door.", 400);

  if (body.choice === "point") {
    await saveParcel({ ...parcel, choice: "point", fee: FEE_POINT, landmark: "", lat: undefined, lng: undefined, plusCode: undefined });
    await addEvent(parcel.code, "chose_point", `The customer will collect it at ${parcel.point}.`, null);
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
  await addEvent(parcel.code, "chose_door", "The customer asked for door delivery.", null);
  return Response.json({ ok: true, fee: FEE_DOOR });
}
