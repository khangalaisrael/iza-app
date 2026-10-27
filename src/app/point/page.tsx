import { Suspense } from "react";
import AutoRefresh from "@/components/AutoRefresh";
import CollectForm from "@/components/CollectForm";
import Shell from "@/components/Shell";
import { statusOf } from "@/lib/parcels";
import { listParcels } from "@/lib/store";

export const metadata = { title: "Iza point · Iza" };

// The prototype has no sign-in yet, so this is always the Corner Shop.
const POINT = "Corner Shop";

export default function PointPage() {
  return (
    <Shell>
      <h1 style={{ fontSize: 26 }}>{POINT}</h1>
      <p className="muted" style={{ margin: 0 }}>
        Iza point · open until 20:00
      </p>
      <Suspense fallback={<p className="muted">Loading parcels…</p>}>
        <Parcels />
      </Suspense>
    </Shell>
  );
}

async function Parcels() {
  const here = (await listParcels()).filter((p) => p.point === POINT && p.stage <= 2);
  const waiting = here.filter((p) => p.stage === 2);
  const coming = here.filter((p) => p.stage < 2);

  return (
    <>
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
