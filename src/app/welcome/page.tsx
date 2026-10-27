import Link from "next/link";
import {
  ArrowRight,
  BookmarkSimple,
  Camera,
  ChatCircleText,
  MapPin,
  Package,
  Plus,
  Storefront,
} from "@phosphor-icons/react/dist/ssr";
import CodeForm from "@/components/CodeForm";
import MapView from "@/components/MapView";
import { points } from "@/lib/points";
import styles from "./welcome.module.css";

export const metadata = {
  title: "Iza: bringing it closer",
  description:
    "Neighbourhood delivery for Cape Town. No street address needed, a landmark is enough.",
};

const ways = [
  { icon: MapPin, text: "Drop a pin" },
  { icon: ChatCircleText, text: "Describe a landmark" },
  { icon: Camera, text: "Add a photo of your gate" },
  { icon: BookmarkSimple, text: "We save it for next time" },
];

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

const faqs = [
  {
    q: "How much does it cost?",
    a: "R12 if you collect at an Iza point, R20 to your door. Pay with SnapScan, eWallet or EFT.",
  },
  {
    q: "I run a business. How can Iza help?",
    a: "We collect from you at the same time every day and deliver to your customers, to their door or an Iza point. You pay 10% per order and see every delivery live.",
  },
  {
    q: "Can my shop or salon become an Iza point?",
    a: "Yes. Shops, salons, pharmacies, petrol station shops and community halls can hold parcels and earn for each one.",
  },
  {
    q: "How do I become a runner?",
    a: "Say hi on WhatsApp. You'll deliver in your own area, get paid the same day, and get support towards a licence and your own bike.",
  },
  {
    q: "Do I need to download an app?",
    a: "No. You can book, pay and track on WhatsApp. This site is built to load fast on low data.",
  },
];

export default function Welcome() {
  return (
    <div className={styles.site}>
      <header className={styles.nav}>
        <div className={`${styles.wrap} ${styles.navInner}`}>
          <Link href="/welcome" className="badge" aria-label="Iza home">
            iza
          </Link>
          <nav className={styles.links} aria-label="Sections">
            <a href="#send">Send</a>
            <a href="#points">Collect</a>
            <a href="#business">For business</a>
            <a href="#faq">Questions</a>
          </nav>
          <div className={styles.navActions}>
            <Link href="/track" className={styles.ghost}>
              Track
            </Link>
            <Link href="/send" className="btn">
              Send a parcel
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className={`${styles.wrap} ${styles.hero}`}>
          <div className={styles.heroText}>
            <h1>Order anywhere. Collect around the corner.</h1>
            <p>Neighbourhood delivery for Cape Town. A landmark is enough, no street address needed.</p>
            <div className={styles.ctas}>
              <Link href="/send" className="btn">
                Send a parcel
              </Link>
              <Link href="/points" className={`btn ${styles.secondary}`}>
                Find a point near me
              </Link>
            </div>
          </div>
          <div className={styles.heroMap}>
            <MapView points={points} height={420} />
            <p className={styles.mapCaption}>Iza points around Langa, where parcels wait for you.</p>
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

        <section className={`${styles.wrap} ${styles.section} ${styles.reveal}`} id="address">
          <div className={styles.addressGrid}>
            <div>
              <div className={styles.sectionHead}>
                <h2>No street address? We&apos;ll still find you.</h2>
                <p>
                  Many homes don&apos;t have a formal address, and most couriers ask for one anyway. We ask for what
                  you actually have.
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
              <small>Your Iza address</small>
              <div className={styles.code}>LANGA-BLUEGATE-27</div>
              <small>Share it like a phone number.</small>
              <div className={styles.contrast}>
                <div className={styles.contrastOld}>
                  The usual way: street address, postal code, then the parcel is delayed or sent back.
                </div>
                <div className={styles.contrastNew}>The Iza way: &quot;Next to the blue container, behind the church&quot;</div>
              </div>
            </div>
          </div>
        </section>

        <section className={`${styles.wrap} ${styles.section} ${styles.reveal}`} id="send" style={{ paddingTop: 0 }}>
          <div className={styles.sectionHead}>
            <h2>What would you like to do?</h2>
            <p>Pick one. It takes about a minute.</p>
          </div>
          <div className={styles.bento}>
            <div className={`${styles.cell} ${styles.cellSend}`}>
              <Package size={44} weight="bold" aria-hidden="true" />
              <h3>Send something</h3>
              <p>To a door or an Iza point, from R12.</p>
              <Link href="/send" className={styles.cellLink}>
                Book a delivery <ArrowRight size={20} weight="bold" aria-hidden="true" />
              </Link>
            </div>
            <div className={`${styles.cell} ${styles.cellCollect}`} id="collect">
              <h3>Collect nearby</h3>
              <p>From a shop on your street. R12 to collect, R20 to your door.</p>
              <Link href="/points" className={styles.cellLink}>
                See Iza points <ArrowRight size={20} weight="bold" aria-hidden="true" />
              </Link>
            </div>
            <div className={`${styles.cell} ${styles.cellBusiness}`} id="business">
              <Storefront size={40} weight="bold" aria-hidden="true" />
              <h3>Deliver for my business</h3>
              <p>Daily pickups at a set time, and you see every delivery live.</p>
              <Link href="/ops" className={styles.cellLink}>
                See the dashboard <ArrowRight size={20} weight="bold" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        <section className={`${styles.why} ${styles.section}`} id="why">
          <div className={styles.wrap}>
            <div className={styles.sectionHead}>
              <h2>Why we started Iza</h2>
              <p>
                Delivery is growing fast. The jobs it creates mostly aren&apos;t reaching young people from our
                neighbourhoods.
              </p>
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

        <section className={`${styles.wrap} ${styles.section} ${styles.reveal}`} id="points">
          <div className={styles.sectionHead}>
            <h2>Iza points near you</h2>
            <p>
              Corner shops, petrol station shops, pharmacies, salons and community halls. Most are a few
              minutes&apos; walk away.
            </p>
          </div>
          <div className={styles.pointsGrid}>
            <MapView points={points} height={380} />
            <div className={styles.pointList}>
              {points.map((p) => (
                <div key={p.code} className={styles.pointRow}>
                  <div>
                    <strong>{p.name}</strong>
                    <span>{p.hours}</span>
                  </div>
                  <span className="chip chip-primary">{p.waiting} waiting</span>
                </div>
              ))}
              <Link href="/points" className={`btn btn-primary`}>
                See all points
              </Link>
            </div>
          </div>
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
      </main>

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
                  <Link href="/send">Send a parcel</Link>
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
                  <Link href="/runner">Become a runner</Link>
                </li>
                <li>
                  <Link href="/point">Host an Iza point</Link>
                </li>
                <li>
                  <Link href="/ops">For business</Link>
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
    </div>
  );
}
