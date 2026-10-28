import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import Shell from "@/components/Shell";
import { currentUser } from "@/lib/auth";

export const metadata = { title: "Waiting for approval · Izza" };

export default function PendingPage() {
  return (
    <Shell title="Your account" subtitle="Waiting for approval">
      <Suspense fallback={null}>
        <Waiting />
      </Suspense>
    </Shell>
  );
}

async function Waiting() {
  const user = await currentUser();
  if (!user) redirect("/signin");
  if (user.status === "active") redirect("/");

  return (
    <section className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h1 style={{ fontSize: 26 }}>Thanks, {user.name}.</h1>
      <p className="muted" style={{ margin: 0 }}>
        The Izza team checks every runner and Izza point before they start. We&apos;ll approve your account soon,
        and you can sign in again to see it.
      </p>
      <Link className="btn btn-primary" href="/">
        Back to home
      </Link>
    </section>
  );
}
