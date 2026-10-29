"use client";

import { useActionState, useState } from "react";
import { deletePointAction, updatePointAction, type AuthState } from "@/app/auth/actions";

// One Izza point in the team's list: rename it or change its hours, or remove it after one more tap to be sure.
export default function PointRow({ id, name, kind, address, hours }: { id: string; name: string; kind: string; address: string; hours: string }) {
  const [editing, setEditing] = useState(false);
  const [sure, setSure] = useState(false);
  const [saveState, save, saving] = useActionState<AuthState, FormData>(updatePointAction, {});
  const [removeState, remove, removing] = useActionState<AuthState, FormData>(deletePointAction, {});

  return (
    <li className="stack" style={{ gap: 8 }}>
      {editing ? (
        <form action={save} className="stack" noValidate aria-label={`Edit ${name}`}>
          <input type="hidden" name="pointId" value={id} />
          <div className="field">
            <label htmlFor={`pn-${id}`}>Name of the place</label>
            <input id={`pn-${id}`} name="pointName" className="input" defaultValue={saveState.values?.pointName ?? name} />
          </div>
          <div className="field">
            <label htmlFor={`ph-${id}`}>When is it open?</label>
            <input id={`ph-${id}`} name="pointHours" className="input" defaultValue={saveState.values?.pointHours ?? hours} />
          </div>
          {saveState.error && (
            <p role="alert" className="problem">
              {saveState.error}
            </p>
          )}
          <div className="actionRow">
            <button className="btn" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
            <button className="btn btn-soft" type="button" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <div>
            <strong>{name}</strong>
            <div className="muted">
              {kind} · {address} · open {hours}
            </div>
          </div>
          {!sure ? (
            <div className="actionRow">
              <button className="btn btn-soft" type="button" onClick={() => setEditing(true)} aria-label={`Edit ${name}`}>
                Edit
              </button>
              <button className="linkBtn" type="button" onClick={() => setSure(true)} aria-label={`Delete ${name}`}>
                Delete
              </button>
            </div>
          ) : (
            <form action={remove} className="stack" style={{ gap: 8 }}>
              <input type="hidden" name="pointId" value={id} />
              <p style={{ margin: 0 }}>Delete {name}? People will no longer be able to choose it.</p>
              <div className="actionRow">
                <button className="btn" type="submit" disabled={removing}>
                  {removing ? "Deleting…" : "Yes, delete it"}
                </button>
                <button className="btn btn-soft" type="button" onClick={() => setSure(false)}>
                  Keep it
                </button>
              </div>
            </form>
          )}
          {removeState.error && (
            <p role="alert" className="problem">
              {removeState.error}
            </p>
          )}
        </>
      )}
    </li>
  );
}
