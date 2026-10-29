import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { FEE_DOOR_EXTRA, FEE_POINT } from "@/lib/parcels";
import SendForm from "@/components/SendForm";
import Shell from "@/components/Shell";
import { currentUser } from "@/lib/auth";
import { listApprovedPoints } from "@/lib/pointStore";
import { recentSending } from "@/lib/store";

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
  if (!user) {
    return (
      <>
        <section className="stack">
          <h1>Send a parcel</h1>
          <p className="lead">Send to anyone in the neighbourhood. A runner collects it from you and takes it to an Izza point close to them.</p>
          <ol style={{ margin: 0, paddingLeft: 22, display: "grid", gap: 10 }}>
            <li>
              <strong>Tell us where to collect it</strong> and who it is for.
            </li>
            <li>
              <strong>A runner collects it</strong> and brings it to the Izza point. You pay R{FEE_POINT} in cash.
            </li>
            <li>
              <strong>They choose</strong> to collect it at the shop, or pay R{FEE_DOOR_EXTRA} extra to have it brought to their door.
            </li>
          </ol>
        </section>
        <section className="card stack" aria-label="Sign up to send">
          <h2>First, a quick account</h2>
          <p className="muted" style={{ margin: 0 }}>It takes a minute, and you can follow your parcel from your phone.</p>
          <Link className="btn btn-primary" href="/signup/customer?next=%2Fsend">
            Create an account to send
          </Link>
          <Link className="btn btn-soft" href="/signin?next=%2Fsend">
            I already have an account
          </Link>
          <Link className="linkBtn" href="/signup/business?next=%2Fsend">
            I send parcels for a business
          </Link>
        </section>
      </>
    );
  }
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
  const { receivers, lastPickup } = await recentSending(user.id);
  return (
    <SendForm
      points={points}
      siteUrl={siteUrl}
      initialPointId={Array.isArray(point) ? point[0] : point}
      fromCustomer={user.role === "customer"}
      recent={receivers}
      lastPickup={lastPickup}
    />
  );
}
