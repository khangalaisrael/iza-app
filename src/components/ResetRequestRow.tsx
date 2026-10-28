"use client";

import { useActionState } from "react";
import { issueResetAction, type AuthState } from "@/app/auth/actions";
import { whatsappLink } from "@/lib/whatsapp";

// One person waiting for a reset link. The team makes the link here and sends it to them.
export default function ResetRequestRow({ name, identifier, role, ago }: { name: string; identifier: string; role: string; ago: string }) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(issueResetAction, {});

  return (
    <div className="stack" style={{ gap: 8 }}>
      <div>
        <strong>{name}</strong>
        <div className="muted">
          {role} · {identifier} · {ago} ago
        </div>
      </div>
      {!state.link && (
        <form action={formAction} style={{ display: "flex", gap: 8 }}>
          <input type="hidden" name="identifier" value={identifier} />
          <button className="btn btn-primary" type="submit" disabled={pending} style={{ minHeight: 44 }}>
            {pending ? "One moment…" : "Make reset link"}
          </button>
        </form>
      )}
      {state.error && (
        <p role="alert" className="problem">
          {state.error}
        </p>
      )}
      {state.link && (
        <div className="stack" style={{ gap: 8 }}>
          <input readOnly className="input mono" aria-label={`Reset link for ${name}`} value={state.link} onFocus={(e) => e.currentTarget.select()} />
          {state.phone && (
            <a
              className="btn btn-soft"
              href={whatsappLink(state.phone, `Hi ${name}, here is your Izza password reset link: ${state.link}`)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Send on WhatsApp
            </a>
          )}
        </div>
      )}
    </div>
  );
}
