import { Suspense } from "react";
import AdvanceButton from "@/components/AdvanceButton";
import AutoRefresh from "@/components/AutoRefresh";
import Shell from "@/components/Shell";
import { LAST_STAGE, NO_RUNNER, statusOf, type Parcel } from "@/lib/parcels";
import { listParcels } from "@/lib/store";

export const metadata = { title: "Runner · Iza" };

// The prototype has no sign-in yet, so every runner is Sipho.
const RUNNER = "Sipho";

const ACTION: Record<number, string> = {
  0: "Take this job",
  1: "Dropped at the Iza point",
  2: "Pick up and start delivery",
  3: "Mark delivered",
};

function mine(p: Parcel) {
  if (p.stage === LAST_STAGE) return false;
  if (p.stage === 0 || p.stage === 2) return true; // open to any runner
  return p.runner === RUNNER;
}

export default function RunnerPage() {
  return (
    <Shell>
      <h1 style={{ fontSize: 26 }}>Today&apos;s jobs</h1>
      <p className="muted" style={{ margin: 0 }}>
        Signed in as {RUNNER} (example runner).
      </p>
      <Suspense fallback={<p className="muted">Loading jobs…</p>}>
        <Jobs />
      </Suspense>
    </Shell>
  );
}

async function Jobs() {
  const all = await listParcels();
  const jobs = all.filter(mine);
  const done = all.filter((p) => p.stage === LAST_STAGE && p.runner === RUNNER).length;

  return (
    <>
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

      {jobs.length === 0 && <p className="muted">No jobs right now. Check back soon.</p>}

      {jobs.map((p) => (
        <section key={p.code} className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="mono" style={{ fontSize: 14 }}>
              {p.code}
            </span>
            <span className="chip chip-honey">{statusOf(p)}</span>
          </div>
          <div style={{ fontSize: 15 }}>
            <div>
              <strong>From:</strong> {p.pickup}
            </div>
            <div>
              <strong>To:</strong> {p.landmark}
            </div>
            {p.runner !== NO_RUNNER && p.stage > 0 && (
              <div className="muted" style={{ fontSize: 13 }}>
                Runner: {p.runner}
              </div>
            )}
            {p.plusCode && (
              <div className="mono muted" style={{ fontSize: 13 }}>
                Pin: {p.plusCode}
              </div>
            )}
          </div>
          <AdvanceButton code={p.code} label={ACTION[p.stage]} runner={RUNNER} />
        </section>
      ))}
    </>
  );
}
