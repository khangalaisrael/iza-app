"use server";

import { redirect } from "next/navigation";
import { endSession, requireUser, safeNext, startSession } from "@/lib/auth";
import { DUMMY_HASH, hashPassword, verifyPassword } from "@/lib/password";
import { landingFor } from "@/lib/roles";
import { notifyTeam, sendTeamPush } from "@/lib/notify";
import { releaseRunnerJobs } from "@/lib/store";
import { addResetRequest, clearResetRequest, consumeReset, createReset, setPassword } from "@/lib/reset";
import { POINT_KINDS, createPoint, deletePoint, getPointById, setPointStatusForOwner, updatePoint } from "@/lib/pointStore";
import {
  clearFailures,
  createUser,
  findUserById,
  findUserByIdentifier,
  normalizeIdentifier,
  recordFailure,
  setUserStatus,
  tooManyFailures,
  type Role,
} from "@/lib/users";

// `values` gives back what was typed (never the password), so an error does not wipe the form.
export type AuthState = { error?: string; values?: Record<string, string>; link?: string; phone?: string; step?: number };

const SIGNUP_ROLES: Role[] = ["customer", "business", "runner", "point"];
const WRONG = "That phone number, email or password isn't right.";

// Where to go after signing in: back to the page they were trying to reach, otherwise their own workspace.
function destination(next: FormDataEntryValue | null, role: Role): string {
  const wanted = safeNext(next);
  return wanted === "/" ? landingFor(role) : wanted;
}

export async function signInAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const identifier = normalizeIdentifier(String(form.get("identifier") ?? ""));
  const password = String(form.get("password") ?? "");
  if (!identifier || !password) return { error: WRONG };

  if (await tooManyFailures(identifier)) {
    return { error: "Too many tries. Wait 15 minutes and try again." };
  }

  const user = await findUserByIdentifier(identifier);
  // Always check a hash, so the answer takes the same time whether or not the account exists.
  const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok || user.status === "disabled") {
    await recordFailure(identifier);
    return { error: WRONG };
  }

  await clearFailures(identifier);
  await startSession(user.id);
  redirect(user.status === "active" ? destination(form.get("next"), user.role) : "/pending");
}

export async function signOutAction(): Promise<void> {
  await endSession();
  redirect("/");
}

// The team adds an Izza point themselves (for example the hub), and it is live straight away.
export async function addPointAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  await requireUser(["admin"], "/ops");
  const name = String(form.get("pointName") ?? "").trim();
  const kind = String(form.get("pointKind") ?? "");
  const address = String(form.get("pointAddress") ?? "").trim();
  const hours = String(form.get("pointHours") ?? "").trim();
  const lat = Number(form.get("pointLat"));
  const lng = Number(form.get("pointLng"));
  const values = { pointName: name, pointKind: kind, pointHours: hours, pointAddress: address };

  if (name.length < 2 || name.length > 60) return { error: "Give the place a name.", values };
  if (!(POINT_KINDS as readonly string[]).includes(kind)) return { error: "Choose what kind of place it is.", values };
  if (form.get("pointLat") === "" || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return { error: "Search for the place, use your location or tap the map first.", values };
  }
  if (hours.length < 3 || hours.length > 80) return { error: "Tell us when it is open, for example 07:00 to 20:00.", values };

  await createPoint({ name, kind, address: address || name, lat, lng, hours, ownerId: null, status: "approved" });
  redirect("/ops?added=1");
}

// The team makes a one-time reset link for someone who forgot their password, and sends it to them themselves.
export async function issueResetAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  await requireUser(["admin"], "/ops");
  const raw = String(form.get("identifier") ?? "");
  const identifier = normalizeIdentifier(raw);
  const values = { identifier: raw };
  if (!identifier) return { error: "Enter their phone number or email.", values };
  const user = await findUserByIdentifier(identifier);
  if (!user || user.status === "disabled") return { error: "No active account with that phone number or email.", values };
  const token = await createReset(user.id);
  await clearResetRequest(user.id);
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://izza-app.vercel.app";
  return { link: `${site}/reset/${token}`, phone: identifier.includes("@") ? undefined : identifier, values };
}

