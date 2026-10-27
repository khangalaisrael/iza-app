import { Suspense } from "react";
import AdvanceButton from "@/components/AdvanceButton";
import AutoRefresh from "@/components/AutoRefresh";
import LocationShare from "@/components/LocationShare";
import RequireRole from "@/components/RequireRole";
import Shell from "@/components/Shell";
import { directionsUrl } from "@/lib/geo";
import { LAST_STAGE, destinationOf, statusOf, type Parcel } from "@/lib/parcels";
import { DEFAULT_CENTER, pointByName } from "@/lib/points";
import { listParcels } from "@/lib/store";
import type { User } from "@/lib/users";

export const metadata = { title: "Runner · Iza" };

const ACTION: Record<number, string> = {
  0: "Take this job",
  1: "Dropped at the Iza point",
  2: "Pick up and start delivery",
  3: "Mark delivered",
};

// Open jobs (not yet claimed, or waiting at a point) are for any runner. Jobs already
// being carried belong to the runner who took them.
function visibleTo(p: Parcel, user: User) {
  if (p.stage === LAST_STAGE) return false;
  if (p.stage === 0 || p.stage === 2) return true;
  return user.role === "admin" || p.runnerId === user.id;
}

export default function RunnerPage() {
  return (
    <Shell>
      <Suspense fallback={<p className="muted">Loading jobs…</p>}>
        <RequireRole roles={["runner"]} next="/runner">
          {(user) => <Jobs user={user} />}
        </RequireRole>
      </Suspense>
    </Shell>
  );
}

async function Jobs({ user }: { user: User }) {
  const all = await listParcels();
  const jobs = all.filter((p) => visibleTo(p, user));
  const onTheWay = all
    .filter((p) => p.stage === 3 && (p.runnerId === user.id || user.role === "admin"))
    .map((p) => ({
      code: p.code,
      from: pointByName(p.point) ?? DEFAULT_CENTER,
      to: destinationOf(p),
    }));
  const done = all.filter((p) => p.stage === LAST_STAGE && p.runnerId === user.id).length;

  return (
    <>
      <h1 style={{ fontSize: 26 }}>Today&apos;s jobs</h1>
      <p className="muted" style={{ margin: 0 }}>
        Signed in as {user.name}.
      </p>
      <AutoRefresh />
      <div className="grid2">
        <div className="card">
          <div className="muted" style={{ fontSize: 12 }}>
            Jobs for you
          </div>
          <div style={{ fontWeight: 800, fontSize: 28 }}>{jobs.length}</div>
        </div>
        <div className="card">
          <div className="muted" style={{ fontSize: 12 }}>
            Delivered
          </div>
          <div style={{ fontWeight: 800, fontSize: 28 }}>{done}</div>
        </div>
      </div>

      <LocationShare jobs={onTheWay} demo={user.role === "admin"} />

      {jobs.length === 0 && <p className="muted">No jobs right now. Check back soon.</p>}

      {jobs.map((p) => (
        <section key={p.code} className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="mono" style={{ fontSize: 14 }}>
              {p.code}
            </span>
            <span className="chip chip-honey">{statusOf(p)}</span>
          </div>
          <div className="jobLines">
            <div className="jobLine">
              <span className="jobLabel">Collect from</span>
              <strong>{p.pickup}</strong>
              {p.pickupLat !== undefined && p.pickupLng !== undefined && (
                <a className="linkBtn" href={directionsUrl({ lat: p.pickupLat, lng: p.pickupLng })} target="_blank" rel="noopener noreferrer">
                  Open the pickup spot in Maps
                </a>
              )}
            </div>
            <div className="jobLine">
              <span className="jobLabel">Take to</span>
              <strong>{p.landmark}</strong>
              {p.lat !== undefined && p.lng !== undefined && (
                <a className="linkBtn" href={directionsUrl({ lat: p.lat, lng: p.lng })} target="_blank" rel="noopener noreferrer">
                  Open the delivery spot in Maps
                </a>
              )}
            </div>
          </div>
          <AdvanceButton code={p.code} label={ACTION[p.stage]} runner={user.name} />
        </section>
      ))}
    </>
  );
}
