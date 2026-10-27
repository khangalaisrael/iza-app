import Link from "next/link";
import { Suspense } from "react";
import AutoRefresh from "@/components/AutoRefresh";
import { LAST_STAGE, NO_RUNNER, statusOf } from "@/lib/parcels";
import { listParcels } from "@/lib/store";

export const metadata = { title: "Operations · Iza" };

export default function OpsPage() {
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Link href="/" className="badge" aria-label="Iza home">
            iza
          </Link>
          <h1 style={{ fontSize: 28 }}>Good morning, team</h1>
        </div>
        <span className="chip chip-honey">Example data</span>
      </header>
      <Suspense fallback={<p className="muted">Loading…</p>}>
        <Board />
      </Suspense>
    </div>
  );
}

async function Board() {
  const all = await listParcels();
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
