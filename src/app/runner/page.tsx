import { Suspense } from "react";
import AdvanceButton from "@/components/AdvanceButton";
import AutoRefresh from "@/components/AutoRefresh";
import FindMeMap from "@/components/FindMeMap";
import LocationShare from "@/components/LocationShare";
import PortalShell from "@/components/PortalShell";
import RequireRole from "@/components/RequireRole";
import { directionsUrl } from "@/lib/geo";
import { LAST_STAGE, type Parcel } from "@/lib/parcels";
import { listApprovedPoints, type IzaPoint } from "@/lib/pointStore";
import { listParcels } from "@/lib/store";
import type { User } from "@/lib/users";

export const metadata = { title: "Runner · Iza" };

export default function RunnerPage() {
  return (
    <PortalShell title="Runner" subtitle="Jobs near you">
      <Suspense fallback={<p className="muted">Loading jobs…</p>}>
        <RequireRole roles={["runner"]} next="/runner">
          {(user) => <Board user={user} />}
        </RequireRole>
      </Suspense>
    </PortalShell>
  );
}

type Job = {
  parcel: Parcel;
  kind: "collect" | "deliver"; // collect from a business, or deliver from the point to a door
  fromLabel: string;
  from?: { lat: number; lng: number };
  toLabel: string;
  to?: { lat: number; lng: number };
  action: string;
};

function jobFor(p: Parcel, point?: IzaPoint): Job | null {
  const spot = point ? { lat: point.lat, lng: point.lng } : undefined;
  const pickupSpot = p.pickupLat !== undefined && p.pickupLng !== undefined ? { lat: p.pickupLat, lng: p.pickupLng } : undefined;
  const doorSpot = p.lat !== undefined && p.lng !== undefined ? { lat: p.lat, lng: p.lng } : undefined;

  if (p.stage === 0 || p.stage === 1) {
    return {
      parcel: p,
      kind: "collect",
      fromLabel: p.pickup,
      from: pickupSpot,
      toLabel: p.point,
      to: spot,
      action: p.stage === 0 ? "Accept this job" : "I dropped it at the Iza point",
    };
  }
  if ((p.stage === 2 && p.choice === "door") || p.stage === 3) {
    return {
      parcel: p,
      kind: "deliver",
      fromLabel: p.point,
      from: spot,
      toLabel: p.landmark || "The customer's door",
      to: doorSpot,
      action: p.stage === 2 ? "Accept this delivery" : "I delivered it",
    };
  }
  return null;
}

async function Board({ user }: { user: User }) {
  const [all, points] = await Promise.all([listParcels(), listApprovedPoints()]);
  const byId = new Map(points.map((p) => [p.id, p]));
  const isTeam = user.role === "admin";

  const jobs = all
    .map((p) => jobFor(p, p.pointId ? byId.get(p.pointId) : undefined))
    .filter((j): j is Job => j !== null);

  // Open jobs: nobody has taken them yet. My jobs: the ones I took and have not finished.
  const open = jobs.filter((j) => j.parcel.stage === 0 || j.parcel.stage === 2);
  const mine = jobs.filter((j) => (j.parcel.stage === 1 || j.parcel.stage === 3) && (isTeam || j.parcel.runnerId === user.id));
  const done = all.filter((p) => p.stage === LAST_STAGE && p.runnerId === user.id).length;

  const onTheWay = all
    .filter((p) => p.stage === 3 && (p.runnerId === user.id || isTeam))
    .map((p) => {
      const pt = p.pointId ? byId.get(p.pointId) : undefined;
      const from = pt ? { lat: pt.lat, lng: pt.lng } : { lat: -33.9437, lng: 18.5305 };
      const to = p.lat !== undefined && p.lng !== undefined ? { lat: p.lat, lng: p.lng } : from;
      return { code: p.code, from, to };
    });

  const spots = [...open, ...mine]
    .flatMap((j) => [j.from && { id: `${j.parcel.code}-a`, name: j.fromLabel, ...j.from }, j.to && { id: `${j.parcel.code}-b`, name: j.toLabel, ...j.to }])
    .filter((s): s is { id: string; name: string; lat: number; lng: number } => !!s);

  return (
    <>
      <AutoRefresh />
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
              <span className="muted">Delivered</span>
              <strong>{done}</strong>
            </div>
          </div>

          <LocationShare jobs={onTheWay} demo={isTeam} />

          <section className="stack" aria-labelledby="mine-h">
            <h2 id="mine-h">Your jobs</h2>
            {mine.length === 0 && <p className="muted">You haven&apos;t taken a job yet. Accept one below.</p>}
            {mine.map((j) => (
              <JobCard key={j.parcel.code} job={j} />
            ))}
          </section>

          <section className="stack" aria-labelledby="open-h">
            <h2 id="open-h">Jobs you can take</h2>
            {open.length === 0 && <p className="muted">No open jobs right now. This page updates by itself.</p>}
            {open.map((j) => (
              <JobCard key={j.parcel.code} job={j} />
            ))}
          </section>
        </div>

        <aside className="portalAside" aria-label="Map">
          <FindMeMap spots={spots} height={460} />
        </aside>
      </div>
    </>
  );
}

function JobCard({ job }: { job: Job }) {
  const { parcel: p } = job;
  return (
    <article className="card jobCard">
      <div className="jobHead">
        <span className={job.kind === "collect" ? "chip chip-honey" : "chip chip-primary"}>
          {job.kind === "collect" ? "Collect from a business" : "Deliver to a door"}
        </span>
        <span className="mono">{p.code}</span>
      </div>
      <div className="jobLines">
        <div className="jobLine">
          <span className="jobLabel">Pick it up at</span>
          <strong>{job.fromLabel}</strong>
          {job.from && (
            <a className="linkBtn" href={directionsUrl(job.from)} target="_blank" rel="noopener noreferrer">
              Open the pickup spot in Maps
            </a>
          )}
        </div>
        <div className="jobLine">
          <span className="jobLabel">Take it to</span>
          <strong>{job.toLabel}</strong>
          {job.to && (
            <a className="linkBtn" href={directionsUrl(job.to)} target="_blank" rel="noopener noreferrer">
              Open the drop-off spot in Maps
            </a>
          )}
        </div>
        {p.note && (
          <div className="jobLine">
            <span className="jobLabel">Note</span>
            <span>{p.note}</span>
          </div>
        )}
      </div>
      <AdvanceButton code={p.code} label={job.action} />
    </article>
  );
}
