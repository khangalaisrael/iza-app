import Link from "next/link";
import { Suspense } from "react";
import { AccountMenu } from "./AccountButton";
import { currentUser } from "@/lib/auth";
import { actionsFor, navFor } from "@/lib/nav";
import { WORKSPACE } from "@/lib/roles";
import type { User } from "@/lib/users";
import styles from "@/app/welcome/welcome.module.css";

// The top bar, the same on every page: the choices sit along the top, like Pargo's, and change with who is signed in.
export function SiteHeader() {
  return (
    <header className={styles.nav}>
      <Suspense fallback={<Bar user={null} />}>
        <SignedBar />
      </Suspense>
    </header>
  );
}

async function SignedBar() {
  const user = await currentUser();
  return <Bar user={user} />;
}

function Bar({ user }: { user: User | null }) {
  const role = user?.role ?? null;
  const items = navFor(role);
  const { find, track } = actionsFor(role);
  const isWorker = user && user.role !== "customer" && user.status === "active";

  return (
    <div className={styles.navBar}>
      <Link href="/" className={styles.logo} aria-label="Iza home">
        iza
      </Link>

      <details className={styles.mobileMenu}>
        <summary>Menu</summary>
        <nav className={styles.mobileLinks} aria-label="Menu">
          {items.map((item) => (
            <div key={item.label} className={styles.mobileGroup}>
              <Link href={item.href}>{item.label}</Link>
              {item.children?.map((c) => (
                <Link key={c.href + c.label} href={c.href} className={styles.mobileChild}>
                  {c.label}
                </Link>
              ))}
            </div>
          ))}
          {find && <Link href="/points">Find an Iza point</Link>}
          {track && <Link href="/track">Track a parcel</Link>}
          {!user && <Link href="/signin">Sign in</Link>}
        </nav>
      </details>

      <nav className={styles.links} aria-label="Main">
        {items.map((item) => (
          <div key={item.label} className={styles.group}>
            <Link href={item.href} className={item.children ? styles.hasMenu : undefined}>
              {item.label}
            </Link>
            {item.children && (
              <ul className={styles.dropdown}>
                {item.children.map((c) => (
                  <li key={c.href + c.label}>
                    <Link href={c.href}>{c.label}</Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </nav>

      <div className={styles.navActions}>
        {find && (
          <Link href="/points" className={styles.findLink}>
            Find an Iza point
          </Link>
        )}
        {track && (
          <Link href="/track" className={`${styles.trackBlock} ${isWorker ? styles.hideSmall : ""}`}>
            Track
          </Link>
        )}
        {!user && (
          <Link href="/signin" className={styles.signBlock}>
            Sign in
          </Link>
        )}
        {isWorker && (
          <Link href={WORKSPACE[user.role].href} className={styles.signBlock}>
            Dashboard
          </Link>
        )}
        {user && (
          <div className={styles.account}>
            <AccountMenu user={user} />
          </div>
        )}
      </div>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.wrap}>
        <div className={styles.footerGrid}>
          <div className={styles.footerBrand}>
            <span className={styles.logo} aria-hidden="true">
              iza
            </span>
            <p>Delivered by your neighbours.</p>
          </div>
          <div>
            <h3>Parcels</h3>
            <ul>
              <li>
                <Link href="/business">Send a parcel</Link>
              </li>
              <li>
                <Link href="/track">Where&apos;s my parcel?</Link>
              </li>
              <li>
                <Link href="/points">Find an Iza point</Link>
              </li>
            </ul>
          </div>
          <div>
            <h3>Join us</h3>
            <ul>
              <li>
                <Link href="/signup?as=runner">Become a runner</Link>
              </li>
              <li>
                <Link href="/signup?as=point">Host an Iza point</Link>
              </li>
              <li>
                <Link href="/signup?as=business">Open a business account</Link>
              </li>
            </ul>
          </div>
          <div>
            <h3>About</h3>
            <ul>
              <li>
                <Link href="/why">Why Iza</Link>
              </li>
              <li>
                <Link href="/why#operate">How we operate</Link>
              </li>
              <li>Rondebosch, Cape Town</li>
            </ul>
          </div>
        </div>
        <p className={styles.legal}>&copy; 2026 The Iza Collective, UCT MakersForge</p>
      </div>
    </footer>
  );
}
