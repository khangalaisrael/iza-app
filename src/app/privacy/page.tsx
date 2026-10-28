import Shell from "@/components/Shell";

export const metadata = {
  title: "Privacy notice · Iza",
  description: "What Iza collects, why, who sees it, and how to ask us to change or delete it.",
};

// Written to match what the app actually does. If a feature changes what is collected, change this page too.
export default function PrivacyPage() {
  return (
    <Shell title="Privacy notice" subtitle="How we look after your details">
      <article className="stack" style={{ gap: 14 }}>
        <p className="lead">
          Iza is run by The Iza Collective (UCT MakersForge), Rondebosch, Cape Town. This is what we keep about you and why. We follow South
          Africa&apos;s Protection of Personal Information Act (POPIA).
        </p>

        <section className="card stack" style={{ gap: 6 }}>
          <h2>What we keep</h2>
          <ul>
            <li>
              <strong>Your account:</strong> your name, your phone number or email, and your password. The password is stored scrambled, so we
              cannot read it.
            </li>
            <li>
              <strong>A parcel:</strong> who it is for, their WhatsApp number, where it is collected from, the Iza point it goes to, and any note.
              If the customer chooses door delivery, also the address, landmark or map pin they give us.
            </li>
            <li>
              <strong>On a delivery:</strong> the runner&apos;s phone location while they are on the way to the door, a photo of the parcel at the
              door if the runner takes one, and a step-by-step record of what happened.
            </li>
            <li>
              <strong>Money:</strong> that a fee was paid in cash, who recorded it and when, and what a runner has earned and been paid.
            </li>
            <li>
              <strong>One cookie</strong> that keeps you signed in. We do not use advertising or tracking cookies.
            </li>
          </ul>
        </section>

        <section className="card stack" style={{ gap: 6 }}>
          <h2>Why we keep it</h2>
          <p style={{ margin: 0 }}>
            To get parcels from a sender to the Iza point and, if the customer wants, to their door; to let you follow your parcel; to pay
            runners fairly; and to sort out problems. We do not sell your details.
          </p>
        </section>

        <section className="card stack" style={{ gap: 6 }}>
          <h2>Who can see it</h2>
          <ul>
            <li>Anyone with a parcel code can see where the parcel is. They cannot see the name, number, address or photo.</li>
            <li>
              The sender, the Iza point, the runner on the job and the Iza team can see the details they need. A runner sees the customer&apos;s
              address and number only for the delivery they are doing.
            </li>
            <li>The delivery code is shown only to the customer. We never send it in a WhatsApp message.</li>
          </ul>
        </section>

        <section className="card stack" style={{ gap: 6 }}>
          <h2>Other services that handle it</h2>
          <p style={{ margin: 0 }}>
            We use Vercel and Neon to run the website and keep the database, map and routing services (Google Maps and OpenStreetMap-based
            routing) to show places and routes, and WhatsApp (Meta) to send parcel updates. These services receive only what they need to do
            that job, such as a place or a phone number.
          </p>
        </section>

        <section className="card stack" style={{ gap: 6 }}>
          <h2>Your rights</h2>
          <p style={{ margin: 0 }}>
            You can ask to see what we hold about you, to correct it, or to have it deleted. Message us on WhatsApp using the button on any page
            and we will answer. If you are not happy with how we handle your details, you can complain to the Information Regulator
            (inforegulator.org.za).
          </p>
        </section>

        <p className="muted">How long we keep parcel records: for as long as we run the service, or until you ask us to delete yours.</p>
      </article>
    </Shell>
  );
}
