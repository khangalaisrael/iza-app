import Link from "next/link";
import { Suspense } from "react";
import CodeForm from "@/components/CodeForm";
import Shell from "@/components/Shell";
import { currentUser } from "@/lib/auth";
import { statusOf, type Parcel } from "@/lib/parcels";
import { listParcels, listParcelsFor, listParcelsToPhone } from "@/lib/store";

export const metadata = { title: "Track a parcel · Iza" };

export default function TrackPage() {
  return (
    <Shell title="Track" subtitle="Where is my parcel?">
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

const mergeParcels = (a: Parcel[], b: Parcel[]) => [...a, ...b.filter((p) => !a.some((x) => x.code === p.code))];

async function ParcelList() {
  const user = await currentUser();
  if (!user) {
    return (
      <p className="muted" style={{ margin: 0 }}>
        <Link href="/signin?next=/track" style={{ color: "var(--primary)", fontWeight: 700 }}>
          Sign in
        </Link>{" "}
        to see your parcels.
      </p>
    );
  }

  // A business sees what it sent. A customer sees what is addressed to their number. The team sees all.
  const mine =
    user.role === "admin"
      ? await listParcels()
      : user.role === "business"
        ? await listParcelsFor(user.id)
        : user.role === "customer"
          ? mergeParcels(await listParcelsToPhone(user.identifier), await listParcelsFor(user.id))
          : [];
  if (mine.length === 0) {
    return (
      <p className="muted" style={{ margin: 0 }}>
        Nothing yet. Your parcels show up here.
      </p>
    );
  }

  return (
    <>
      {mine.map((p) => (
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
