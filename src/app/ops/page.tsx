import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { approveUserAction } from "@/app/auth/actions";
import AddPointForm from "@/components/AddPointForm";
import AssignRunner from "@/components/AssignRunner";
import AutoRefresh from "@/components/AutoRefresh";
import PayoutButton from "@/components/PayoutButton";
import ResetLinkForm from "@/components/ResetLinkForm";
import ResetRequestRow from "@/components/ResetRequestRow";
import { listResetRequests } from "@/lib/reset";
import PortalShell from "@/components/PortalShell";
import RequireRole from "@/components/RequireRole";
import { FEE_DOOR_EXTRA, FEE_POINT, LAST_STAGE, awaitingAddress, doorReady, needsCollection, statusOf, type Parcel } from "@/lib/parcels";
import { listPendingPoints } from "@/lib/pointStore";
import { RULES, ageText } from "@/lib/rules";
import { listParcels, recentEvents, runnerEarnings } from "@/lib/store";
import { listActiveRunners, listPendingUsers } from "@/lib/users";
import { whatsappLink } from "@/lib/whatsapp";

export const metadata = { title: "Team dashboard · Izza" };

export default function OpsPage() {
  return (
    <PortalShell title="Team dashboard" subtitle="What needs attention, who is carrying what">
      <Suspense fallback={<p className="muted">Loading…</p>}>
        <RequireRole roles={[]} next="/ops">
          {() => <Board />}
        </RequireRole>
      </Suspense>
    </PortalShell>
  );
}

type Alert = { code: string; level: "high" | "info"; rule: string; detail: string; age: number; action?: "assign" | "remind"; parcel: Parcel };

const DAY = 24 * 60 * 60 * 1000;

