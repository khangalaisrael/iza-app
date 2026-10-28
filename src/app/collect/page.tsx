import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import PointsExplorer from "@/components/PointsExplorer";
import Shell from "@/components/Shell";
import { currentUser } from "@/lib/auth";
import { directionsUrl } from "@/lib/geo";
import { getPointById, listApprovedPoints } from "@/lib/pointStore";
import { listParcelsToPhone } from "@/lib/store";

export const metadata = { title: "Collect nearby · Izza" };

export default function CollectPage() {
  return (
    <Shell title="Collect" subtitle="Find a shop near you">
      <h1>Collect nearby</h1>
      <p className="lead">An Izza point is a shop near you where your parcel waits for you.</p>
      <Suspense fallback={null}>
        <ReadyForYou />
      </Suspense>
      <Suspense fallback={<p className="muted">Loading points…</p>}>
        <Explorer />
      </Suspense>
    </Shell>
  );
}

async function Explorer() {
  await connection(); // read the approved points when someone visits, not at build
  const points = (await listApprovedPoints()).map(({ id, name, kind, address, hours, lat, lng }) => ({ id, name, kind, address, hours, lat, lng }));
  return <PointsExplorer points={points} showModeSwitch={false} />;
}

// Parcels addressed to this person's number that are waiting at a shop.
async function ReadyForYou() {
  const user = await currentUser();
  if (!user) return null;

  const ready = (await listParcelsToPhone(user.identifier)).filter((p) => p.stage === 2 && p.choice !== "door");
  if (ready.length === 0) return null;

  return (
    <section className="ready" aria-label="Ready for you">
      <h2>Ready for you</h2>
      {await Promise.all(
        ready.map(async (p) => {
          const spot = p.pointId ? await getPointById(p.pointId) : undefined;
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
        }),
      )}
    </section>
  );
}
