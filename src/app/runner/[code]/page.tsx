import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import AutoRefresh from "@/components/AutoRefresh";
import EventFeed from "@/components/EventFeed";
import JobPanel, { type Dest, type JobLinks } from "@/components/JobPanel";
import LocationShare from "@/components/LocationShare";
import PortalShell from "@/components/PortalShell";
import WaitingJob from "@/components/WaitingJob";
import RequireRole from "@/components/RequireRole";
import { FEE_DOOR_EXTRA, waitingOn } from "@/lib/parcels";
import { DEFAULT_CENTER } from "@/lib/points";
import { getPointById } from "@/lib/pointStore";
import { getParcel, hasPhoto, listEvents } from "@/lib/store";
import { findUserById, type User } from "@/lib/users";
import { whatsappLink } from "@/lib/whatsapp";

export const metadata = { title: "Job · Izza" };

export default function JobPage({ params }: PageProps<"/runner/[code]">) {
  return (
    <PortalShell title="My job" subtitle="One step at a time">
      <Suspense fallback={<p className="muted">Loading the job…</p>}>
        <RequireRole roles={["runner"]} next="/runner">
          {(user) => <Job user={user} params={params} />}
        </RequireRole>
      </Suspense>
    </PortalShell>
  );
}

const isPhone = (s: string) => /^\d{9,15}$/.test(s);

