"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { signInAction, signUpAction, type AuthState } from "@/app/auth/actions";

const roles = [
  { id: "customer", label: "Send and collect", note: "Start right away" },
  { id: "runner", label: "Deliver as a runner", note: "We approve you first" },
  { id: "point", label: "Host an Iza point", note: "We approve you first" },
];

export default function AuthForm({ mode, next }: { mode: "signin" | "signup"; next: string }) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    mode === "signin" ? signInAction : signUpAction,
    {},
  );
  const [role, setRole] = useState("customer");
  const signup = mode === "signup";

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16 }} noValidate>
      <h1 style={{ fontSize: 26 }}>{signup ? "Join Iza" : "Welcome back"}</h1>
      <input type="hidden" name="next" value={next} />

      {signup && (
        <>
          <div className="field">
            <label htmlFor="name">Your name</label>
            <input id="name" name="name" className="input" autoComplete="name" required />
          </div>

          <fieldset className="field choices" style={{ border: 0, padding: 0, gridTemplateColumns: "1fr" }}>
            <legend>How will you use Iza?</legend>
            {roles.map((r) => (
              <label key={r.id} className="choice">
                <input type="radio" name="role" value={r.id} checked={role === r.id} onChange={() => setRole(r.id)} />
                <span style={{ alignItems: "flex-start", padding: "10px 14px", textAlign: "left" }}>
                  {r.label}
                  <small>{r.note}</small>
                </span>
              </label>
            ))}
          </fieldset>

          {role === "point" && (
            <div className="field">
              <label htmlFor="pointName">Name of your shop or point</label>
              <input id="pointName" name="pointName" className="input" placeholder="e.g. Corner Shop" required />
            </div>
          )}
        </>
      )}

      <div className="field">
        <label htmlFor="identifier">Phone number or email</label>
        <input
          id="identifier"
          name="identifier"
          className="input"
          autoComplete="username"
          inputMode="email"
          required
        />
      </div>

      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          autoComplete={signup ? "new-password" : "current-password"}
          minLength={signup ? 8 : undefined}
          required
        />
        {signup && <small className="muted">At least 8 characters.</small>}
      </div>

      {state.error && (
        <p role="alert" style={{ margin: 0, color: "var(--danger)", fontWeight: 600 }}>
          {state.error}
        </p>
      )}

      <button className="btn btn-block" type="submit" disabled={pending}>
        {pending ? "One moment…" : signup ? "Create my account" : "Sign in"}
      </button>

      <p className="muted" style={{ margin: 0, textAlign: "center" }}>
        {signup ? "Already have an account? " : "New to Iza? "}
        <Link
          href={`${signup ? "/signin" : "/signup"}?next=${encodeURIComponent(next)}`}
          style={{ color: "var(--primary)", fontWeight: 700 }}
        >
          {signup ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </form>
  );
}
