"use client";

import { useActionState } from "react";
import { requestResetAction, type AuthState } from "@/app/auth/actions";
import { whatsappLink } from "@/lib/whatsapp";

// Someone who forgot their password asks for a link. The team sees the request and sends the link.
export default function ForgotForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(requestResetAction, {});
  const team = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;

  if (state.link) {
    return (
      <section className="card stack">
        <h1>Request sent</h1>
        <p className="lead">
          If there is an account for {state.values?.identifier}, the Izza team will send a link to choose a new password. It usually comes
          within the hour.
        </p>
        {team && (
          <a
            className="btn btn-primary"
            href={whatsappLink(team, `Hi Izza, I forgot my password. My phone number or email is ${state.values?.identifier}.`)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Message the team on WhatsApp to speed it up
          </a>
        )}
      </section>
    );
  }

  return (
    <form action={formAction} className="stack" noValidate>
      <h1>Forgot your password?</h1>
      <p className="lead">Type the phone number or email you signed up with. The Izza team will send you a link to choose a new one.</p>
      <div className="field">
        <label htmlFor="identifier">Phone number or email</label>
        <input id="identifier" name="identifier" className="input" autoComplete="username" inputMode="email" defaultValue={state.values?.identifier} required />
      </div>
      {state.error && (
        <p role="alert" className="problem">
          {state.error}
        </p>
      )}
      <button className="btn btn-block" type="submit" disabled={pending}>
        {pending ? "One moment…" : "Ask for a reset link"}
      </button>
    </form>
  );
}
