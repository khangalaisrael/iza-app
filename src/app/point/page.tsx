import { Suspense } from "react";
import AutoRefresh from "@/components/AutoRefresh";
import CollectForm from "@/components/CollectForm";
import RequireRole from "@/components/RequireRole";
import Shell from "@/components/Shell";
import { statusOf } from "@/lib/parcels";
import { listParcels } from "@/lib/store";
import type { User } from "@/lib/users";

export const metadata = { title: "Iza point · Iza" };

export default function PointPage() {
  return (
    <Shell>
      <Suspense fallback={<p className="muted">Loading parcels…</p>}>
        <RequireRole roles={["point"]} next="/point">
          {(user) => <Parcels user={user} />}
        </RequireRole>
      </Suspense>
    </Shell>
  );
}

async function Parcels({ user }: { user: User }) {
  // The team can open any point. A point sees only parcels sent to its own shop.
  const pointName = user.pointName ?? "Corner Shop";
  const here = (await listParcels()).filter((p) => p.point === pointName && p.stage <= 2);
  const waiting = here.filter((p) => p.stage === 2);
  const coming = here.filter((p) => p.stage < 2);

  return (
    <>
      <h1 style={{ fontSize: 26 }}>{pointName}</h1>
      <p className="muted" style={{ margin: 0 }}>
        Iza point · open until 20:00
      </p>
      <AutoRefresh />
      <div className="grid2">
        <div className="card">
          <div className="muted" style={{ fontSize: 12 }}>
            To collect
          </div>
          <div style={{ fontWeight: 800, fontSize: 28 }}>{waiting.length}</div>
        </div>
        <div className="card">
          <div className="muted" style={{ fontSize: 12 }}>
            On the way here
          </div>
          <div style={{ fontWeight: 800, fontSize: 28 }}>{coming.length}</div>
        </div>
      </div>

      <CollectForm />

      <h2 className="section-title">Parcels here</h2>
      {here.length === 0 && <p className="muted">Nothing here right now.</p>}
      {here.map((p) => (
        <div
          key={p.code}
          className="card"
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          <div>
            <div style={{ fontWeight: 600 }}>For {p.to}</div>
            <div className="mono muted" style={{ fontSize: 13 }}>
              {p.code}
            </div>
          </div>
          <span className={p.stage === 2 ? "chip chip-primary" : "chip"}>{statusOf(p)}</span>
        </div>
      ))}
    </>
  );
}
