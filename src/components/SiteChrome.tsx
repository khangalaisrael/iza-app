import Link from "next/link";
import { Suspense } from "react";
import AccountButton from "./AccountButton";
import styles from "@/app/welcome/welcome.module.css";

// The website's top bar and footer, the same on every public page, following the design.
export function SiteHeader() {
  return (
    <header className={styles.nav}>
      <div className={`${styles.wrap} ${styles.navInner}`}>
        <Link href="/welcome" className="badge" aria-label="Iza home">
          iza
        </Link>
        <details className={styles.mobileMenu}>
          <summary>Menu</summary>
          <nav className={styles.mobileLinks} aria-label="Menu">
            <Link href="/business">Send</Link>
            <Link href="/points">Collect</Link>
            <Link href="/business">For business</Link>
            <Link href="/join">Join us</Link>
            <Link href="/welcome#why">Why Iza</Link>
          </nav>
        </details>
        <nav className={styles.links} aria-label="Main">
          <Link href="/business">Send</Link>
          <Link href="/points">Collect</Link>
          <Link href="/business">For business</Link>
          <Link href="/join">Join us</Link>
          <Link href="/welcome#why">Why Iza</Link>
        </nav>
        <div className={styles.navActions}>
          <Link href="/track" className={styles.ghost}>
            Track
          </Link>
          <Suspense fallback={null}>
            <AccountButton />
          </Suspense>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.wrap}>
        <div className={styles.footerGrid}>
          <div className={styles.footerBrand}>
            <span className="badge" aria-label="Iza">
              iza
            </span>
            <p>Delivered by your neighbours.</p>
          </div>
          <div>
            <h3>Get things moving</h3>
            <ul>
              <li>
                <Link href="/business">Send a parcel</Link>
              </li>
              <li>
                <Link href="/track">Where&apos;s my parcel?</Link>
              </li>
              <li>
                <Link href="/points">Points near me</Link>
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
                <Link href="/business">For business</Link>
              </li>
            </ul>
          </div>
          <div>
            <h3>Say hello</h3>
            <ul>
              <li>WhatsApp [number]</li>
              <li>[email]</li>
              <li>Rondebosch, Cape Town</li>
            </ul>
          </div>
        </div>
        <p className={styles.legal}>&copy; 2026 The Iza Collective, UCT MakersForge</p>
      </div>
    </footer>
  );
}
