import Link from "next/link";
import { Suspense } from "react";
import AcceptButton from "@/components/AcceptButton";
import AutoRefresh from "@/components/AutoRefresh";
import FindMeMap from "@/components/FindMeMap";
import PortalShell from "@/components/PortalShell";
import RequireRole from "@/components/RequireRole";
import { LAST_STAGE, doorReady, needsCollection, type Parcel } from "@/lib/parcels";
import { listApprovedPoints, type IzaPoint } from "@/lib/pointStore";
import { listParcels, runnerEarnings } from "@/lib/store";
import type { User } from "@/lib/users";

export const metadata = { title: "My jobs · Izza" };

export default function RunnerPage() {
  return (
    <PortalShell title="My jobs" subtitle="Accept a job, then follow the steps">
      <Suspense fallback={<p className="muted">Loading jobs…</p>}>
        <RequireRole roles={["runner"]} next="/runner">
          {(user) => <Board user={user} />}
        </RequireRole>
      </Suspense>
    </PortalShell>
  );
}

type Job = { parcel: Parcel; kind: "collect" | "deliver"; from: string; to: string };

// A job is bringing a door delivery from the Izza point to the customer, or, when a sender asked for a runner, collecting from them first.
function jobFor(p: Parcel): Job | null {
  if (needsCollection(p) || p.stage === 1) return { parcel: p, kind: "collect", from: p.pickup, to: p.point };
  if (doorReady(p) || p.stage === 3) {
    return { parcel: p, kind: "deliver", from: p.point, to: p.landmark || "The customer's door" };
  }
  return null;
}

// What the runner should do next on a job they have taken.
function nextStep(j: Job): string {
  switch (j.parcel.stage) {
    case 0:
      return `Go and collect it from ${j.from}`;
    case 1:
      return `Take it to ${j.to}`;
    case 2:
      return `Collect it from ${j.from}`;
    default:
      return `Take it to ${j.to}`;
  }
}

async function Board({ user }: { user: User }) {
  const [all, points, earned] = await Promise.all([listParcels(), listApprovedPoints(), runnerEarnings(user.id)]);
  const byId = new Map<string, IzaPoint>(points.map((p) => [p.id, p]));
  const isTeam = user.role === "admin";

  const jobs = all.map(jobFor).filter((j): j is Job => j !== null);
  // Jobs I accepted and have not finished, and jobs nobody has taken yet.
  const mine = jobs.filter((j) => j.parcel.runnerId === user.id);
  const open = jobs.filter((j) => !j.parcel.runnerId && (needsCollection(j.parcel) || j.parcel.stage === 2));
  const done = all.filter((p) => p.stage === LAST_STAGE && p.runner === user.name).length;

  const spots = [...mine, ...open]
    .flatMap((j) => {
      const pt = j.parcel.pointId ? byId.get(j.parcel.pointId) : undefined;
      const list: { id: string; name: string; lat: number; lng: number }[] = [];
      if (j.parcel.stage === 0 && j.parcel.pickupLat !== undefined && j.parcel.pickupLng !== undefined) {
        list.push({ id: `${j.parcel.code}-a`, name: j.from, lat: j.parcel.pickupLat, lng: j.parcel.pickupLng });
      }
      if (pt) list.push({ id: `${j.parcel.code}-p`, name: pt.name, lat: pt.lat, lng: pt.lng });
      return list;
    });

  return (
    <>
      <AutoRefresh />
      <h1 className="visually-hidden">My jobs</h1>
      <div className="portalGrid">
        <div className="stack">
          <div className="statRow">
            <div className="card stat">
              <span className="muted">Open jobs</span>
              <strong>{open.length}</strong>
            </div>
            <div className="card stat">
              <span className="muted">Your jobs</span>
              <strong>{mine.length}</strong>
            </div>
            <div className="card stat">
              <span className="muted">Done</span>
              <strong>{done}</strong>
            </div>
            <div className="card stat">
              <span className="muted">Earned</span>
              <strong>R{earned.total}</strong>
              <span className="muted">
                {earned.collections} collected, {earned.deliveries} delivered
              </span>
              <span className="muted">
                Paid out R{earned.paid} · still owed R{earned.owed}
              </span>
            </div>
          </div>

          <section className="stack" aria-labelledby="mine-h">
            <h2 id="mine-h">Your jobs</h2>
            {mine.length === 0 && <p className="muted">You haven&apos;t accepted a job yet. Take one from the list below.</p>}
            {mine.map((j) => (
              <article key={j.parcel.code} className="card jobCard">
                <div className="jobHead">
                  <span className={j.kind === "collect" ? "chip chip-honey" : "chip chip-primary"}>
                    {j.kind === "collect" ? "Collect from a sender" : "Deliver to a door"}
                  </span>
                  <span className="mono">{j.parcel.code}</span>
                </div>
                <div className="jobLine">
                  <span className="jobLabel">Next</span>
                  <strong>{nextStep(j)}</strong>
                </div>
                <Link className="btn" href={`/runner/${j.parcel.code}`}>
                  Open this job
                </Link>
              </article>
            ))}
          </section>

          <section className="stack" aria-labelledby="open-h">
            <h2 id="open-h">Jobs you can take</h2>
            {open.length === 0 && <p className="muted">No open jobs right now. This page updates by itself.</p>}
            {open.map((j) => (
              <article key={j.parcel.code} className="card jobCard">
                <div className="jobHead">
                  <span className={j.kind === "collect" ? "chip chip-honey" : "chip chip-primary"}>
                    {j.kind === "collect" ? "Collect from a sender" : "Deliver to a door"}
                  </span>
                  <span className="mono">{j.parcel.code}</span>
                </div>
                <div className="jobLines">
                  <div className="jobLine">
                    <span className="jobLabel">Pick it up at</span>
                    <strong>{j.from}</strong>
                  </div>
                  <div className="jobLine">
                    <span className="jobLabel">Take it to</span>
                    <strong>{j.to}</strong>
                  </div>
                  {j.parcel.size && <span className="muted">Size: {j.parcel.size}</span>}
                </div>
                <AcceptButton code={j.parcel.code} label={j.kind === "collect" ? "Accept this job" : "Accept this delivery"} />
              </article>
            ))}
          </section>
          {isTeam && <p className="muted">You are signed in as the team, so you can work any job.</p>}
        </div>

        <aside className="portalAside" aria-label="Map">
          <FindMeMap spots={spots} height={460} />
        </aside>
      </div>
    </>
  );
}
