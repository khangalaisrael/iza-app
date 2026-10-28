import Link from "next/link";
import { Suspense } from "react";
import { AccountMenu } from "./AccountButton";
import NavStrip from "./NavStrip";
import WhatsAppButton from "./WhatsAppButton";
import { currentUser } from "@/lib/auth";
import { teamAttention } from "@/lib/store";
import { t, type Lang } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import { actionsFor, navFor } from "@/lib/nav";
import { WORKSPACE } from "@/lib/roles";
import type { User } from "@/lib/users";
import styles from "@/app/welcome/welcome.module.css";

// The top bar, the same on every page: the choices sit along the top, like Pargo's, and change with who is signed in.
export function SiteHeader() {
  return (
    <>
      <header className={styles.nav}>
        <Suspense fallback={<Bar user={null} />}>
          <SignedBar />
        </Suspense>
      </header>
      <WhatsAppButton />
    </>
  );
}

async function SignedBar() {
  const [user, lang] = await Promise.all([currentUser(), getLang()]);
  // The team's tab shows how many things are waiting for them.
  const waiting = user?.role === "admin" && user.status === "active" ? await teamAttention() : 0;
  return <Bar user={user} lang={lang} waiting={waiting} />;
}

function Bar({ user, lang = "en", waiting = 0 }: { user: User | null; lang?: Lang; waiting?: number }) {
  const role = user?.role ?? null;
  const items = navFor(role).map((item) => (item.href === "/ops" && waiting > 0 ? { ...item, badge: waiting } : item));
  const { find, track } = actionsFor(role);
  const isWorker = user && user.role !== "customer" && user.status === "active";

  return (
    <div className={styles.navBar}>
      <Link href="/" className={styles.logo} aria-label="Izza home">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/izza-mark.png" alt="izza" width={326} height={188} />
      </Link>

      <NavStrip items={items} />

      <nav className={styles.links} aria-label="Main">
        {items.map((item) => (
          <div key={item.label} className={styles.group}>
            <Link href={item.href} className={item.children ? styles.hasMenu : undefined}>
              {item.label}
              {item.badge ? <span className={styles.badge} aria-label={`${item.badge} waiting`}>{item.badge}</span> : null}
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
            {t(lang, "Find an Izza point")}
          </Link>
        )}
        {track && (
          <Link href="/track" className={`${styles.trackBlock} ${styles.hideSmall}`}>
            {t(lang, "Track")}
          </Link>
        )}
        {!user && (
          <Link href="/signin" className={styles.signBlock}>
            {t(lang, "Sign in")}
          </Link>
        )}
        {isWorker && (
          <Link href={WORKSPACE[user.role].href} className={`${styles.signBlock} ${styles.hideSmall}`}>
            {t(lang, "Dashboard")}
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.footerLogo} src="/izza-logo.png" alt="izza, bringing it closer" width={326} height={231} />
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
                <Link href="/points">Find an Izza point</Link>
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
                <Link href="/signup?as=point">Host an Izza point</Link>
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
                <Link href="/why">Why Izza</Link>
              </li>
              <li>
                <Link href="/why#operate">How we operate</Link>
              </li>
              <li>
                <Link href="/privacy">Privacy notice</Link>
              </li>
              <li>Rondebosch, Cape Town</li>
            </ul>
          </div>
        </div>
        <p className={styles.legal}>&copy; 2026 The Izza Collective, UCT MakersForge</p>
      </div>
    </footer>
  );
}
