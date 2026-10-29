import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import Shell from "@/components/Shell";
import { safeNext } from "@/lib/auth";

export const metadata = { title: "Join Izza" };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const WAYS = [
  { role: "customer", title: "I'm getting a parcel", note: "Start right away" },
  { role: "business", title: "I send parcels", note: "For shops and sellers. We approve you first" },
  { role: "runner", title: "I want to deliver", note: "Become a runner. Start right away" },
  { role: "point", title: "I'll host an Izza point", note: "A shop, salon or hall. We approve you first" },
] as const;

export default function SignUpPage({ searchParams }: PageProps<"/signup">) {
  return (
    <Shell title="Sign up" subtitle="Make an account">
      <Suspense fallback={null}>
        <Choose searchParams={searchParams} />
      </Suspense>
    </Shell>
  );
}

// The first screen only asks one thing: how will you use Izza? Each answer has its own short page, so nobody scrolls through a form
// that is mostly for someone else. Old links such as /signup?as=runner go straight to the right page.
async function Choose({ searchParams }: { searchParams: PageProps<"/signup">["searchParams"] }) {
  const { next, as } = await searchParams;
  const after = safeNext(first(next));
  const query = after === "/" ? "" : `?next=${encodeURIComponent(after)}`;
  const direct = WAYS.find((w) => w.role === first(as));
  if (direct) redirect(`/signup/${direct.role}${query}`);

  return (
    <>
      <h1>Join Izza</h1>
      <nav className="field bigChoices" aria-label="How will you use Izza?">
        <p style={{ margin: 0, fontWeight: 600 }}>How will you use Izza?</p>
        {WAYS.map((w) => (
          <Link key={w.role} href={`/signup/${w.role}${query}`} className="bigChoice">
            <span className="plain">
              <strong>{w.title}</strong>
              <small>{w.note}</small>
            </span>
          </Link>
        ))}
      </nav>
      <p className="muted center">
        Already have an account?{" "}
        <Link href={`/signin${query}`} className="tapLink" style={{ color: "var(--primary)", fontWeight: 700 }}>
          Sign in
        </Link>
      </p>
    </>
  );
}
