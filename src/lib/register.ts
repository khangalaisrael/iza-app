import { hashPassword } from "./password";
import { createUser, findUserByIdentifier, normalizeIdentifier, type Role, type User } from "./users";

// What every sign-up asks for, whatever the role. Each role then asks for a few things of its own.
export type Basics = { name: string; identifier: string; password: string };

export const clean = (form: FormData, key: string, max = 120) => String(form.get(key) ?? "").trim().slice(0, max);

// Checks the three things every account needs. Returns the cleaned values, or a plain sentence saying what to fix.
export async function readBasics(form: FormData): Promise<{ ok: true; value: Basics } | { ok: false; error: string }> {
  const name = clean(form, "name", 60);
  const identifier = normalizeIdentifier(String(form.get("identifier") ?? ""));
  const password = String(form.get("password") ?? "");
  if (name.length < 2) return { ok: false, error: "Tell us your name (2 to 60 letters)." };
  if (!identifier) return { ok: false, error: "Enter a phone number or an email address." };
  if (password.length < 8 || password.length > 200) return { ok: false, error: "Use a password of at least 8 characters." };
  if (await findUserByIdentifier(identifier)) return { ok: false, error: "That phone number or email already has an account. Try signing in." };
  return { ok: true, value: { name, identifier, password } };
}

// Makes the account. Customers start straight away. Businesses, runners and Izza points wait until the team approves them.
// The few extra things each role was asked are kept with the account, so the team can see them when they decide.
export async function register(
  role: Role,
  basics: Basics,
  details: Record<string, string> = {},
  pointName: string | null = null,
): Promise<{ user: User } | { error: string }> {
  try {
    const user = await createUser({
      name: basics.name,
      identifier: basics.identifier,
      passwordHash: await hashPassword(basics.password),
      role,
      status: role === "customer" ? "active" : "pending",
      pointName,
      details,
    });
    return { user };
  } catch {
    // Two people signing up with the same details at the same moment: the database lets only one through.
    return { error: "That phone number or email already has an account. Try signing in." };
  }
}
