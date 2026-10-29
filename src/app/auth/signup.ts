"use server";

import { redirect } from "next/navigation";
import { safeNext, startSession } from "@/lib/auth";
import { notifyTeam } from "@/lib/notify";
import { POINT_KINDS, createPoint } from "@/lib/pointStore";
import { clean, readBasics, register } from "@/lib/register";
import { BUSINESS_KINDS, TRANSPORT } from "@/lib/signupChoices";
import { landingFor } from "@/lib/roles";
import type { Role, User } from "@/lib/users";
import type { AuthState } from "./actions";

// One sign-up action for each way of joining. They share the checks every account needs (lib/register.ts), and each one then
// checks only what its own form asked, so a change to one form can never break another.

// Signs the new person in and sends them on. A customer goes where they were headed. Everyone else waits for approval.
async function finish(user: User, form: FormData, label: string): Promise<never> {
  await startSession(user.id);
  if (user.status !== "active") {
    notifyTeam(`New ${label} application from ${user.name}, waiting for approval.`, "A new application is waiting for approval.");
    redirect("/pending");
  }
  // A runner is working from this moment, so the team hears that someone has joined, with no names on the phone alert.
  if (user.role === "runner") notifyTeam(`${user.name} joined as a runner.`, "A new runner joined.");
  const wanted = safeNext(form.get("next"));
  redirect(wanted === "/" ? landingFor(user.role) : wanted);
}

const keep = (form: FormData, ...keys: string[]) => Object.fromEntries(keys.map((k) => [k, String(form.get(k) ?? "")]));

// A customer: the least we can ask.
export async function signUpCustomerAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const values = keep(form, "name", "identifier");
  const basics = await readBasics(form);
  if (!basics.ok) return { error: basics.error, values };
  const made = await register("customer", basics.value);
  if ("error" in made) return { error: made.error, values };
  return finish(made.user, form, "customer");
}

// A business that sends parcels: who they are and what they sell, so the team knows who they are approving.
export async function signUpBusinessAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const values = keep(form, "name", "identifier", "category", "area");
  const category = clean(form, "category", 40);
  const area = clean(form, "area", 80);
  if (!(BUSINESS_KINDS as readonly string[]).includes(category)) return { error: "Choose what you sell.", values };
  if (area.length < 2) return { error: "Tell us where you are based, for example Langa or Gugulethu.", values };
  const basics = await readBasics(form);
  if (!basics.ok) return { error: basics.error, values };
  const made = await register("business", basics.value, { category, area });
  if ("error" in made) return { error: made.error, values };
  return finish(made.user, form, "business");
}

// A runner: where they live and how they get around, because a job is only useful if the runner can reach it.
export async function signUpRunnerAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const values = keep(form, "name", "identifier", "area", "transport");
  const area = clean(form, "area", 80);
  const transport = clean(form, "transport", 20);
  if (area.length < 2) return { error: "Tell us the area you live in, for example Langa.", values };
  if (!(TRANSPORT as readonly string[]).includes(transport)) return { error: "Choose how you will get around.", values };
  if (form.get("adult") !== "yes") return { error: "Runners must be 18 or older and have a South African ID.", values };
  const basics = await readBasics(form);
  if (!basics.ok) return { error: basics.error, values };
  const made = await register("runner", basics.value, { area, transport });
  if ("error" in made) return { error: made.error, values };
  return finish(made.user, form, "runner");
}

// A shop, salon or hall that hosts parcels: the person, then the place.
export async function signUpPointAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const values = keep(form, "name", "identifier", "pointName", "pointKind", "pointHours", "pointAddress");
  const pointName = clean(form, "pointName", 60);
  const pointKind = clean(form, "pointKind", 40);
  const pointAddress = clean(form, "pointAddress", 160);
  const pointHours = clean(form, "pointHours", 80);
  const lat = Number(form.get("pointLat"));
  const lng = Number(form.get("pointLng"));
  const located =
    form.get("pointLat") !== "" && form.get("pointLng") !== "" && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

  // The person's own details come first, so a mistake there is shown on the first step.
  const basics = await readBasics(form);
  if (!basics.ok) return { error: basics.error, values, step: 1 };
  if (pointName.length < 2) return { error: "Tell us the name of your shop or place.", values, step: 2 };
  if (!(POINT_KINDS as readonly string[]).includes(pointKind)) return { error: "Choose what kind of place it is.", values, step: 2 };
  if (!located) return { error: "Search for your place, or tap the map, so runners can find it.", values, step: 2 };
  if (pointHours.length < 3) return { error: "Tell us when you are open, for example 07:00 to 20:00.", values, step: 2 };

  const made = await register("point", basics.value, {}, pointName);
  if ("error" in made) return { error: made.error, values, step: 1 };
  await createPoint({
    name: pointName,
    kind: pointKind,
    address: pointAddress || pointName,
    lat,
    lng,
    hours: pointHours,
    phone: basics.value.identifier.includes("@") ? null : basics.value.identifier,
    ownerId: made.user.id,
  });
  return finish(made.user, form, "Izza point");
}

export type SignUpRole = Extract<Role, "customer" | "business" | "runner" | "point">;
