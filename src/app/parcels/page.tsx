import Link from "next/link";
import { Suspense } from "react";
import AutoRefresh from "@/components/AutoRefresh";
import PortalShell from "@/components/PortalShell";
import RequireRole from "@/components/RequireRole";
import { statusOf } from "@/lib/parcels";
import { listParcelsFor } from "@/lib/store";
import type { User } from "@/lib/users";

export const metadata = { title: "My parcels · Izza" };

export default function ParcelsPage() {
  return (
    <PortalShell title="My parcels" subtitle="What you have sent">
      <Suspense fallback={<p className="muted">Loading your parcels…</p>}>
        <RequireRole roles={["business"]} next="/parcels">
          {(user) => <List user={user} />}
        </RequireRole>
      </Suspense>
    </PortalShell>
  );
}

async function List({ user }: { user: User }) {
  const parcels = await listParcelsFor(user.id);
  const live = parcels.filter((p) => p.stage < 4);
  const done = parcels.filter((p) => p.stage === 4);

  return (
    <>
      <AutoRefresh seconds={10} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1>Hi, {user.name}</h1>
          <p className="lead">{live.length === 0 ? "Nothing on the way right now." : `${live.length} on the way.`}</p>
        </div>
        <Link href="/send" className="btn">
          Send a parcel
        </Link>
      </div>

      <section className="stack" aria-label="On the way">
        <h2>On the way</h2>
        {live.length === 0 && <p className="muted">When you send a parcel, you can follow it here.</p>}
        {live.map((p) => (
          <Link key={p.code} href={`/track/${p.code}`} className="card nearby">
            <div className="nearbyBody">
              <strong>For {p.to}</strong>
              <div className="muted">To {p.point}</div>
              <div className="mono muted">{p.code}</div>
            </div>
            <span className="chip chip-honey">{statusOf(p)}</span>
          </Link>
        ))}
      </section>

      {done.length > 0 && (
        <section className="stack" aria-label="Delivered">
          <h2>Delivered</h2>
          {done.map((p) => (
            <Link key={p.code} href={`/track/${p.code}`} className="card nearby">
              <div className="nearbyBody">
                <strong>For {p.to}</strong>
                <div className="mono muted">{p.code}</div>
              </div>
              <span className="chip">{statusOf(p)}</span>
            </Link>
          ))}
        </section>
      )}
    </>
  );
}
