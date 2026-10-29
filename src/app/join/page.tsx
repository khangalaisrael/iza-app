import Link from "next/link";
import { Check } from "@phosphor-icons/react/dist/ssr";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import styles from "@/app/welcome/welcome.module.css";

export const metadata = {
  title: "Join Izza",
  description: "Become a runner, host an Izza point, or send parcels as a business.",
};

const steps = [
  { title: "Apply", text: "Fill in a short form. It takes about five minutes." },
  { title: "Runners start at once", text: "Join as a runner and your jobs screen opens straight away. No waiting, no training course." },
  { title: "Businesses and hubs", text: "The Izza team looks at every business and Izza point first, and messages you on WhatsApp when you are approved." },
  { title: "Start", text: "Open your own screen and begin." },
];

export default function JoinPage() {
  return (
    <div className={styles.site}>
      <SiteHeader />
      <main>
        <div className={`${styles.wrap} ${styles.pageHead}`}>
          <h1>Grow with your neighbourhood</h1>
          <p>Izza runs on local people and local places. Pick how you would like to be part of it.</p>
        </div>

        <div className={`${styles.wrap} ${styles.joinGrid}`}>
          <section className={styles.joinCard}>
            <h2>Become a runner</h2>
            <ul className={styles.checks}>
              {["Deliver in the area you live in", "Paid for every drop, on the same day", "Support towards a licence and your own bike"].map((t) => (
                <li key={t}>
                  <Check size={22} weight="bold" aria-hidden="true" />
                  {t}
                </li>
              ))}
            </ul>
            <p className={styles.needs}>You will need an SA ID, a phone with WhatsApp, and to be 18 to 35.</p>
            <Link href="/signup?as=runner" className="btn">
              Apply to be a runner
            </Link>
          </section>

          <section className={`${styles.joinCard} ${styles.dark}`}>
            <h2>Host an Izza point</h2>
            <ul className={styles.checks}>
              {["Earn for every parcel you hold", "More people walking into your shop", "A simple screen to check parcels in and out"].map((t) => (
                <li key={t}>
                  <Check size={22} weight="bold" aria-hidden="true" />
                  {t}
                </li>
              ))}
            </ul>
            <p className={styles.needs}>
              For spaza shops, salons, pharmacies, petrol station shops and community halls. You need a smartphone and
              a little space for parcels the size of a shoe box.
            </p>
            <Link href="/signup?as=point" className="btn">
              Register your place
            </Link>
          </section>

          <section className={styles.joinCard}>
            <h2>Send parcels</h2>
            <ul className={styles.checks}>
              {["Pick a hub close to your customer", "They collect it, or we bring it to their door", "See every parcel, with a code for each one"].map((t) => (
                <li key={t}>
                  <Check size={22} weight="bold" aria-hidden="true" />
                  {t}
                </li>
              ))}
            </ul>
            <p className={styles.needs}>For township sellers, online shops and anyone who sells to people in the community.</p>
            <Link href="/signup?as=business" className="btn">
              Open a business account
            </Link>
          </section>
        </div>

        <div className={styles.wrap}>
          <div className={styles.sectionHead}>
            <h2>What happens next</h2>
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
      </main>
      <SiteFooter />
    </div>
  );
}
