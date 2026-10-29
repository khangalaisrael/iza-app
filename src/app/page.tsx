import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ArrowRight, Handshake, MapPin, Motorcycle, Plus, Storefront } from "@phosphor-icons/react/dist/ssr";
import CodeForm from "@/components/CodeForm";
import InstallBanner from "@/components/InstallBanner";
import PointsPreview from "@/components/PointsPreview";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { currentUser } from "@/lib/auth";
import { landingFor } from "@/lib/roles";
import styles from "./welcome/welcome.module.css";

export const metadata = {
  title: "Izza: bringing it closer",
  description: "Delivery for villages and townships. Collect at a shop nearby, or a neighbour brings it to your door.",
};

// Short on purpose: one line each. The detail lives on the pages these lead to.
const steps = [
  { title: "Send it to a point", text: "A shop sends your parcel to an Izza point near you." },
  { title: "It waits nearby", text: "A spaza, salon or hall keeps it safe." },
  { title: "Collect, or we bring it", text: "Show your code, or a runner brings it to your door." },
];

const who = [
  { icon: Storefront, title: "I run a business", href: "/business", cta: "Send with Izza" },
  { icon: MapPin, title: "I'm waiting for a parcel", href: "/track", cta: "Track it" },
  { icon: Handshake, title: "I have a shop or hall", href: "/signup?as=point", cta: "Become a point" },
  { icon: Motorcycle, title: "I want to earn", href: "/signup?as=runner", cta: "Become a runner" },
];

const faqs = [
  { q: "Do I need a street address?", a: "No. Drop a pin or describe a landmark, like the blue gate opposite the Engen." },
  { q: "Do I need to download an app?", a: "No. Open this site on your phone. You can add it to your home screen." },
  { q: "Can my shop become an Izza point?", a: "Yes. Shops, salons and halls can hold parcels for neighbours. Apply and our team will approve you." },
];

export default function Home() {
  return (
    <div className={styles.site}>
      <SiteHeader />
      <Suspense fallback={null}>
        <SendWorkersHome />
      </Suspense>

      <main>
        <section className={styles.heroBand}>
          <div className={`${styles.wrap} ${styles.hero} ${styles.heroSolo}`}>
            <div className={styles.heroText}>
              <h1>Bringing it closer.</h1>
              <p>Delivery for villages and townships. No street address needed.</p>
              <div className={styles.ctas}>
                <Link href="/business" className="btn btn-honey">
                  Send a parcel
                </Link>
                <Link href="/track" className={`btn ${styles.secondary}`}>
                  Track a parcel
                </Link>
              </div>
            </div>
          </div>
        </section>

        <div className={styles.wrap}>
          <InstallBanner />
        </div>

        <section className={styles.strip} aria-labelledby="track-title">
          <div className={`${styles.wrap} ${styles.stripInner}`}>
            <h2 id="track-title">Where&apos;s my parcel?</h2>
            <div className={styles.stripForm}>
              <CodeForm />
            </div>
          </div>
        </section>

        <section className={`${styles.wrap} ${styles.section} ${styles.anchor}`} id="how">
          <div className={styles.sectionHead}>
            <h2>How it works</h2>
          </div>
          <div className={styles.howRow}>
            {steps.map((s, i) => (
              <div key={s.title} className={styles.howStep}>
                <span className={styles.howNum}>{i + 1}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.why} aria-labelledby="why-title">
          <div className={`${styles.wrap} ${styles.section}`}>
            <div className={styles.sectionHead}>
              <h2 id="why-title">Why we do this</h2>
              <p>We believe townships deserve the same delivery as everyone else.</p>
              <p>We&apos;re starting in Mfuleni, one delivery at a time.</p>
            </div>
          </div>
        </section>

        <section className={`${styles.wrap} ${styles.section}`} id="who">
          <div className={styles.sectionHead}>
            <h2>Izza is for everyone</h2>
          </div>
          <div className={styles.whoGrid}>
            {who.map(({ icon: Icon, title, href, cta }) => (
              <div key={title} className={styles.who}>
                <Icon size={30} aria-hidden="true" />
                <h3>{title}</h3>
                <Link href={href} className={styles.cellLink}>
                  {cta} <ArrowRight size={18} aria-hidden="true" />
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section className={`${styles.wrap} ${styles.section}`} id="points" style={{ paddingTop: 0 }}>
          <div className={styles.sectionHead}>
            <h2>Izza points near you</h2>
          </div>
          {/* A list, not a map: on a phone a map catches the thumb that was trying to scroll the page. The map is one tap away. */}
          <Suspense fallback={null}>
            <PointsPreview map={false} />
          </Suspense>
        </section>

        <section className={`${styles.wrap} ${styles.section}`} id="faq" style={{ paddingTop: 0 }}>
          <div className={styles.sectionHead}>
            <h2>Good to know</h2>
          </div>
          <div className={styles.faq}>
            {faqs.map((f) => (
              <details key={f.q}>
                <summary>
                  {f.q}
                  <Plus size={20} aria-hidden="true" />
                </summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

// Runners and shops have their own place. The public home is for customers and visitors.
async function SendWorkersHome() {
  const user = await currentUser();
  if (user && user.role !== "customer") redirect(landingFor(user.role));
  return null;
}
