import { connection } from "next/server";
import { Suspense } from "react";
import AutoRefresh from "@/components/AutoRefresh";
import ChimeOnChange from "@/components/ChimeOnChange";
import CollectForm from "@/components/CollectForm";
import MarkPaidButton from "@/components/MarkPaidButton";
import ReceiveButton from "@/components/ReceiveButton";
import PortalShell from "@/components/PortalShell";
import RequireRole from "@/components/RequireRole";
import { openNow } from "@/lib/geo";
import { FEE_POINT, statusOf, type Parcel } from "@/lib/parcels";
import { RULES, ageText } from "@/lib/rules";
import { whatsappLink } from "@/lib/whatsapp";
import { getPointByOwner } from "@/lib/pointStore";
import { listParcels } from "@/lib/store";
import type { User } from "@/lib/users";

export const metadata = { title: "My Izza point · Izza" };

export default function PointPage() {
  return (
    <PortalShell title="My Izza point" subtitle="Parcels in and out">
      <Suspense fallback={<p className="muted">Loading parcels…</p>}>
        <RequireRole roles={["point"]} next="/point">
          {(user) => <Board user={user} />}
        </RequireRole>
      </Suspense>
    </PortalShell>
  );
}

async function Board({ user }: { user: User }) {
  await connection();
  const now = Date.now();
  const isTeam = user.role === "admin";
  const point = isTeam ? undefined : await getPointByOwner(user.id);
  const all = await listParcels();

  // A point sees only the parcels sent to its own shop. The team sees every point.
  const here = all.filter((p) => p.stage <= 2 && !p.cancelledAt && (isTeam || (point && p.pointId === point.id)));
  const bringingIn = here.filter((p) => p.stage === 0 && p.dropoff === "self");
  const arriving = here.filter((p) => p.stage < 2 && !(p.stage === 0 && p.dropoff === "self"));
  const ready = here.filter((p) => p.stage === 2 && p.choice !== "door");
  const forDoor = here.filter((p) => p.stage === 2 && p.choice === "door");
  const open = point ? openNow(point.hours) : null;

  return (
    <>
      <AutoRefresh />
      <ChimeOnChange value={arriving.length + bringingIn.length + ready.length + forDoor.length} />
      <div>
        <h1>{point?.name ?? "All Izza points"}</h1>
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
          <h2>Hand over a parcel</h2>
          <CollectForm />
          <ParcelList title="Ready to collect" parcels={ready} empty="Nothing waiting for collection." now={now} remind />
        </div>
        <div className="stack">
          <ParcelList title="Being brought in" parcels={bringingIn} empty="Nobody is bringing a parcel in." now={now} receive hint="Take the R12 cash, then tap Received." />
          <ParcelList title="Coming to you" parcels={arriving} empty="Nothing on its way here." now={now} />
          <ParcelList title="Going out to a door" parcels={forDoor} empty="No door deliveries waiting for a runner." now={now} />
        </div>
      </div>
    </>
  );
}

function ParcelList({
  title,
  parcels,
  empty,
  now,
  receive = false,
  remind = false,
  hint,
}: {
  title: string;
  parcels: Parcel[];
  empty: string;
  now: number;
  receive?: boolean;
  remind?: boolean;
  hint?: string;
}) {
  return (
    <section className="stack" aria-label={title} style={{ gap: 10 }}>
      <h2>{title}</h2>
      {parcels.length === 0 && <p className="muted">{empty}</p>}
      {parcels.length > 0 && hint && <p className="muted" style={{ margin: 0 }}>{hint}</p>}
      {parcels.map((p) => {
        const waited = now - (p.updatedAt ?? now);
        const overdue = remind && waited > RULES.overdueAtPointMs;
        return (
          <div key={p.code} className="card stack" style={{ gap: 10 }}>
            <div className="nearby">
              <div className="nearbyBody">
                <strong>For {p.to}</strong>
                <div className="mono muted">{p.code}</div>
                {remind && <div className={overdue ? "problem" : "muted"}>{overdue ? `Waiting ${ageText(waited)}. Please tell the team.` : `Waiting ${ageText(waited)}`}</div>}
              </div>
              <span className="chip chip-primary">{statusOf(p)}</span>
            </div>
            {p.paidAt ? (
              <span className="chip">Sender paid R{FEE_POINT}</span>
            ) : (
              <>
                <span className="muted">Sender owes R{FEE_POINT}</span>
                <MarkPaidButton code={p.code} />
              </>
            )}
            {receive && <ReceiveButton code={p.code} />}
            {remind && p.recipientPhone && waited > RULES.remindAtPointMs && (
              <a
                className="btn btn-soft"
                href={whatsappLink(p.recipientPhone, `Hi ${p.to}, your Izza parcel ${p.code} is waiting at ${p.point}. Please collect it with your code.`)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Remind {p.to} on WhatsApp
              </a>
            )}
          </div>
        );
      })}
    </section>
  );
}
