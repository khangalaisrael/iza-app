import { LAST_STAGE } from "@/lib/parcels";
import { getParcel, saveParcel } from "@/lib/store";

type Body = { action?: string; runner?: string; lat?: number; lng?: number };

// advance: moves a parcel one stage (runner claims, drops at the point, carries, delivers).
// location: the runner's phone reports where it is while the parcel is on the way.
// collect: the Iza point hands a waiting parcel to its owner, which finishes it.
export async function PATCH(request: Request, ctx: RouteContext<"/api/parcels/[code]">) {
  const { code } = await ctx.params;
  const parcel = await getParcel(decodeURIComponent(code));
  if (!parcel) return Response.json({ error: "Parcel not found."}, { status: 404 });

  const body = (await request.json().catch(() => null)) as Body | null;
  if (body?.action !== "advance" && body?.action !== "collect" && body?.action !== "location") {
    return Response.json({ error: "Unknown action." }, { status: 400 });
  }
  if (body.action === "location") {
    const { lat, lng } = body;
    if (typeof lat !== "number" || typeof lng !== "number" || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return Response.json({ error: "A valid lat and lng are required." }, { status: 400 });
    }
    if (parcel.stage !== 3) {
      return Response.json({ error: "That parcel isn't on the way." }, { status: 409 });
    }
    const moved = { ...parcel, runnerLat: lat, runnerLng: lng };
    await saveParcel(moved);
    return Response.json(moved);
  }

  if (parcel.stage >= LAST_STAGE) {
    return Response.json({ error: "Already delivered." }, { status: 409 });
  }

  if (body.action === "collect") {
    if (parcel.stage !== 2) {
      return Response.json({ error: "That parcel isn't waiting at the Iza point." }, { status: 409 });
    }
    const done = { ...parcel, stage: LAST_STAGE };
    await saveParcel(done);
    return Response.json(done);
  }

  const claiming = parcel.stage === 0 || parcel.stage === 2;
  const next = {
    ...parcel,
    stage: parcel.stage + 1,
    runner: claiming && body.runner?.trim() ? body.runner.trim() : parcel.runner,
  };
  await saveParcel(next);
  return Response.json(next);
}
