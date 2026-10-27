import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import AutoRefresh from "@/components/AutoRefresh";
import EventFeed from "@/components/EventFeed";
import JobPanel, { type JobLinks } from "@/components/JobPanel";
import LocationShare from "@/components/LocationShare";
import PortalShell from "@/components/PortalShell";
import RequireRole from "@/components/RequireRole";
import { directionsUrl } from "@/lib/geo";
import { getPointById } from "@/lib/pointStore";
import { getParcel, listEvents } from "@/lib/store";
import { findUserById, type User } from "@/lib/users";
import { whatsappLink } from "@/lib/whatsapp";

export const metadata = { title: "Job · Iza" };

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
  if (!parcel || (user.role !== "admin" && parcel.runnerId !== user.id)) {
    return (
      <section className="card stack">
        <h1>This isn&apos;t one of your jobs</h1>
        <p className="lead">It may have been given back, or someone else took it. Pick another from the list.</p>
        <Link className="btn" href="/runner">
          See jobs
        </Link>
      </section>
    );
  }

  const [point, events, owner] = await Promise.all([
    parcel.pointId ? getPointById(parcel.pointId) : undefined,
    listEvents(parcel.code),
    parcel.ownerId ? findUserById(parcel.ownerId) : undefined,
  ]);

  const me = user.name.split(" ")[0];
  const links: JobLinks = {
    pickupMaps: parcel.pickupLat !== undefined && parcel.pickupLng !== undefined ? directionsUrl({ lat: parcel.pickupLat, lng: parcel.pickupLng }) : undefined,
    pointMaps: point ? directionsUrl(point) : undefined,
    doorMaps: parcel.lat !== undefined && parcel.lng !== undefined ? directionsUrl({ lat: parcel.lat, lng: parcel.lng }) : undefined,
    // The business's number is shared with the runner who is collecting from them, and the customer's only once the parcel is on its way to them.
    businessWhatsapp:
      owner && isPhone(owner.identifier) && parcel.stage <= 1
        ? whatsappLink(owner.identifier, `Hi, it's ${me} from Iza. I'm coming to collect parcel ${parcel.code}.`)
        : undefined,
    customerWhatsapp:
      parcel.recipientPhone && parcel.stage === 3
        ? whatsappLink(parcel.recipientPhone, `Hi ${parcel.to}, it's ${me} from Iza with your parcel ${parcel.code}. I'm nearly there. Please have your 4-digit code ready.`)
        : undefined,
  };

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

      {parcel.stage >= 4 ? (
        <section className="card stack">
          <h2>Done. Enkosi!</h2>
          <p className="lead">This parcel has been delivered.</p>
          <Link className="btn" href="/runner">
            Find the next job
          </Link>
        </section>
      ) : (
        <JobPanel
          code={parcel.code}
          stage={parcel.stage}
          choice={parcel.choice}
          pointName={parcel.point}
          pickupText={parcel.pickup}
          doorText={parcel.landmark || "the customer's door"}
          links={links}
        />
      )}

      {onTheWay.length > 0 && <LocationShare jobs={onTheWay} demo={user.role === "admin"} />}
      <EventFeed events={events} title="What the customer can see" />
    </>
  );
}