async function Board() {
  await connection();
  const now = Date.now();
  const [all, runners, pending, pendingPoints, problems, trips, feed, resetRequests] = await Promise.all([
    listParcels(),
    listActiveRunners(),
    listPendingUsers(),
    listPendingPoints(),
    recentEvents(50, ["problem", "returned"], now - RULES.recentProblemMs),
    recentEvents(500, ["picked_from_point", "delivered"], now - 7 * DAY),
    recentEvents(12),
    listResetRequests(),
  ]);

  const live = all.filter((p) => p.stage < LAST_STAGE);
  const waitingForRunner = live.filter((p) => !p.runnerId && (needsCollection(p) || doorReady(p)));
  const atPoints = live.filter((p) => p.stage === 2);
  const out = live.filter((p) => p.stage === 3);
  const deliveredToday = all.filter((p) => p.stage === LAST_STAGE && now - (p.updatedAt ?? 0) < DAY).length;
  const returned = new Set(problems.filter((e) => e.kind === "returned").map((e) => e.code)).size;

  // Average door trip: from "collected from the hub" to "delivered".
  const started = new Map<string, number>();
  const minutes: number[] = [];
  for (const e of [...trips].reverse()) {
    if (e.kind === "picked_from_point") started.set(e.code, e.at);
    else if (started.has(e.code)) minutes.push((e.at - started.get(e.code)!) / 60000);
  }
  const avgTrip = minutes.length ? `${Math.round(minutes.reduce((a, b) => a + b, 0) / minutes.length)} min` : "None yet";

  // The exception queue: what a logistics manager looks at first.
  const alerts: Alert[] = [];
  for (const p of live) {
    const age = now - (p.updatedAt ?? now);
    const to = p.recipientPhone;
    if (waitingForRunner.includes(p) && age > RULES.jobWaitingMs) {
      alerts.push({ code: p.code, level: "high", rule: "Needs a runner", detail: p.stage === 0 ? `Collect from ${p.pickup}` : `Take to ${p.landmark || "the customer"}`, age, action: "assign", parcel: p });
    }
    if (p.stage === 0 && p.dropoff === "self" && age > RULES.selfDropMs) {
      alerts.push({ code: p.code, level: "high", rule: "Not brought in yet", detail: `The sender said they would bring it to ${p.point}`, age, parcel: p });
    }
    if (p.stage === 2 && p.choice !== "door" && age > RULES.remindAtPointMs && to) {
      alerts.push({ code: p.code, level: age > RULES.overdueAtPointMs ? "high" : "info", rule: age > RULES.overdueAtPointMs ? "Overdue at the point" : "Remind the customer", detail: `Waiting at ${p.point}`, age, action: "remind", parcel: p });
    }
    if (p.stage === 2 && awaitingAddress(p) && age > RULES.remindAtPointMs && to) {
      alerts.push({ code: p.code, level: "info", rule: "Waiting for their address", detail: `${p.to} has not pinned where to bring it`, age, action: "remind", parcel: p });
    }
    if (p.stage === 3 && age > RULES.stalledTripMs) {
      alerts.push({ code: p.code, level: "high", rule: "Trip looks stalled", detail: `${p.runner} has been on the way a long time`, age, parcel: p });
    }
    if (p.senderKind === "customer" && p.stage === 0) {
      alerts.push({ code: p.code, level: "info", rule: "New from a customer", detail: `Sent to ${p.point}${p.dropoff === "self" ? ", they will bring it in" : ", a runner is needed"}`, age, parcel: p });
    }
  }
  const seen = new Set(alerts.filter((a) => a.rule !== "New from a customer").map((a) => a.code));
  for (const e of problems) {
    if (seen.has(e.code)) continue;
    seen.add(e.code);
    const p = all.find((x) => x.code === e.code);
    if (p) alerts.push({ code: e.code, level: "high", rule: e.kind === "returned" ? "Returned to the point" : "Runner reported a problem", detail: e.text, age: now - e.at, parcel: p });
  }
  alerts.sort((a, b) => (a.level === b.level ? b.age - a.age : a.level === "high" ? -1 : 1));

  const earnings = await Promise.all(runners.map((r) => runnerEarnings(r.id)));
  const runnerList = runners.map((r, i) => ({
    ...r,
    owed: earnings[i].owed,
    carrying: live.filter((p) => p.runnerId === r.id).length,
    done: all.filter((p) => p.stage === LAST_STAGE && p.runner === r.name).length,
  }));
  const roleLabel = { business: "Business", runner: "Runner", point: "Izza point", customer: "Customer", admin: "Team" } as const;
  const placeOf = new Map(pendingPoints.map((p) => [p.ownerId, p]));
  const forAssign = runners.map((r) => ({ id: r.id, name: r.name }));

  // Cash the team has not seen recorded yet: senders' R12 and door customers' R8 on parcels already delivered by door.
  const owed =
    all.filter((p) => !p.paidAt).length * FEE_POINT +
    all.filter((p) => p.choice === "door" && p.stage === LAST_STAGE && !p.doorPaidAt).length * FEE_DOOR_EXTRA;

  const stats = [
    { label: "Active parcels", value: String(live.length) },
    { label: "Need a runner", value: String(waitingForRunner.length), hot: waitingForRunner.length > 0 },
    { label: "Waiting at points", value: String(atPoints.length) },
    { label: "Out for delivery", value: String(out.length) },
    { label: "Delivered, last 24 h", value: String(deliveredToday) },
    { label: "Returned, last 24 h", value: String(returned), hot: returned > 0 },
    { label: "Average door trip", value: avgTrip },
    { label: "Cash not recorded", value: `R${owed}`, hot: owed > 0 },
  ];

  return (
    <>
      <AutoRefresh seconds={5} />
      <div className="kpiGrid">
        {stats.map((s) => (
          <div key={s.label} className={s.hot ? "card kpi kpiHot" : "card kpi"}>
            <span>{s.label}</span>
            <strong>{s.value}</strong>
          </div>
        ))}
      </div>

      <section className="card stack" style={{ gap: 6 }} aria-labelledby="attention">
        <h2 id="attention">Needs attention {alerts.length > 0 && <span className="chip chip-honey">{alerts.length}</span>}</h2>
        {alerts.length === 0 && <p className="muted" style={{ margin: 0 }}>All clear. Nothing is late or stuck.</p>}
        {alerts.map((a) => (
          <div key={`${a.code}-${a.rule}`} className={a.level === "high" ? "attnItem attnHigh" : "attnItem"}>
            <div className="attnMain">
              <strong>{a.rule}</strong>
              <span>
                <Link href={`/track/${a.code}`} className="mono">
                  {a.code}
                </Link>{" "}
                · {a.detail} · {ageText(a.age)}
              </span>
            </div>
            <div className="attnAct">
              {a.action === "assign" && <AssignRunner code={a.code} runners={forAssign} />}
              {a.action === "remind" && a.parcel.recipientPhone && (
                <a
                  className="btn btn-soft"
                  href={whatsappLink(
                    a.parcel.recipientPhone,
                    awaitingAddress(a.parcel)
                      ? `Hi ${a.parcel.to}, your Izza parcel ${a.code} is ready to be brought to your door. Please open this link and pin where you are: ${process.env.NEXT_PUBLIC_SITE_URL ?? "https://izza-app.vercel.app"}/track/${a.code}`
                      : `Hi ${a.parcel.to}, your Izza parcel ${a.code} is waiting at ${a.parcel.point}. Please collect it with your code.`,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WhatsApp {a.parcel.to}
                </a>
              )}
            </div>
          </div>
        ))}
      </section>

      <div className="portalGrid">
        <div className="stack">
          <section className="card stack" style={{ gap: 10 }} aria-labelledby="live">
            <h2 id="live">Live parcels</h2>
            <div style={{ overflowX: "auto" }}>
              <table className="opsTable">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>For</th>
                    <th>Status</th>
                    <th>Runner</th>
                  </tr>
                </thead>
                <tbody>
                  {live.map((p) => (
                    <tr key={p.code}>
                      <td className="mono">
                        <Link href={`/track/${p.code}`}>{p.code}</Link>
                      </td>
                      <td>
                        {p.to}
                        <div className="muted">{p.point}</div>
                      </td>
                      <td>
                        <span className={p.stage === 3 ? "chip chip-honey" : p.stage === 2 ? "chip chip-primary" : "chip"}>{statusOf(p)}</span>
                      </td>
                      <td>
                        {p.runnerId ? p.runner : waitingForRunner.includes(p) ? <AssignRunner code={p.code} runners={forAssign} /> : "-"}
                      </td>
                    </tr>
                  ))}
                  {live.length === 0 && (
                    <tr>
                      <td colSpan={4} className="muted">
                        Nothing in progress.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card stack" style={{ gap: 6 }} aria-labelledby="activity">
            <h2 id="activity">Latest activity</h2>
            {feed.map((e) => (
              <div key={e.id} className="feedItem">
                <span className="feedTime">{ageText(now - e.at)}</span>
                <span>
                  <Link href={`/track/${e.code}`} className="mono">
                    {e.code}
                  </Link>{" "}
                  {e.text}
                </span>
              </div>
            ))}
            {feed.length === 0 && <p className="muted" style={{ margin: 0 }}>Nothing yet.</p>}
          </section>
        </div>

        <div className="stack">
          <section className="card stack" style={{ gap: 10 }} aria-labelledby="approvals">
            <h2 id="approvals">Waiting for approval</h2>
            {pending.length === 0 && <p className="muted" style={{ margin: 0 }}>No one is waiting.</p>}
            {pending.map((u) => (
              <div key={u.id} className="approveRow">
                <div>
                  <strong>{u.name}</strong>
                  <div className="muted">
                    {roleLabel[u.role]} · {u.identifier}
                  </div>
                  {u.role === "point" && placeOf.get(u.id) && (
                    <div className="muted">
                      {placeOf.get(u.id)!.name}, {placeOf.get(u.id)!.kind}. {placeOf.get(u.id)!.address}. Open {placeOf.get(u.id)!.hours}.
                    </div>
                  )}
                </div>
                <form action={approveUserAction} style={{ display: "flex", gap: 8 }}>
                  <input type="hidden" name="id" value={u.id} />
                  <button className="btn btn-primary" name="decision" value="approve" type="submit" style={{ minHeight: 44 }}>
                    Approve
                  </button>
                  <button className="btn btn-soft" name="decision" value="reject" type="submit" style={{ minHeight: 44 }}>
                    Reject
                  </button>
                </form>
              </div>
            ))}
          </section>

          <section className="card stack" style={{ gap: 6 }} aria-labelledby="roster">
            <h2 id="roster">Runners</h2>
            {runnerList.length === 0 && <p className="muted" style={{ margin: 0 }}>No approved runners yet.</p>}
            {runnerList.map((r) => (
              <div key={r.id} className="rosterRow">
                <strong>{r.name}</strong>
                <span className="muted">
                  {r.carrying} carrying · {r.done} delivered · owed R{r.owed}
                </span>
                <PayoutButton runnerId={r.id} name={r.name} owed={r.owed} />
              </div>
            ))}
          </section>

          <section className="card stack" style={{ gap: 10 }} aria-labelledby="reset">
            <h2 id="reset">Forgot a password? {resetRequests.length > 0 && <span className="chip chip-honey">{resetRequests.length}</span>}</h2>
            {resetRequests.map((q) => (
              <ResetRequestRow key={q.userId} name={q.name} identifier={q.identifier} role={roleLabel[q.role as keyof typeof roleLabel] ?? q.role} ago={ageText(now - q.at)} />
            ))}
            {resetRequests.length === 0 && <p className="muted" style={{ margin: 0 }}>Nobody has asked yet.</p>}
            <p className="muted" style={{ margin: 0 }}>Or make a link yourself for someone who messaged you. Check it really is them first.</p>
            <ResetLinkForm />
          </section>

          <section className="card stack" style={{ gap: 10 }} aria-labelledby="add-point">
            <h2 id="add-point">Add an Izza point</h2>
            <p className="muted" style={{ margin: 0 }}>For places the team sets up itself, like the hub. They appear on the map straight away.</p>
            <AddPointForm />
          </section>
        </div>
      </div>
    </>
  );
}
