import Link from "next/link";
import Shell from "@/components/Shell";

export const metadata = { title: "Page not found · Izza" };

// Shown for any address that does not exist. It keeps the header, so people can find their way.
export default function NotFound() {
  return (
    <Shell title="Not found" subtitle="We couldn't find that page">
      <section className="card stack">
        <h1>We couldn&apos;t find that page</h1>
        <p className="lead">The address may be wrong, or the page may have moved. Here is where you can go.</p>
        <Link className="btn" href="/">
          Go to the home page
        </Link>
        <Link className="btn btn-soft" href="/track">
          Track a parcel
        </Link>
        <Link className="btn btn-soft" href="/points">
          Find an Izza point
        </Link>
      </section>
    </Shell>
  );
}
