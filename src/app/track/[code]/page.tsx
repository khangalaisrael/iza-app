import { connection } from "next/server";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import AutoRefresh from "@/components/AutoRefresh";
import ChooseDelivery from "@/components/ChooseDelivery";
import MapView from "@/components/MapView";
import Shell from "@/components/Shell";
import { currentUser } from "@/lib/auth";
import { etaMinutes } from "@/lib/geo";
import { destinationOf, etaOf, runnerPositionOf, stepsOf, type Parcel } from "@/lib/parcels";
import { getPointById, type IzaPoint } from "@/lib/pointStore";
import { getParcel } from "@/lib/store";
import type { User } from "@/lib/users";

export default function ParcelPage({ params }: PageProps<"/track/[code]">) {
  return (
    <Shell>
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

  const point = found.pointId ? await getPointById(found.pointId) : undefined;
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
    </>
  );
}
