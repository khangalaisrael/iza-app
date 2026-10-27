"use server";

import { redirect } from "next/navigation";
import { endSession, requireUser, safeNext, startSession } from "@/lib/auth";
import { DUMMY_HASH, hashPassword, verifyPassword } from "@/lib/password";
import {
  clearFailures,
  createUser,
  findUserByIdentifier,
  normalizeIdentifier,
  recordFailure,
  setUserStatus,
  tooManyFailures,
  type Role,
} from "@/lib/users";

export type AuthState = { error?: string };

const SIGNUP_ROLES: Role[] = ["customer", "runner", "point"];
const WRONG = "That phone number, email or password isn't right.";

export async function signUpAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const name = String(form.get("name") ?? "").trim();
  const identifier = normalizeIdentifier(String(form.get("identifier") ?? ""));
  const password = String(form.get("password") ?? "");
  const role = String(form.get("role") ?? "customer") as Role;
  const pointName = String(form.get("pointName") ?? "").trim();

  if (name.length < 2 || name.length > 60) return { error: "Tell us your name (2 to 60 letters)." };
  if (!identifier) return { error: "Enter a phone number or an email address." };
  if (password.length < 8 || password.length > 200) return { error: "Use a password of at least 8 characters." };
  if (!SIGNUP_ROLES.includes(role)) return { error: "Choose how you will use Iza." };
  if (role === "point" && (pointName.length < 2 || pointName.length > 60)) {
    return { error: "Tell us the name of your shop or point." };
  }
  if (findUserByIdentifier(identifier)) return { error: "That phone number or email already has an account. Try signing in." };

  // Customers start straight away. Runners and shops wait until the team approves them.
  const approved = role === "customer";
  const user = createUser({
    name,
    identifier,
    passwordHash: await hashPassword(password),
    role,
    status: approved ? "active" : "pending",
    pointName: role === "point" ? pointName : null,
  });
  await startSession(user.id);
  redirect(approved ? safeNext(form.get("next")) : "/pending");
}

export async function signInAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const identifier = normalizeIdentifier(String(form.get("identifier") ?? ""));
  const password = String(form.get("password") ?? "");
  if (!identifier || !password) return { error: WRONG };

  if (tooManyFailures(identifier)) {
    return { error: "Too many tries. Wait 15 minutes and try again." };
  }

  const user = findUserByIdentifier(identifier);
  // Always check a hash, so the answer takes the same time whether or not the account exists.
  const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok || user.status === "disabled") {
    recordFailure(identifier);
    return { error: WRONG };
  }

  clearFailures(identifier);
  await startSession(user.id);
  redirect(user.status === "active" ? safeNext(form.get("next")) : "/pending");
}

export async function signOutAction(): Promise<void> {
  await endSession();
  redirect("/");
}

export async function approveUserAction(form: FormData): Promise<void> {
  await requireUser(["admin"], "/ops");
  const id = String(form.get("id") ?? "");
  const decision = String(form.get("decision") ?? "");
  if (id && (decision === "approve" || decision === "reject")) {
    setUserStatus(id, decision === "approve" ? "active" : "disabled");
  }
  redirect("/ops");
}
