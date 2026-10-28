"use client";

import { useActionState } from "react";
import { resetPasswordAction, type AuthState } from "@/app/auth/actions";

export default function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(resetPasswordAction, {});

  return (
    <form action={formAction} className="stack" noValidate>
      <h1>Choose a new password</h1>
      <input type="hidden" name="token" value={token} />
      <div className="field">
        <label htmlFor="password">New password</label>
        <input id="password" name="password" type="password" className="input" autoComplete="new-password" minLength={8} required />
        <small className="muted">At least 8 characters.</small>
      </div>
      <div className="field">
        <label htmlFor="again">Type it again</label>
        <input id="again" name="again" type="password" className="input" autoComplete="new-password" required />
      </div>
      {state.error && (
        <p role="alert" className="problem">
          {state.error}
        </p>
      )}
      <button className="btn btn-block" type="submit" disabled={pending}>
        {pending ? "One moment…" : "Save my new password"}
      </button>
    </form>
  );
}
