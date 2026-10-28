import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import ResetPasswordForm from "@/components/ResetPasswordForm";
import Shell from "@/components/Shell";
import { resetIsValid } from "@/lib/reset";

export const metadata = { title: "New password · Iza", robots: { index: false } };

export default function ResetPage({ params }: PageProps<"/reset/[token]">) {
  return (
    <Shell title="New password" subtitle="Choose a new password">
      <Suspense fallback={null}>
        <Form params={params} />
      </Suspense>
    </Shell>
  );
}

async function Form({ params }: { params: PageProps<"/reset/[token]">["params"] }) {
  await connection();
  const { token } = await params;
  if (!(await resetIsValid(token))) {
    return (
      <section className="card stack">
        <h1>This link doesn&apos;t work any more</h1>
        <p className="lead">It may have expired, or it was already used. Ask the Iza team for a new one.</p>
        <Link className="btn" href="/signin">
          Back to sign in
        </Link>
      </section>
    );
  }
  return <ResetPasswordForm token={token} />;
}
