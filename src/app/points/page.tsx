import MapView from "@/components/MapView";
import Shell from "@/components/Shell";
import { points } from "@/lib/points";
import { shortPlusCode } from "@/lib/pluscode";

export const metadata = { title: "Iza points near you · Iza" };

export default function PointsPage() {
  return (
    <Shell>
      <h1 style={{ fontSize: 26 }}>Iza points near you</h1>
      <MapView points={points} height={300} />
      {points.map((p) => (
        <div
          key={p.code}
          className="card"
          style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700 }}>{p.name}</div>
            <div className="muted" style={{ fontSize: 13 }}>
              {p.hours}
            </div>
            <div className="mono muted" style={{ fontSize: 13 }}>
              {p.code} · {shortPlusCode(p.lat, p.lng, p.area)}
            </div>
          </div>
          <span className="chip chip-primary">{p.waiting} waiting</span>
        </div>
      ))}
    </Shell>
  );
}
