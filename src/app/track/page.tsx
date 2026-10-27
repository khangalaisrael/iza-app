import Link from "next/link";
import { Suspense } from "react";
import CodeForm from "@/components/CodeForm";
import Shell from "@/components/Shell";
import { statusOf } from "@/lib/parcels";
import { listParcels } from "@/lib/store";

export const metadata = { title: "Track a parcel · Iza" };

export default function TrackPage() {
  return (
    <Shell>
      <h1 style={{ fontSize: 26 }}>Where&apos;s my parcel?</h1>
      <p className="muted" style={{ margin: 0 }}>
        Type the code from your message.
      </p>
      <CodeForm cta="Track" />

      <h2 className="section-title">Your parcels</h2>
      <Suspense fallback={<p className="muted">Loading…</p>}>
        <ParcelList />
      </Suspense>
    </Shell>
  );
}

async function ParcelList() {
  const all = await listParcels();
  return (
    <>
      {all.map((p) => (
        <Link
          key={p.code}
          href={`/track/${p.code}`}
          className="card"
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          <div>
            <div style={{ fontWeight: 700 }}>For {p.to}</div>
            <div className="mono muted" style={{ fontSize: 13 }}>
              {p.code}
            </div>
          </div>
          <span className="chip chip-honey">{statusOf(p)}</span>
        </Link>
      ))}
    </>
  );
}
