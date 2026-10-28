import { sameOrigin, userFromRequest } from "@/lib/auth";
import { payOutRunner } from "@/lib/store";
import { findUserById } from "@/lib/users";

// The team pays a runner everything they are owed, and the balance goes back to zero.
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Not allowed." }, { status: 403 });
  const user = await userFromRequest(request);
  if (!user) return Response.json({ error: "Please sign in." }, { status: 401 });
  if (user.role !== "admin" || user.status !== "active") return Response.json({ error: "Only the team can pay a runner." }, { status: 403 });

  const body = (await request.json().catch(() => null)) as { runnerId?: string } | null;
  const runner = typeof body?.runnerId === "string" ? await findUserById(body.runnerId) : undefined;
  if (!runner || runner.role !== "runner") return Response.json({ error: "Choose a runner." }, { status: 400 });

  const amount = await payOutRunner(runner.id, user.name);
  if (amount === 0) return Response.json({ error: "Nothing is owed to this runner." }, { status: 409 });
  return Response.json({ ok: true, amount });
}
