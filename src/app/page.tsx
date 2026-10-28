import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BookmarkSimple,
  Camera,
  ChatCircleText,
  Check,
  Eye,
  Handshake,
  Key,
  MapPin,
  Motorcycle,
  Plus,
  ShieldCheck,
  Storefront,
  UserCheck,
} from "@phosphor-icons/react/dist/ssr";
import CodeForm from "@/components/CodeForm";
import PointsPreview from "@/components/PointsPreview";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { currentUser } from "@/lib/auth";
import { FEE_DOOR, FEE_DOOR_EXTRA, FEE_POINT } from "@/lib/parcels";
import { landingFor } from "@/lib/roles";
import styles from "./welcome/welcome.module.css";

export const metadata = {
  title: "Izza: bringing it closer",
  description:
    "Izza is a neighbourhood parcel network for Cape Town. Businesses send to a shop on your street, and you collect it or have it brought to your door.",
};

const facts = [
  { value: `R${FEE_POINT}`, label: "To collect at a point" },
  { value: `R${FEE_DOOR}`, label: "Brought to your door" },
  { value: "0", label: "Apps to download" },
  { value: "1 code", label: "Is all you need" },
];

const steps = [
  { title: "A business sends it", text: "A seller books a parcel and picks the Izza point closest to the customer. The customer gets a code on WhatsApp." },
  { title: "A runner collects it", text: "A local runner we have approved picks it up from the business and brings it to the Izza point." },
  { title: "It waits at the point", text: "A shop, salon or hall on your street keeps it safe until you decide what happens next." },
  { title: "You choose", text: `Collect it yourself, or ask for it at your door. A runner brings it, and you give them your 4-digit code.` },
];

const who = [
  { icon: Storefront, title: "I run a business", text: "Reach customers who live where couriers struggle to find a door. See every parcel on your dashboard.", href: "/business", cta: "For my business" },
  { icon: MapPin, title: "I am waiting for a parcel", text: "Type your code, see where it is, and choose to collect or have it brought to you.", href: "/track", cta: "Track a parcel" },
  { icon: Handshake, title: "I have a shop or hall", text: "Become an Izza point. Hold parcels for your neighbours and earn for each one.", href: "/signup?as=point", cta: "Host an Izza point" },
  { icon: Motorcycle, title: "I want to earn", text: "Become a runner in your own area. Accept a job, follow the steps, get paid.", href: "/signup?as=runner", cta: "Become a runner" },
];

const safe = [
  { icon: UserCheck, title: "Every partner is approved", text: "Runners, Izza points and businesses are checked by our team before they start." },
  { icon: Key, title: "A code to hand over", text: "A parcel only changes hands when the right code is given. No code, no parcel." },
  { icon: Eye, title: "You can see every step", text: "From picked up to delivered, each update appears on your tracking page." },
  { icon: ShieldCheck, title: "Your details stay private", text: "A runner sees only what the job needs. Strangers see where a parcel is, not who it is for." },
];

const ways = [
  { icon: MapPin, text: "Drop a pin" },
  { icon: ChatCircleText, text: "Describe a landmark" },
  { icon: Camera, text: "Add a photo of your gate" },
  { icon: BookmarkSimple, text: "We save it for next time" },
];