// Anyone can say they forgot their password. The answer is always the same, so this cannot be used to find out who has an
// account. Only a real, active account gets a request on the team's list, and the team sends the link themselves.
export async function requestResetAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const raw = String(form.get("identifier") ?? "");
  const identifier = normalizeIdentifier(raw);
  if (!identifier) return { error: "Enter the phone number or email you signed up with.", values: { identifier: raw } };
  if (!(await tooManyFailures("reset:" + identifier))) {
    await recordFailure("reset:" + identifier); // reuses the sign-in counter so one number cannot be asked about again and again
    const user = await findUserByIdentifier(identifier);
    if (user && user.status !== "disabled") {
      await addResetRequest(user.id);
      notifyTeam(`${user.name} forgot their password and is waiting for a reset link.`, "Someone is waiting for a password reset link.");
    }
  }
  return { link: "sent", phone: identifier, values: { identifier: raw } };
}

// The team checks that alerts reach their phone.
export async function testTeamAlertAction(): Promise<AuthState> {
  await requireUser(["admin"], "/ops");
  if (process.env.VERCEL_ENV !== "production") return { error: "Alerts only go out from the live site, so this test does nothing here." };
  const ok = await sendTeamPush("This is a test alert from Izza. If you can read this, alerts are working.", "Izza test");
  return ok ? { link: "sent" } : { error: "The alert could not be sent. Try again in a minute." };
}

// Someone opens the link they were given and chooses a new password. The link works once.
export async function resetPasswordAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const token = String(form.get("token") ?? "");
  const password = String(form.get("password") ?? "");
  if (password.length < 8 || password.length > 200) return { error: "Use a password of at least 8 characters." };
  if (password !== String(form.get("again") ?? "")) return { error: "The two passwords don't match." };

  const userId = await consumeReset(token);
  if (!userId) return { error: "This link has expired or was already used. Ask the Izza team for a new one." };
  await setPassword(userId, await hashPassword(password));
  await clearFailures((await findUserById(userId))!.identifier);
  await startSession(userId);
  const user = (await findUserById(userId))!;
  redirect(user.status === "active" ? landingFor(user.role) : "/pending");
}

// The team switches a person off or back on. Someone switched off is signed out and cannot sign in, a runner's waiting jobs
// go back to the open list, and an Izza point leaves the map until it is switched back on.
export async function setUserActiveAction(form: FormData): Promise<void> {
  const admin = await requireUser(["admin"], "/ops");
  const id = String(form.get("id") ?? "");
  const decision = String(form.get("decision") ?? "");
  const target = id ? await findUserById(id) : undefined;
  if (target && target.id !== admin.id && target.role !== "admin" && (decision === "disable" || decision === "enable")) {
    await setUserStatus(id, decision === "disable" ? "disabled" : "active");
    await setPointStatusForOwner(id, decision === "disable" ? "rejected" : "approved");
    if (decision === "disable" && target.role === "runner") await releaseRunnerJobs(id);
  }
  redirect("/ops");
}

export async function approveUserAction(form: FormData): Promise<void> {
  await requireUser(["admin"], "/ops");
  const id = String(form.get("id") ?? "");
  const decision = String(form.get("decision") ?? "");
  if (id && (decision === "approve" || decision === "reject")) {
    await setUserStatus(id, decision === "approve" ? "active" : "disabled");
    // An Izza point appears on the public map only once its owner is approved.
    await setPointStatusForOwner(id, decision === "approve" ? "approved" : "rejected");
  }
  redirect("/ops");
}

// The team renames a place or changes its opening hours.
export async function updatePointAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  await requireUser(["admin"], "/ops");
  const id = String(form.get("pointId") ?? "");
  const name = String(form.get("pointName") ?? "").trim();
  const hours = String(form.get("pointHours") ?? "").trim();
  const values = { pointName: name, pointHours: hours };
  if (!(await getPointById(id))) return { error: "That place no longer exists.", values };
  if (name.length < 2 || name.length > 60) return { error: "Give the place a name.", values };
  if (hours.length < 3 || hours.length > 80) return { error: "Tell us when it is open, for example 07:00 to 20:00.", values };
  await updatePoint(id, { name, hours });
  redirect("/ops?updated=1");
}

// The team removes a place, as long as nothing is on its way to it.
export async function deletePointAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  await requireUser(["admin"], "/ops");
  const result = await deletePoint(String(form.get("pointId") ?? ""));
  if (!result.ok) return { error: result.error };
  redirect("/ops?removed=1");
}
