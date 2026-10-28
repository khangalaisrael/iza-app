import { connection } from "next/server";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import AutoRefresh from "@/components/AutoRefresh";
import ChooseDelivery from "@/components/ChooseDelivery";
import EventFeed from "@/components/EventFeed";
import MapView from "@/components/MapView";
import Shell from "@/components/Shell";
import { currentUser } from "@/lib/auth";
import { etaMinutes } from "@/lib/geo";
import { destinationOf, etaOf, runnerPositionOf, stepsOf, type Parcel } from "@/lib/parcels";
import { getPointById, type IzaPoint } from "@/lib/pointStore";
import { getParcel, listEvents } from "@/lib/store";
import type { User } from "@/lib/users";

export default function ParcelPage({ params }: PageProps<"/track/[code]">) {
  return (
    <Shell title="Track" subtitle="Where is my parcel?">
      <Suspense fallback={<p className="muted">Finding your parcel…</p>}>
        <ParcelDetails params={params} />
      </Suspense>
    </Shell>
  );
}

// Anyone with a code can see where a parcel is. Only the people involved see who it is for and where it is going.
function canSeePrivate(user: User | null, p: Parcel, point?: IzaPoint): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (user.id === p.ownerId || user.id === p.runnerId) return true;
  if (p.recipientPhone && user.identifier === p.recipientPhone) return true;
  return user.role === "point" && !!point && point.ownerId === user.id;
}

function redact(p: Parcel): Parcel {
  return {
    ...p,
    to: "neighbour",
    pickup: "the sender",
    landmark: "",
    recipientPhone: undefined,
    lat: undefined,
    lng: undefined,
    plusCode: undefined,
    runnerLat: undefined,
    runnerLng: undefined,
    pickupLat: undefined,
    pickupLng: undefined,
    pickupPlusCode: undefined,
    note: undefined,
  };
}

async function ParcelDetails({ params }: { params: PageProps<"/track/[code]">["params"] }) {
  await connection();
  const { code } = await params;
  const found = await getParcel(decodeURIComponent(code));
  if (!found) notFound();

  const [point, events] = await Promise.all([found.pointId ? getPointById(found.pointId) : undefined, listEvents(found.code)]);
  const user = await currentUser();
  const full = canSeePrivate(user, found, point);
  const parcel = full ? found : redact(found);

  const here = point ? { lat: point.lat, lng: point.lng } : undefined;
  const dest = destinationOf(parcel, here);
  const runnerPos = full && parcel.stage === 3 ? runnerPositionOf(parcel) : undefined;
  const headline = runnerPos ? `About ${etaMinutes(runnerPos, dest)} min away` : etaOf(parcel);
  const showMap = parcel.stage >= 1 && parcel.stage < 4 && (full || parcel.choice !== "door");
  const canChoose = parcel.stage < 3;

  return (
    <>
      <AutoRefresh seconds={parcel.stage === 3 ? 2 : 5} />
      <section className="hero">
        <p className="greeting">Molo, {parcel.to}</p>
        <h1>{headline}</h1>
        <p style={{ margin: 0 }}>
          <span className="mono">{parcel.code}</span>
        </p>
      </section>

      {canChoose && (
        <section className="card">
          <ChooseDelivery key={`${parcel.choice}-${parcel.stage}`} code={parcel.code} pointName={parcel.point} current={parcel.choice} />
        </section>
      )}

      <a
        className="btn btn-soft"
        href={`https://wa.me/?text=${encodeURIComponent(`Follow my Iza parcel ${parcel.code}: ${process.env.NEXT_PUBLIC_SITE_URL ?? "https://iza-app-israels-projects-71356823.vercel.app"}/track/${parcel.code}`)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        Share this on WhatsApp
      </a>

      {parcel.choice === "door" && parcel.stage >= 2 && parcel.stage < 4 && parcel.deliveryPin && (
        <section className="card stack pinCard" aria-label="Your delivery code">
          <h2>Your delivery code</h2>
          <div className="bigCode mono">{parcel.deliveryPin}</div>
          <p className="muted" style={{ margin: 0 }}>
            Tell the runner this code at your door. Don&apos;t share it before they arrive.
          </p>
        </section>
      )}

      {showMap && (
        <MapView
          points={point ? [{ id: point.id, name: point.name, lat: point.lat, lng: point.lng }] : []}
          pin={parcel.choice === "door" ? dest : null}
          runner={runnerPos}
          center={runnerPos ?? dest}
          height={240}
        />
      )}

      <section className="card">
        {parcel.choice === "door" && parcel.landmark && (
          <p className="muted" style={{ margin: "0 0 12px" }}>
            Bringing it to {parcel.landmark}
          </p>
        )}
        {parcel.choice !== "door" && (
          <p className="muted" style={{ margin: "0 0 12px" }}>
            Collect at {parcel.point}
            {point ? `, open ${point.hours}` : ""}
          </p>
        )}
        {!full && (
          <p className="muted" style={{ margin: "0 0 12px" }}>
            <a href={`/signin?next=${encodeURIComponent(`/track/${parcel.code}`)}`} style={{ color: "var(--primary)", fontWeight: 700 }}>
              Sign in
            </a>{" "}
            to see more about this parcel.
          </p>
        )}
        <ol className="timeline">
          {stepsOf(parcel).map((s) => (
            <li key={s.title} className={s.state}>
              <span className="dot" aria-hidden="true" />
              <div>
                <strong>{s.title}</strong>
                <small>{s.detail}</small>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <EventFeed events={events} />
    </>
  );
}
