import { connection } from "next/server";
import { Suspense } from "react";
import PointsExplorer from "@/components/PointsExplorer";
import PortalShell from "@/components/PortalShell";
import { listApprovedPoints } from "@/lib/pointStore";

export const metadata = { title: "Iza points near you · Iza" };

export default function PointsPage({ searchParams }: PageProps<"/points">) {
  return (
    <PortalShell title="Iza points" subtitle="Trusted places near you">
      <Suspense fallback={<p className="muted">Loading points…</p>}>
        <Explorer searchParams={searchParams} />
      </Suspense>
    </PortalShell>
  );
}

async function Explorer({ searchParams }: { searchParams: PageProps<"/points">["searchParams"] }) {
  await connection();
  const { mode } = await searchParams;
  const points = (await listApprovedPoints()).map(({ id, name, kind, address, hours, lat, lng }) => ({ id, name, kind, address, hours, lat, lng }));
  return (
    <>
      <div>
        <h1>Iza points near you</h1>
        <p className="lead">Trusted places in your neighbourhood that hold parcels for you.</p>
      </div>
      <PointsExplorer points={points} initialMode={(Array.isArray(mode) ? mode[0] : mode) === "send" ? "send" : "pick"} />
    </>
  );
}
