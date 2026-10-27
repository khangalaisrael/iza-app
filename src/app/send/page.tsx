import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import SendForm from "@/components/SendForm";
import Shell from "@/components/Shell";
import { currentUser } from "@/lib/auth";
import { listApprovedPoints } from "@/lib/pointStore";

export const metadata = { title: "Send a parcel · Iza" };

export default function SendPage({ searchParams }: PageProps<"/send">) {
  return (
    <Shell>
      <Suspense fallback={<p className="muted">Loading…</p>}>
        <Content searchParams={searchParams} />
      </Suspense>
    </Shell>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/send">["searchParams"] }) {
  const user = await currentUser();
  if (!user) redirect("/signin?next=%2Fsend");
  if (user.status !== "active") redirect("/pending");

  // Sending is for approved businesses. Everyone else gets a clear way forward, not a blank redirect.
  if (user.role !== "business" && user.role !== "admin") {
    return (
      <section className="card stack">
        <h1>Sending is for businesses</h1>
        <p className="lead">
          Shops and sellers send parcels to an Iza point. If you are expecting a parcel, use your code on the Track
          page.
        </p>
        <Link className="btn btn-primary" href="/track">
          Where&apos;s my parcel?
        </Link>
        <Link className="btn btn-soft" href="/business">
          How Iza works for business
        </Link>
      </section>
    );
  }

  const { point } = await searchParams;
  const points = (await listApprovedPoints()).map(({ id, name, kind, hours, lat, lng }) => ({ id, name, kind, hours, lat, lng }));
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://iza-app-israels-projects-71356823.vercel.app";
  return <SendForm points={points} siteUrl={siteUrl} initialPointId={Array.isArray(point) ? point[0] : point} />;
}
