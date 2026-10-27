import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import styles from "@/app/welcome/welcome.module.css";

export const metadata = {
  title: "Why Iza",
  description: "Why we started Iza, how the neighbourhood network works, and who does what.",
};

const stats = [
  {
    value: "23",
    unit: "%",
    text: "of Checkers Sixty60's delivery workforce were South African",
    source: "BusinessTech, Nov 2024",
    href: "https://businesstech.co.za/news/business/799894/big-changes-for-checkers-sixty60-in-south-africa-2/",
  },
  {
    value: "8",
    unit: "%",
    text: "of South African rider trainees still riding two years later",
    source: "Just Share, Nov 2024",
    href: "https://justshare.org.za/wp-content/uploads/2024/11/241115_Truworths-and-Shoprite-AGM-round-up-1.pdf",
  },
  {
    value: "47.4",
    unit: "%",
    text: "of young South Africans (15 to 34) are unemployed",
    source: "SAnews, Aug 2026",
    href: "https://www.sanews.gov.za/south-africa/sa-official-unemployment-rate-rises-336",
  },
  {
    value: "15",
    unit: " min",
    text: "is how long a driver can spend looking for a single front door in a township",
    source: "TechFinancials, Dec 2025",
    href: "https://techfinancials.co.za/2025/12/23/solving-the-township-economy-logistics-puzzle-the-data-key-to-unlocking-africas-next-retail-frontier/",
  },
];

const roles = [
  {
    title: "Businesses",
    does: "Book a parcel for a customer, pick the Iza point closest to them, and follow it on a dashboard.",
    cannot: "Cannot see other businesses' parcels, or take runner jobs.",
  },
  {
    title: "Runners",
    does: "See open jobs, accept one, collect from the business, drop at the Iza point, or deliver to a door with the customer's code.",
    cannot: "Cannot send parcels, and only see what a job needs.",
  },
  {
    title: "Iza points",
    does: "Hold parcels for their neighbours and hand them over when the right code is shown.",
    cannot: "Cannot hand over a parcel the customer asked to have delivered.",
  },
  {
    title: "Customers",
    does: "Use a code, with no account. Choose to collect it at the point or have it brought to the door.",
    cannot: "Cannot see parcels meant for other people.",
  },
];

const safe = [
  "Every runner, Iza point and business is approved by the Iza team before they start.",
  "A door delivery is finished only with the customer's 4-digit code.",
  "If nobody is home, the parcel goes back to the Iza point and the customer is told.",
  "Strangers can see where a parcel is, but not who it is for or where it is going.",
];

export default function WhyPage() {
  return (
    <div className={styles.site}>
      <SiteHeader />
      <main>
        <div className={`${styles.wrap} ${styles.pageHead}`}>
          <h1>Delivery that stays in the neighbourhood</h1>
          <p>Iza moves parcels the last few streets, using people and places that are already there.</p>
        </div>

        <section className={`${styles.wrap} ${styles.anchor}`} id="story" style={{ paddingTop: 40 }}>
          <div className={styles.sectionHead}>
            <h2>Why we started Iza</h2>
          </div>
          <div className={styles.storyGrid}>
            <div>
              <p>
                Big couriers struggle with places that have no street address. Drivers lose time hunting for a door,
                parcels come back undelivered, and the delivery jobs mostly go to people who live far from the
                neighbourhoods being served.
              </p>
              <p>
                Iza does it differently. A parcel goes to a trusted shop on your street. You collect it, or a runner
                from your own area brings it to your gate. The work and the money stay local.
              </p>
            </div>
            <div className={styles.priceBox}>
              <strong>The idea in one line</strong>
              <p>Use the shop on the corner as the courier&apos;s last stop, and the people who live there as the last mile.</p>
              <Link href="/#how" className="btn" style={{ marginTop: 12, alignSelf: "flex-start" }}>
                See how it works
              </Link>
            </div>
          </div>
        </section>

        <section className={styles.why}>
          <div className={`${styles.wrap} ${styles.section}`}>
            <div className={styles.sectionHead}>
              <h2>The numbers behind it</h2>
            </div>
            <div className={styles.stats}>
              {stats.map((s) => (
                <div key={s.source} className={styles.stat}>
                  <div className={styles.statNumber}>
                    {s.value}
                    <span>{s.unit}</span>
                  </div>
                  <p>{s.text}</p>
                  <a href={s.href} target="_blank" rel="noopener noreferrer">
                    {s.source}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={`${styles.wrap} ${styles.section} ${styles.anchor}`} id="operate">
          <div className={styles.sectionHead}>
            <h2>How we operate</h2>
            <p>Everyone has their own screen and their own job. Nobody sees more than they need.</p>
          </div>
          <div className={styles.roleTable}>
            {roles.map((r) => (
              <div key={r.title} className={styles.roleCard}>
                <h3>{r.title}</h3>
                <p>{r.does}</p>
                <p className={styles.no}>{r.cannot}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.safeBand}>
          <div className={`${styles.wrap} ${styles.section} ${styles.anchor}`} id="safe">
            <div className={styles.sectionHead}>
              <h2>Safe by design</h2>
            </div>
            <ul className={styles.checks} style={{ maxWidth: 720 }}>
              {safe.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className={styles.ctaBand}>
          <div className={`${styles.wrap} ${styles.ctaInner}`}>
            <h2>Be part of it</h2>
            <div className={styles.ctas}>
              <Link href="/business" className="btn">
                Send a parcel
              </Link>
              <Link href="/join" className={`btn ${styles.secondary}`}>
                Earn with Iza
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