async function Job({ user, params }: { user: User; params: PageProps<"/runner/[code]">["params"] }) {
  await connection();
  const { code } = await params;
  const parcel = await getParcel(decodeURIComponent(code));

  // A runner can only open a job they have accepted. The team can open any.
  if (parcel && user.role !== "admin" && parcel.runnerId !== user.id) {
    // The job may be finished from their side: once they hand a parcel to the Izza point it is no longer theirs to carry, but it
    // was theirs, so they are thanked rather than told it is not their job.
    const mine = (await listEvents(parcel.code)).some(
      (e) => e.actor === user.name && ["accepted", "collected", "dropped", "picked_from_point", "delivered"].includes(e.kind),
    );
    if (mine) {
      const done = parcel.stage >= 4 ? "delivered" : parcel.stage >= 2 ? "at the Izza point" : "released";
      return (
        <section className="card stack" role="status">
          <h1>Done. Enkosi!</h1>
          <p className="lead">
            {parcel.stage >= 2
              ? `Your part of parcel ${parcel.code} is finished. It is ${done === "delivered" ? "delivered" : `at ${parcel.point}`}.`
              : `You are no longer on parcel ${parcel.code}. It is back on the open list.`}
          </p>
          <Link className="btn" href="/runner">
            Find the next job
          </Link>
        </section>
      );
    }
  }
  if (!parcel || (user.role !== "admin" && parcel.runnerId !== user.id)) {
    return (
      <section className="card stack">
        <h1>This job isn&apos;t on your list</h1>
        <p className="lead">Someone else may have taken it, or it was given back. Go back to the list to take another.</p>
        <Link className="btn" href="/runner">
          See jobs
        </Link>
      </section>
    );
  }

  const [point, events, owner, photo] = await Promise.all([
    parcel.pointId ? getPointById(parcel.pointId) : undefined,
    listEvents(parcel.code),
    parcel.ownerId ? findUserById(parcel.ownerId) : undefined,
    hasPhoto(parcel.code),
  ]);

  const me = user.name.split(" ")[0];
  const links: JobLinks = {
    // The business's number is shared with the runner who is collecting from them, and the customer's only once the parcel is on its way to them.
    businessWhatsapp:
      owner && isPhone(owner.identifier) && parcel.stage <= 1
        ? whatsappLink(owner.identifier, `Hi, it's ${me} from Izza. I'm coming to collect parcel ${parcel.code}.`)
        : undefined,
    customerWhatsapp:
      parcel.recipientPhone && parcel.stage === 3
        ? whatsappLink(parcel.recipientPhone, `Hi ${parcel.to}, it's ${me} from Izza with your parcel ${parcel.code}. I'm nearly there. Please have your 4-digit code ready.`)
        : undefined,
  };

  // Where the runner is going now, shown on a map inside the page.
  const hub = point ? { lat: point.lat, lng: point.lng } : DEFAULT_CENTER;
  const pickupPin = parcel.pickupLat !== undefined && parcel.pickupLng !== undefined ? { lat: parcel.pickupLat, lng: parcel.pickupLng } : null;
  const doorPin = parcel.lat !== undefined && parcel.lng !== undefined ? { lat: parcel.lat, lng: parcel.lng } : null;
  let dest: Dest | null = null;
  let start = hub;
  if (parcel.stage === 0 && pickupPin) dest = { ...pickupPin, label: parcel.pickup };
  else if (parcel.stage === 1 || (parcel.stage === 2 && parcel.choice === "door")) {
    dest = { ...hub, label: parcel.point };
    start = pickupPin ?? hub;
  } else if (parcel.stage === 3 && doorPin) dest = { ...doorPin, label: parcel.landmark || "The customer's door" };
  const progress = events.some((e) => e.kind === "arrived_customer") ? 2 : events.some((e) => e.kind === "heading_customer") ? 1 : 0;
  const began = events.find((e) => e.kind === "picked_from_point");
  const ended = events.find((e) => e.kind === "delivered");
  const tripMinutes = began && ended ? Math.max(1, Math.round((ended.at - began.at) / 60000)) : null;

  const onTheWay =
    parcel.stage === 3
      ? [
          {
            code: parcel.code,
            from: point ? { lat: point.lat, lng: point.lng } : { lat: -33.9437, lng: 18.5305 },
            to: parcel.lat !== undefined && parcel.lng !== undefined ? { lat: parcel.lat, lng: parcel.lng } : { lat: -33.9437, lng: 18.5305 },
          },
        ]
      : [];

  return (
    <>
      <AutoRefresh seconds={8} />
      <div>
        <Link href="/runner" className="linkBtn">
          ← All jobs
        </Link>
        <h1>
          Parcel <span className="mono">{parcel.code}</span>
        </h1>
        {parcel.note && (
          <p className="lead">
            Note from the sender: {parcel.note}
          </p>
        )}
      </div>

      {parcel.cancelledAt ? (
        <section className="card stack">
          <h2>This parcel was cancelled</h2>
          <p className="lead">The sender cancelled it, so there is nothing to collect. Thank you for coming.</p>
          <Link className="btn" href="/runner">
            Find the next job
          </Link>
        </section>
      ) : parcel.stage >= 4 ? (
        <section className="card stack">
          <h2>Done. Enkosi!</h2>
          <p className="lead">
            Trip ended. This parcel has been delivered{tripMinutes ? ` in ${tripMinutes} min` : ""}.
          </p>
          <Link className="btn" href="/runner">
            Find the next job
          </Link>
        </section>
      ) : waitingOn(parcel) && parcel.runnerId === user.id ? (
        <WaitingJob
          code={parcel.code}
          title={waitingOn(parcel) === "hub" ? `Waiting for it to reach ${parcel.point}` : "Waiting for the customer's address"}
          detail={waitingOn(parcel) === "hub" ? "The sender is bringing it to the hub. You will be able to collect it there." : "The customer is choosing where to be found. When they send it, your steps start."}
        />
      ) : (
        <JobPanel
          code={parcel.code}
          stage={parcel.stage}
          choice={parcel.choice}
          pointName={parcel.point}
          pickupText={parcel.pickup}
          doorText={parcel.landmark || "the customer's door"}
          links={links}
          dest={dest}
          start={start}
          progress={progress}
          doorFee={parcel.choice === "door" ? FEE_DOOR_EXTRA : undefined}
          doorPaid={!!parcel.doorPaidAt}
          photoTaken={photo}
          transport={user.details?.transport}
        />
      )}

      {onTheWay.length > 0 && <LocationShare jobs={onTheWay} demo={user.role === "admin"} />}
      <EventFeed events={events} title="What the customer can see" />
    </>
  );
}
