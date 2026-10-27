import Link from "next/link";
import { Suspense } from "react";
import { approveUserAction } from "@/app/auth/actions";
import AddPointForm from "@/components/AddPointForm";
import AutoRefresh from "@/components/AutoRefresh";
import PortalShell from "@/components/PortalShell";
import RequireRole from "@/components/RequireRole";
import { LAST_STAGE, NO_RUNNER, statusOf } from "@/lib/parcels";
import { listParcels } from "@/lib/store";
import { listPendingPoints } from "@/lib/pointStore";
import { listPendingUsers } from "@/lib/users";

export const metadata = { title: "Operations · Iza" };

export default function OpsPage() {
  return (
    <PortalShell title="Team dashboard" subtitle="Deliveries, approvals and Iza points">
      <Suspense fallback={<p className="muted">Loading…</p>}>
        <RequireRole roles={[]} next="/ops">
          {() => <Board />}
        </RequireRole>
      </Suspense>
    </PortalShell>
  );
}

async function Board() {
  const all = await listParcels();
  const [pending, pendingPoints] = await Promise.all([listPendingUsers(), listPendingPoints()]);
  const placeOf = new Map(pendingPoints.map((p) => [p.ownerId, p]));
  const roleLabel = { business: "Business", runner: "Runner", point: "Iza point", customer: "Customer", admin: "Team" } as const;
  const delivered = all.filter((p) => p.stage === LAST_STAGE).length;
  const live = all.filter((p) => p.stage < LAST_STAGE);
  const waiting = all.filter((p) => p.stage === 2).length;
  const unassigned = all.filter((p) => p.runner === NO_RUNNER && p.stage < LAST_STAGE).length;
  const rate = all.length ? Math.round((delivered / all.length) * 100) : 0;

  const stats = [
    { label: "Deliveries", value: String(all.length) },
    { label: "Delivered", value: String(delivered) },
    { label: "Delivered so far", value: `${rate}%` },
    { label: "At Iza points", value: String(waiting) },
    { label: "Need a runner", value: String(unassigned), highlight: unassigned > 0 },
  ];

  return (
    <>
      <AutoRefresh seconds={5} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
        {stats.map((s) => (
          <div
            key={s.label}
            className="card"
            style={s.highlight ? { background: "var(--panel)", color: "var(--white)" } : undefined}
          >
            <div style={{ fontSize: 14, opacity: 0.8 }}>{s.label}</div>
            <div
              style={{
                fontFamily: "var(--font-heading)",
                fontWeight: 800,
                fontSize: 34,
                color: s.highlight ? "var(--honey)" : undefined,
              }}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <section className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }} aria-labelledby="approvals">
        <h2 id="approvals" style={{ fontSize: 20 }}>
          Waiting for approval
        </h2>
        {pending.length === 0 && <p className="muted" style={{ margin: 0 }}>No one is waiting.</p>}
        {pending.map((u) => (
          <div
            key={u.id}
            style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "10px 0", borderTop: "1px solid var(--line)" }}
          >
            <div>
              <strong>{u.name}</strong>
              <div className="muted" style={{ fontSize: 14 }}>
                {roleLabel[u.role]} · {u.identifier}
              </div>
              {u.role === "point" && placeOf.get(u.id) && (
                <div className="muted" style={{ fontSize: 14 }}>
                  {placeOf.get(u.id)!.name}, {placeOf.get(u.id)!.kind}. {placeOf.get(u.id)!.address}. Open {placeOf.get(u.id)!.hours}.
                </div>
              )}
              <div>
              </div>
            </div>
            <form action={approveUserAction} style={{ display: "flex", gap: 8 }}>
              <input type="hidden" name="id" value={u.id} />
              <button className="btn btn-primary" name="decision" value="approve" type="submit" style={{ minHeight: 40 }}>
                Approve
              </button>
              <button className="btn" name="decision" value="reject" type="submit" style={{ minHeight: 40, background: "var(--bg)" }}>
                Reject
              </button>
            </form>
          </div>
        ))}
      </section>

      <section className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }} aria-labelledby="add-point">
        <h2 id="add-point" style={{ fontSize: 20 }}>
          Add an Iza point
        </h2>
        <p className="muted" style={{ margin: 0 }}>For places the team sets up itself, like the hub. They appear on the map straight away.</p>
        <AddPointForm />
      </section>

      <section className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <h2 style={{ fontSize: 20 }}>Live deliveries</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 620, borderCollapse: "collapse", fontSize: 15 }}>
            <thead>
              <tr style={{ textAlign: "left", fontSize: 13, color: "var(--muted)", borderBottom: "1px solid var(--line)" }}>
                <th style={{ padding: "10px 6px" }}>Code</th>
                <th style={{ padding: "10px 6px" }}>From</th>
                <th style={{ padding: "10px 6px" }}>To</th>
                <th style={{ padding: "10px 6px" }}>Runner</th>
                <th style={{ padding: "10px 6px" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {live.map((p) => (
                <tr key={p.code} style={{ borderBottom: "1px solid var(--line)" }}>
                  <td className="mono" style={{ padding: "12px 6px", fontSize: 14 }}>
                    <Link href={`/track/${p.code}`}>{p.code}</Link>
                  </td>
                  <td style={{ padding: "12px 6px" }}>{p.pickup}</td>
                  <td style={{ padding: "12px 6px" }}>{p.landmark}</td>
                  <td style={{ padding: "12px 6px" }}>{p.runner}</td>
                  <td style={{ padding: "12px 6px" }}>
                    <span className={p.stage === 3 ? "chip chip-honey" : p.stage === 2 ? "chip chip-primary" : "chip"}>
                      {statusOf(p)}
                    </span>
                  </td>
                </tr>
              ))}
              {live.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted" style={{ padding: 16 }}>
                    Nothing in progress.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
