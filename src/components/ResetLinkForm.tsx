"use client";

import { useActionState } from "react";
import { issueResetAction, type AuthState } from "@/app/auth/actions";
import { whatsappLink } from "@/lib/whatsapp";

// The team makes a one-time link for someone who forgot their password, then sends it to them.
export default function ResetLinkForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(issueResetAction, {});

  return (
    <form action={formAction} className="stack" style={{ gap: 10 }} noValidate>
      <div className="field">
        <label htmlFor="resetIdentifier">Their phone number or email</label>
        <input id="resetIdentifier" name="identifier" className="input" autoComplete="off" defaultValue={state.values?.identifier} required />
      </div>
      <button className="btn btn-soft" type="submit" disabled={pending}>
        {pending ? "One moment…" : "Make a reset link"}
      </button>
      {state.error && (
        <p role="alert" className="problem">
          {state.error}
        </p>
      )}
      {state.link && (
        <div className="stack" style={{ gap: 8 }}>
          <p className="muted" style={{ margin: 0 }}>
            Send this to them yourself. It works once and expires in 2 hours.
          </p>
          <input readOnly className="input mono" aria-label="Reset link" value={state.link} onFocus={(e) => e.currentTarget.select()} />
          {state.phone && (
            <a
              className="btn btn-soft"
              href={whatsappLink(state.phone, `Hi, here is your Iza password reset link: ${state.link}`)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Send on WhatsApp
            </a>
          )}
        </div>
      )}
    </form>
  );
}
