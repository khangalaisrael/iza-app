import Link from "next/link";
import { Suspense } from "react";
import LanguageLinks from "@/components/LanguageLinks";
import Shell from "@/components/Shell";
import SoundToggle from "@/components/SoundToggle";
import { signOutAction } from "@/app/auth/actions";
import { currentUser } from "@/lib/auth";
import { navFor } from "@/lib/nav";

export const metadata = { title: "More · Izza" };

export default function MorePage() {
  return (
    <Shell title="More" subtitle="Everything else">
      <Suspense fallback={<p className="muted">Loading…</p>}>
        <Content />
      </Suspense>
    </Shell>
  );
}

// The pages that do not fit on the tab bar: the same choices the computer menu has, laid out as big, plain lists.
async function Content() {
  const user = await currentUser();
  const groups = navFor(user?.role ?? null).filter((item) => item.children);

  return (
    <>
      <h1>More</h1>
      {groups.map((g) => (
        <section key={g.label} className="stack" style={{ gap: 4 }} aria-label={g.label}>
          <h2>{g.label}</h2>
          <div className="card moreList">
            {g.children!.map((c) => (
              <Link key={c.href + c.label} href={c.href} className="moreItem">
                {c.label}
              </Link>
            ))}
          </div>
        </section>
      ))}

      <section className="stack" style={{ gap: 4 }} aria-label="Izza">
        <h2>Izza</h2>
        <div className="card moreList">
          <Link href="/why" className="moreItem">
            Why Izza
          </Link>
          <Link href="/privacy" className="moreItem">
            Privacy notice
          </Link>
        </div>
      </section>

      <section className="stack" style={{ gap: 8 }} aria-label="Sound">
        <h2>Sound</h2>
        <SoundToggle />
      </section>

      <section className="stack" style={{ gap: 8 }} aria-label="Language">
        <h2>Language</h2>
        <LanguageLinks />
      </section>

      <section className="stack" style={{ gap: 8 }} aria-label="Account">
        <h2>Account</h2>
        {user ? (
          <form action={signOutAction}>
            <button className="btn btn-soft btn-block" type="submit">
              Sign out
            </button>
          </form>
        ) : (
          <>
            <Link className="btn btn-primary" href="/signin">
              Sign in
            </Link>
            <Link className="btn btn-soft" href="/signup">
              Create an account
            </Link>
          </>
        )}
      </section>
    </>
  );
}
