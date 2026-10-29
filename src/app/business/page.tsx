import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import styles from "@/app/welcome/welcome.module.css";
import { FEE_DOOR, FEE_DOOR_EXTRA, FEE_POINT } from "@/lib/parcels";

export const metadata = {
  title: "Izza for business",
  description: "Your customers, reached. Send parcels to an Izza point near them.",
};

const steps = [
  { title: "Pick a hub", text: "Choose the Izza point closest to your customer, and tell us who it is for. They get a code on WhatsApp." },
  { title: "Take it there", text: "Bring the parcel to that Izza point. A trusted shop in their neighbourhood holds it safely." },
  { title: "They choose", text: `They collect it with their code (R${FEE_POINT}), or have it brought to their door (R${FEE_DOOR}).` },
];

export default function BusinessPage() {
  return (
    <div className={styles.site}>
      <SiteHeader />
      <main>
        <div className={`${styles.wrap} ${styles.pageHead}`}>
          <h1>Your customers, reached. Wherever they live.</h1>
          <p>For township sellers, online shops and couriers that need a last mile they can count on.</p>
          <div className={styles.ctas} style={{ paddingTop: 24 }}>
            <Link href="/signup?as=business" className="btn">
              Open a business account
            </Link>
            <Link href="/signin?next=%2Fsend" className={`btn ${styles.secondary}`}>
              Sign in to send
            </Link>
          </div>
        </div>

        <div className={`${styles.wrap} ${styles.anchor}`} id="how" style={{ paddingTop: 48 }}>
          <div className={styles.sectionHead}>
            <h2>How it works for you</h2>
          </div>
          <div className={styles.stepsRow}>
            {steps.map((s) => (
              <div key={s.title} className={styles.stepBox}>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className={`${styles.wrap} ${styles.anchor}`} id="cost">
          <div className={styles.sectionHead}>
            <h2>What it costs</h2>
          </div>
          <div className={styles.priceRow}>
            <div className={styles.priceBox}>
              <strong>Township sellers</strong>
              <p>R{FEE_POINT} to an Izza point. If your customer wants it at their door, they pay R{FEE_DOOR_EXTRA} extra. No monthly fee.</p>
            </div>
            <div className={styles.priceBox}>
              <strong>Online shops</strong>
              <p>Offer Izza points at checkout. [Pricing to confirm]</p>
            </div>
            <div className={styles.priceBox}>
              <strong>Couriers and retailers</strong>
              <p>We take parcels the last few streets, with verified local runners.</p>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
