import Link from "next/link";
import { Suspense } from "react";
import NearbyPoints from "@/components/NearbyPoints";
import Shell from "@/components/Shell";
import { currentUser } from "@/lib/auth";
import { directionsUrl } from "@/lib/geo";
import { pointByName, points } from "@/lib/points";
import { listParcelsFor } from "@/lib/store";

export const metadata = { title: "Collect nearby · Iza" };

export default function CollectPage() {
  return (
    <Shell>
      <h1>Collect nearby</h1>
      <p className="lead">An Iza point is a shop near you where your parcel waits for you.</p>
      <Suspense fallback={null}>
        <ReadyForYou />
      </Suspense>
      <NearbyPoints points={points} />
    </Shell>
  );
}

// Parcels already waiting at a shop for this person.
async function ReadyForYou() {
  const user = await currentUser();
  if (!user) return null;

  const ready = (await listParcelsFor(user.id)).filter((p) => p.stage === 2);
  if (ready.length === 0) return null;

  return (
    <section className="ready" aria-label="Ready for you">
      <h2>Ready for you</h2>
      {ready.map((p) => {
        const spot = pointByName(p.point);
        return (
          <div key={p.code} className="card readyCard">
            <div>
              <strong>{p.point}</strong>
              <div className="mono muted">{p.code}</div>
              <div className="muted">Show this code at the counter.</div>
            </div>
            <div className="readyActions">
              {spot && (
                <a className="btn btn-primary" href={directionsUrl(spot)} target="_blank" rel="noopener noreferrer">
                  Directions
                </a>
              )}
              <Link className="btn btn-soft" href={`/track/${p.code}`}>
                Details
              </Link>
            </div>
          </div>
        );
      })}
    </section>
  );
}
