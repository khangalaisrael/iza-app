"use client";

import { useActionState } from "react";
import { testTeamAlertAction, type AuthState } from "@/app/auth/actions";

// How the team gets alerts on their phones: install the free ntfy app and subscribe to this channel, once.
export default function TeamAlertsCard({ topic }: { topic: string }) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(testTeamAlertAction, {});

  return (
    <div className="stack" style={{ gap: 10 }}>
      <ol style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 6 }}>
        <li>Install the free <strong>ntfy</strong> app on your phone (Play Store or App Store).</li>
        <li>
          Open it, tap <strong>+</strong>, and type this channel name:
          <input readOnly className="input mono" aria-label="Alert channel name" value={topic} onFocus={(e) => e.currentTarget.select()} style={{ marginTop: 6 }} />
        </li>
      </ol>
      <a className="btn btn-soft" href={`https://ntfy.sh/${topic}`} target="_blank" rel="noopener noreferrer">
        Or open the channel in your browser
      </a>
      <form action={formAction}>
        <button className="btn btn-soft" type="submit" disabled={pending}>
          {pending ? "Sending…" : "Send me a test alert"}
        </button>
      </form>
      {state.link === "sent" && (
        <p role="status" className="saved">
          Sent. It should reach your phone in a few seconds.
        </p>
      )}
      {state.error && (
        <p role="alert" className="problem">
          {state.error}
        </p>
      )}
    </div>
  );
}
