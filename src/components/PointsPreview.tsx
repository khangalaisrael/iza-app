import Link from "next/link";
import { connection } from "next/server";
import MapView from "./MapView";
import styles from "@/app/welcome/welcome.module.css";
import { listApprovedPoints } from "@/lib/pointStore";

// The approved Izza points, on a map and as a short list. Used on the website's front page.
export default async function PointsPreview({
  height = 380,
  list = true,
  map = true,
}: {
  height?: number;
  list?: boolean;
  map?: boolean;
}) {
  await connection(); // the list comes from the database, so it is read when someone visits, not at build
  const points = await listApprovedPoints();
  const spots = points.map(({ id, name, lat, lng }) => ({ id, name, lat, lng }));

  if (!list) return <MapView points={spots} height={height} />;

  return (
    <div className={map ? styles.pointsGrid : undefined}>
      {map && <MapView points={spots} height={height} />}
      <div className={styles.pointList}>
        {points.slice(0, 4).map((p) => (
          <div key={p.id} className={styles.pointRow}>
            <div>
              <strong>{p.name}</strong>
              <span>{p.kind}, open {p.hours}</span>
            </div>
          </div>
        ))}
        {points.length === 0 && <p className="muted">The first Izza points are being approved.</p>}
        <Link href="/points" className="btn btn-primary">
          See all points
        </Link>
      </div>
    </div>
  );
}
