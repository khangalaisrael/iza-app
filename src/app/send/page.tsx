import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import SendForm from "@/components/SendForm";
import Shell from "@/components/Shell";
import { currentUser } from "@/lib/auth";
import { listApprovedPoints } from "@/lib/pointStore";

export const metadata = { title: "Send a parcel · Izza" };

export default function SendPage({ searchParams }: PageProps<"/send">) {
  return (
    <Shell title="Send" subtitle="Take a parcel to an Izza point">
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

  // Customers and businesses send. Runners and Izza points have their own work, so they get a clear way back.
  if (user.role === "runner" || user.role === "point") {
    return (
      <section className="card stack">
        <h1>Sending is not part of your work</h1>
        <p className="lead">Your screen is for jobs and parcels at your Izza point. Customers and businesses send parcels.</p>
        <Link className="btn btn-primary" href={user.role === "runner" ? "/runner" : "/point"}>
          Back to my work
        </Link>
      </section>
    );
  }

  const { point } = await searchParams;
  const points = (await listApprovedPoints()).map(({ id, name, kind, hours, lat, lng }) => ({ id, name, kind, hours, lat, lng }));
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://izza-app.vercel.app";
  return <SendForm points={points} siteUrl={siteUrl} initialPointId={Array.isArray(point) ? point[0] : point} fromCustomer={user.role === "customer"} />;
}
