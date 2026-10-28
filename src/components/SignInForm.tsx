"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInAction, type AuthState } from "@/app/auth/actions";

export default function SignInForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(signInAction, {});

  return (
    <form action={formAction} className="stack" noValidate>
      <h1>Welcome back</h1>
      <input type="hidden" name="next" value={next} />

      <div className="field">
        <label htmlFor="identifier">Phone number or email</label>
        <input id="identifier" name="identifier" className="input" autoComplete="username" inputMode="email" defaultValue={state.values?.identifier} required />
      </div>

      <div className="field">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" className="input" autoComplete="current-password" required />
      </div>

      {state.error && (
        <p role="alert" className="problem">
          {state.error}
        </p>
      )}

      <button className="btn btn-block" type="submit" disabled={pending}>
        {pending ? "One moment…" : "Sign in"}
      </button>

      <p className="muted center" style={{ margin: 0 }}>
        <Link href="/forgot" className="tapLink" style={{ color: "var(--primary)", fontWeight: 700 }}>
          Forgot your password?
        </Link>
      </p>

      <p className="muted center">
        New to Izza?{" "}
        <Link href={`/signup?next=${encodeURIComponent(next)}`} className="tapLink" style={{ color: "var(--primary)", fontWeight: 700 }}>
          Create an account
        </Link>
      </p>
    </form>
  );
}
