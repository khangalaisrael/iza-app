import { sameOrigin, userFromRequest } from "@/lib/auth";
import { LAST_STAGE } from "@/lib/parcels";
import { getParcel, saveParcel } from "@/lib/store";

type Body = { action?: string; lat?: number; lng?: number };

const deny = (error: string, status: number) => Response.json({ error }, { status });

// advance: moves a parcel one stage (runner claims, drops at the point, carries, delivers).
// location: the runner's phone reports where it is while the parcel is on the way.
// collect: the Iza point hands a waiting parcel to its owner, which finishes it.
export async function PATCH(request: Request, ctx: RouteContext<"/api/parcels/[code]">) {
  if (!sameOrigin(request)) return deny("Not allowed.", 403);

  const user = await userFromRequest(request);
  if (!user) return deny("Please sign in.", 401);
  if (user.status !== "active") return deny("Your account is waiting for approval.", 403);

  const { code } = await ctx.params;
  const parcel = await getParcel(decodeURIComponent(code));
  if (!parcel) return deny("Parcel not found.", 404);

  const body = (await request.json().catch(() => null)) as Body | null;
  const action = body?.action;
  const isAdmin = user.role === "admin";
  const isRunner = user.role === "runner" || isAdmin;
  const assignedToMe = parcel.runnerId === user.id || isAdmin;

  if (action === "location") {
    if (!isRunner || !assignedToMe) return deny("That isn't your parcel.", 403);
    const { lat, lng } = body ?? {};
    if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return deny("A valid lat and lng are required.", 400);
    }
    if (parcel.stage !== 3) return deny("That parcel isn't on the way.", 409);
    const moved = { ...parcel, runnerLat: lat, runnerLng: lng };
    await saveParcel(moved);
    return Response.json({ ok: true });
  }

  if (action === "collect") {
    const isPoint = user.role === "point" && (user.pointName ?? "") === parcel.point;
    if (!isPoint && !isAdmin) return deny("Only the Iza point holding this parcel can hand it over.", 403);
    if (parcel.stage !== 2) return deny("That parcel isn't waiting at the Iza point.", 409);
    await saveParcel({ ...parcel, stage: LAST_STAGE });
    return Response.json({ ok: true });
  }

  if (action === "advance") {
    if (!isRunner) return deny("Only runners can move a parcel.", 403);
    if (parcel.stage >= LAST_STAGE) return deny("Already delivered.", 409);
    const claiming = parcel.stage === 0 || parcel.stage === 2;
    // Once claimed, only that runner (or the team) can move it on.
    if (!claiming && !assignedToMe) return deny("That isn't your parcel.", 403);
    await saveParcel({
      ...parcel,
      stage: parcel.stage + 1,
      ...(claiming && { runner: user.name, runnerId: user.id }),
    });
    return Response.json({ ok: true });
  }

  return deny("Unknown action.", 400);
}