const faqs = [
  {
    q: "How much does it cost?",
    a: `R${FEE_POINT} if you collect at an Izza point. R${FEE_DOOR} if you want it brought to your door, which is R${FEE_DOOR_EXTRA} extra.`,
  },
  {
    q: "I run a business. How can Izza help?",
    a: "You book a parcel and a local runner collects it from you. We hold it at an Izza point near your customer, and they choose to collect it or have it brought to their door. You see every step on your dashboard.",
  },
  {
    q: "Can my shop or salon become an Izza point?",
    a: "Yes. Shops, salons, pharmacies and community halls can hold parcels for their neighbours. Apply on the site and our team will approve you.",
  },
  {
    q: "How do I become a runner?",
    a: "Apply on the site. Once the team approves you, you can see open jobs in your area, accept one, and update the customer as you go.",
  },
  {
    q: "Do I need to download an app?",
    a: "No. You open this site on your phone and type your code. It is built to load fast on low data.",
  },
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
          <div className={`${styles.wrap} ${styles.hero}`}>
            <div className={styles.heroText}>
              <h1>Order anywhere. Collect around the corner.</h1>
              <p>
                Izza is a neighbourhood parcel network for Cape Town. Businesses send to a shop on your street. You
                collect it, or a local runner brings it to your door.
              </p>
              <div className={styles.ctas}>
                <Link href="/business" className="btn btn-honey">
                  Send a parcel
                </Link>
                <Link href="/points" className={`btn ${styles.secondary}`}>
                  Find an Izza point
                </Link>
              </div>
            </div>
            <div className={styles.heroMap}>
              <Suspense fallback={null}>
                <PointsPreview height={400} list={false} />
              </Suspense>
              <p className={styles.mapCaption}>Izza points around Langa, where parcels wait for you.</p>
            </div>
          </div>
          <div className={styles.factBar}>
            <div className={`${styles.wrap} ${styles.factGrid}`}>
              {facts.map((f) => (
                <div key={f.label} className={styles.fact}>
                  <strong>{f.value}</strong>
                  <span>{f.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

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
            <h2>How Izza works</h2>
            <p>Four steps from the seller to you. Nobody has to find a street address.</p>
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

        <section className={`${styles.wrap} ${styles.reveal}`} style={{ paddingBottom: "clamp(64px, 9vw, 120px)" }}>
          <div className={styles.sectionHead}>
            <h2>Then you choose</h2>
            <p>When your parcel reaches the Izza point, it is your call.</p>
          </div>
          <div className={styles.wayRow}>
            <div className={`${styles.way} ${styles.wayPoint}`}>
              <h3>Collect it</h3>
              <div className={styles.wayPrice}>R{FEE_POINT}</div>
              <ul className={styles.checks}>
                {["Walk to the shop on your street", "Show your code at the counter", "Collect whenever it suits you"].map((t) => (
                  <li key={t}>
                    <Check size={22} weight="bold" aria-hidden="true" />
                    {t}
                  </li>
                ))}
              </ul>
              <Link href="/points" className={styles.cellLink}>
                Find an Izza point <ArrowRight size={20} weight="bold" aria-hidden="true" />
              </Link>
            </div>
            <div className={`${styles.way} ${styles.wayDoor}`}>
              <h3>Bring it to my door</h3>
              <div className={styles.wayPrice}>R{FEE_DOOR}</div>
              <ul className={styles.checks}>
                {["A runner brings it to your gate", "Tell us a landmark, no address needed", "Give the runner your 4-digit code"].map((t) => (
                  <li key={t}>
                    <Check size={22} weight="bold" aria-hidden="true" />
                    {t}
                  </li>
                ))}
              </ul>
              <Link href="/track" className={styles.cellLink}>
                Track a parcel <ArrowRight size={20} weight="bold" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        <section className={styles.safeBand}>
          <div className={`${styles.wrap} ${styles.section} ${styles.anchor}`} id="safe">
            <div className={styles.sectionHead}>
              <h2>Safe, because it is local</h2>
              <p>Your parcel is handled by people from your own neighbourhood, with checks at every step.</p>
            </div>
            <div className={styles.safeGrid}>
              {safe.map(({ icon: Icon, title, text }) => (
                <div key={title} className={styles.safe}>
                  <Icon size={34} weight="bold" aria-hidden="true" />
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={`${styles.wrap} ${styles.section}`} id="who">
          <div className={styles.sectionHead}>
            <h2>Izza is for everyone on the street</h2>
            <p>Pick the one that sounds like you.</p>
          </div>
          <div className={styles.whoGrid}>
            {who.map(({ icon: Icon, title, text, href, cta }) => (
              <div key={title} className={styles.who}>
                <Icon size={38} weight="bold" aria-hidden="true" />
                <h3>{title}</h3>
                <p>{text}</p>
                <Link href={href} className={styles.cellLink}>
                  {cta} <ArrowRight size={20} weight="bold" aria-hidden="true" />
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section className={`${styles.wrap} ${styles.section} ${styles.reveal}`} id="address" style={{ paddingTop: 0 }}>
          <div className={styles.addressGrid}>
            <div>
              <div className={styles.sectionHead}>
                <h2>No street address? We&apos;ll still find you.</h2>
                <p>
                  Many homes don&apos;t have a formal address, and most couriers ask for one anyway. We ask for what you
                  actually have.
                </p>
              </div>
              <ul className={styles.waysList}>
                {ways.map(({ icon: Icon, text }) => (
                  <li key={text}>
                    <Icon size={28} weight="bold" aria-hidden="true" />
                    {text}
                  </li>
                ))}
              </ul>
            </div>
            <div className={styles.addressCard}>
              <small>A landmark is enough</small>
              <div className={styles.code}>Blue gate, opposite the Engen</div>
              <small>Tell us this, and the runner knows where to go.</small>
              <div className={styles.contrast}>
                <div className={styles.contrastOld}>
                  The usual way: street address, postal code, then the parcel is delayed or sent back.
                </div>
                <div className={styles.contrastNew}>The Izza way: &quot;Next to the blue container, behind the church&quot;</div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.why}>
          <div className={`${styles.wrap} ${styles.section}`}>
            <div className={styles.sectionHead}>
              <h2>Why we started Izza</h2>
              <p>
                Delivery is growing fast, but the jobs it creates mostly aren&apos;t reaching young people from our
                neighbourhoods. Izza keeps the work, and the money, local.
              </p>
            </div>
            <Link href="/why" className={`btn btn-honey`}>
              Read our story
            </Link>
          </div>
        </section>

        <section className={`${styles.wrap} ${styles.section}`} id="points">
          <div className={styles.sectionHead}>
            <h2>Izza points near you</h2>
            <p>Corner shops, salons, pharmacies and community halls. Most are a few minutes&apos; walk away.</p>
          </div>
          <Suspense fallback={null}>
            <PointsPreview />
          </Suspense>
        </section>

        <section className={`${styles.wrap} ${styles.section} ${styles.reveal}`} id="faq" style={{ paddingTop: 0 }}>
          <div className={styles.sectionHead}>
            <h2>Good to know</h2>
          </div>
          <div className={styles.faq}>
            {faqs.map((f) => (
              <details key={f.q}>
                <summary>
                  {f.q}
                  <Plus size={24} weight="bold" aria-hidden="true" />
                </summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className={styles.ctaBand}>
          <div className={`${styles.wrap} ${styles.ctaInner}`}>
            <h2>
              <Link href="/join">Earn with Izza</Link>
            </h2>
            <div className={styles.ctas}>
              <Link href="/signup?as=runner" className="btn">
                Become a runner
              </Link>
              <Link href="/signup?as=point" className={`btn ${styles.secondary}`}>
                Host an Izza point
              </Link>
            </div>
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
