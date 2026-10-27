import { Suspense } from "react";
import AutoRefresh from "@/components/AutoRefresh";
import CollectForm from "@/components/CollectForm";
import PortalShell from "@/components/PortalShell";
import RequireRole from "@/components/RequireRole";
import { openNow } from "@/lib/geo";
import { statusOf, type Parcel } from "@/lib/parcels";
import { getPointByOwner } from "@/lib/pointStore";
import { listParcels } from "@/lib/store";
import type { User } from "@/lib/users";

export const metadata = { title: "My Iza point · Iza" };

export default function PointPage() {
  return (
    <PortalShell title="My Iza point" subtitle="Parcels in and out">
      <Suspense fallback={<p className="muted">Loading parcels…</p>}>
        <RequireRole roles={["point"]} next="/point">
          {(user) => <Board user={user} />}
        </RequireRole>
      </Suspense>
    </PortalShell>
  );
}

async function Board({ user }: { user: User }) {
  const isTeam = user.role === "admin";
  const point = isTeam ? undefined : await getPointByOwner(user.id);
  const all = await listParcels();

  // A point sees only the parcels sent to its own shop. The team sees every point.
  const here = all.filter((p) => p.stage <= 2 && (isTeam || (point && p.pointId === point.id)));
  const arriving = here.filter((p) => p.stage < 2);
  const ready = here.filter((p) => p.stage === 2 && p.choice !== "door");
  const forDoor = here.filter((p) => p.stage === 2 && p.choice === "door");
  const open = point ? openNow(point.hours) : null;

  return (
    <>
      <AutoRefresh />
      <div>
        <h1>{point?.name ?? "All Iza points"}</h1>
        {point && (
          <p className="lead">
            {point.kind}, open {point.hours}
            {open === true && " · open now"}
            {open === false && " · closed now"}
          </p>
        )}
      </div>

      <div className="statRow">
        <div className="card stat">
          <span className="muted">Coming to you</span>
          <strong>{arriving.length}</strong>
        </div>
        <div className="card stat">
          <span className="muted">Ready to collect</span>
          <strong>{ready.length}</strong>
        </div>
        <div className="card stat">
          <span className="muted">Going out to a door</span>
          <strong>{forDoor.length}</strong>
        </div>
      </div>

      <div className="portalGrid">
        <div className="stack">
          <h2>Someone at the counter?</h2>
          <CollectForm />
          <ParcelList title="Ready to collect" parcels={ready} empty="Nothing waiting for collection." />
        </div>
        <div className="stack">
          <ParcelList title="Coming to you" parcels={arriving} empty="Nothing on its way here." />
          <ParcelList title="Going out to a door" parcels={forDoor} empty="No door deliveries waiting for a runner." />
        </div>
      </div>
    </>
  );
}

function ParcelList({ title, parcels, empty }: { title: string; parcels: Parcel[]; empty: string }) {
  return (
    <section className="stack" aria-label={title} style={{ gap: 10 }}>
      <h2>{title}</h2>
      {parcels.length === 0 && <p className="muted">{empty}</p>}
      {parcels.map((p) => (
        <div key={p.code} className="card nearby">
          <div className="nearbyBody">
            <strong>For {p.to}</strong>
            <div className="mono muted">{p.code}</div>
          </div>
          <span className="chip chip-primary">{statusOf(p)}</span>
        </div>
      ))}
    </section>
  );
}
