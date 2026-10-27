import { Suspense } from "react";
import { notFound } from "next/navigation";
import AutoRefresh from "@/components/AutoRefresh";
import MapView from "@/components/MapView";
import Shell from "@/components/Shell";
import { currentUser } from "@/lib/auth";
import { etaMinutes } from "@/lib/geo";
import { NO_RUNNER, destinationOf, etaOf, runnerPositionOf, stepsOf, type Parcel } from "@/lib/parcels";
import { pointByName } from "@/lib/points";
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
function canSeePrivate(user: User | null, p: Parcel): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (user.id === p.ownerId || user.id === p.runnerId) return true;
  return user.role === "point" && user.pointName === p.point;
}

function redact(p: Parcel): Parcel {
  return {
    ...p,
    to: "neighbour",
    pickup: "the sender",
    landmark: "",
    lat: undefined,
    lng: undefined,
    plusCode: undefined,
    runnerLat: undefined,
    runnerLng: undefined,
    pickupLat: undefined,
    pickupLng: undefined,
    pickupPlusCode: undefined,
  };
}

async function ParcelDetails({ params }: { params: PageProps<"/track/[code]">["params"] }) {
  const { code } = await params;
  const found = await getParcel(decodeURIComponent(code));
  if (!found) notFound();

  const user = await currentUser();
  const full = canSeePrivate(user, found);
  const parcel = full ? found : redact(found);

  const dest = destinationOf(parcel);
  const runnerPos = full && parcel.stage === 3 ? runnerPositionOf(parcel) : undefined;
  const headline = runnerPos ? `About ${etaMinutes(runnerPos, dest)} min away` : etaOf(parcel);
  const point = pointByName(parcel.point);
  const showMap = full && parcel.stage >= 2 && parcel.stage < 4;

  return (
    <>
      <AutoRefresh seconds={parcel.stage === 3 ? 2 : 5} />
      <section className="hero">
        <p className="greeting">Molo, {parcel.to}</p>
        <h1>{headline}</h1>
        <p style={{ margin: 0 }}>
          <span className="mono">{parcel.code}</span>
          {parcel.runner !== NO_RUNNER && <> · {parcel.runner} has it</>}
        </p>
      </section>

      {showMap && (
        <MapView
          points={point ? [point] : []}
          pin={dest}
          runner={runnerPos}
          center={runnerPos ?? dest}
          height={240}
        />
      )}

      <section className="card">
        {full ? (
          <p className="muted" style={{ margin: "0 0 12px", fontSize: 14 }}>
            Delivering to {parcel.landmark}
          </p>
        ) : (
          <p className="muted" style={{ margin: "0 0 12px", fontSize: 14 }}>
            <a href={`/signin?next=${encodeURIComponent(`/track/${parcel.code}`)}`} style={{ color: "var(--primary)", fontWeight: 700 }}>
              Sign in
            </a>{" "}
            to see the delivery address and the map.
          </p>
        )}
        {parcel.plusCode && (
          <p className="mono muted" style={{ margin: "0 0 12px", fontSize: 13 }}>
            Pin: {parcel.plusCode}
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
