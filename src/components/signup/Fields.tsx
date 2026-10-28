"use client";

import Link from "next/link";
import type { ReactNode } from "react";

// The small pieces every sign-up form is made from, so each form only says what is different about it.

export function Heading({ title, lead }: { title: string; lead: string }) {
  return (
    <div className="stack" style={{ gap: 6 }}>
      <Link href="/signup" className="tapLink" style={{ color: "var(--primary)", fontWeight: 700 }}>
        ← Other ways to join
      </Link>
      <h1>{title}</h1>
      <p className="lead" style={{ margin: 0 }}>
        {lead}
      </p>
    </div>
  );
}

export function Text({
  id,
  name,
  label,
  hint,
  defaultValue,
  placeholder,
  autoComplete,
  inputMode,
}: {
  id: string;
  name: string;
  label: string;
  hint?: string;
  defaultValue?: string;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: "text" | "email" | "tel";
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {hint && <small className="muted">{hint}</small>}
      <input id={id} name={name} className="input" placeholder={placeholder} autoComplete={autoComplete} inputMode={inputMode} defaultValue={defaultValue} required />
    </div>
  );
}

export function Choose({ id, name, label, options, defaultValue }: { id: string; name: string; label: string; options: readonly string[]; defaultValue?: string }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} name={name} className="input" defaultValue={defaultValue ?? ""} required>
        <option value="" disabled>
          Choose one
        </option>
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

// The three things every account needs.
export function Basics({ nameLabel = "Your name", values }: { nameLabel?: string; values?: Record<string, string> }) {
  return (
    <>
      <Text id="name" name="name" label={nameLabel} autoComplete="name" defaultValue={values?.name} />
      <Text
        id="identifier"
        name="identifier"
        label="Phone number or email"
        hint="Your WhatsApp number is best, so we can reach you."
        autoComplete="username"
        inputMode="email"
        defaultValue={values?.identifier}
      />
      <div className="field">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" className="input" autoComplete="new-password" minLength={8} required />
        <small className="muted">At least 8 characters.</small>
      </div>
    </>
  );
}

// The foot of every form: what went wrong, the button, the privacy note, and a way to sign in instead.
export function Foot({ error, pending, cta, next, note }: { error?: string; pending: boolean; cta: string; next: string; note?: ReactNode }) {
  return (
    <>
      {error && (
        <p role="alert" className="problem">
          {error}
        </p>
      )}
      <button className="btn btn-block" type="submit" disabled={pending}>
        {pending ? "One moment…" : cta}
      </button>
      {note && (
        <p className="muted center" style={{ margin: 0 }}>
          {note}
        </p>
      )}
      <p className="muted center" style={{ margin: 0 }}>
        By joining you agree to how we use your details in our{" "}
        <Link href="/privacy" className="tapLink" style={{ color: "var(--primary)", fontWeight: 700 }}>
          privacy notice
        </Link>
        .
      </p>
      <p className="muted center">
        Already have an account?{" "}
        <Link href={`/signin?next=${encodeURIComponent(next)}`} className="tapLink" style={{ color: "var(--primary)", fontWeight: 700 }}>
          Sign in
        </Link>
      </p>
    </>
  );
}
