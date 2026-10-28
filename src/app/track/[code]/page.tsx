import { connection } from "next/server";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import AutoRefresh from "@/components/AutoRefresh";
import ChooseDelivery from "@/components/ChooseDelivery";
import EventFeed from "@/components/EventFeed";
import MapView from "@/components/MapView";
import Shell from "@/components/Shell";
import { currentUser } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import { etaMinutes } from "@/lib/geo";
import { FEE_DOOR_EXTRA, FEE_POINT, awaitingAddress, destinationOf, etaOf, runnerPositionOf, stepsOf, type Parcel } from "@/lib/parcels";
import { getPointById, type IzaPoint } from "@/lib/pointStore";
import { getParcel, hasPhoto, listEvents } from "@/lib/store";
import type { User } from "@/lib/users";

export default function ParcelPage({ params }: PageProps<"/track/[code]">) {
  return (
    <Shell title="Track" subtitle="Where is my parcel?">
      <Suspense fallback={<p className="muted">Finding your parcel…</p>}>
        <ParcelDetails params={params} />
      </Suspense>
    </Shell>
  );
}

// Anyone with a code can see where a parcel is. Only the people involved see who it is for and where it is going.
function canSeePrivate(user: User | null, p: Parcel, point?: IzaPoint): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (user.id === p.ownerId || user.id === p.runnerId) return true;
  if (p.recipientPhone && user.identifier === p.recipientPhone) return true;
  return user.role === "point" && !!point && point.ownerId === user.id;
}

function redact(p: Parcel): Parcel {
  return {
    ...p,
    to: "neighbour",
    pickup: "the sender",
    landmark: "",
    recipientPhone: undefined,
    lat: undefined,
    lng: undefined,
    plusCode: undefined,
    runnerLat: undefined,
    runnerLng: undefined,
    pickupLat: undefined,
    pickupLng: undefined,
    pickupPlusCode: undefined,
    note: undefined,
  };
}

async function ParcelDetails({ params }: { params: PageProps<"/track/[code]">["params"] }) {
  await connection();
  const { code } = await params;
  const found = await getParcel(decodeURIComponent(code));
  if (!found) notFound();

  const [point, events, photo] = await Promise.all([
    found.pointId ? getPointById(found.pointId) : undefined,
    listEvents(found.code),
    hasPhoto(found.code),
  ]);
  const [user, lang] = await Promise.all([currentUser(), getLang()]);
  const full = canSeePrivate(user, found, point);
  const parcel = full ? found : redact(found);

  const here = point ? { lat: point.lat, lng: point.lng } : undefined;
  const dest = destinationOf(parcel, here);
  const runnerPos = full && parcel.stage === 3 ? runnerPositionOf(parcel) : undefined;
  const headline = runnerPos ? t(lang, "About {min} min away", { min: etaMinutes(runnerPos, dest) }) : etaOf(parcel, lang);
  const showMap = parcel.stage >= 1 && parcel.stage < 4 && (full || parcel.choice !== "door");
  const canChoose = parcel.stage < 3;

  return (
    <>
      <AutoRefresh seconds={parcel.stage === 3 ? 2 : 5} />
      <section className="hero">
        <p className="greeting">{t(lang, "Molo, {name}", { name: parcel.to })}</p>
        <h1>{headline}</h1>
        <p style={{ margin: 0 }}>
          <span className="mono">{parcel.code}</span>
        </p>
      </section>

      {canChoose && awaitingAddress(parcel) && (
        <p className="lead" style={{ margin: 0 }}>
          {t(lang, "This parcel is being brought to your door. Tell us exactly where you are.")}
        </p>
      )}

      {canChoose && (
        <section className="card">
          <ChooseDelivery key={`${parcel.choice}-${parcel.stage}`} code={parcel.code} pointName={parcel.point} current={parcel.choice} lang={lang} />
        </section>
      )}

      <a
        className="btn btn-soft"
        href={`https://wa.me/?text=${encodeURIComponent(`Follow my Izza parcel ${parcel.code}: ${process.env.NEXT_PUBLIC_SITE_URL ?? "https://izza-app.vercel.app"}/track/${parcel.code}`)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        {t(lang, "Share this on WhatsApp")}
      </a>

      {parcel.choice === "door" && parcel.stage >= 2 && parcel.stage < 4 && parcel.deliveryPin && (
        <section className="card stack pinCard" aria-label="Your delivery code">
          <h2>{t(lang, "Your delivery code")}</h2>
          <div className="bigCode mono">{parcel.deliveryPin}</div>
          <p className="muted" style={{ margin: 0 }}>
            {t(lang, "Tell the runner this code at your door. Don't share it before they arrive.")}
          </p>
        </section>
      )}

      {full && (
        <section className="card stack" aria-label="Payment" style={{ gap: 8 }}>
          <h2>{t(lang, "Payment")}</h2>
          <div className="payRow">
            <span>{t(lang, "Sender's fee to the Izza point (R{fee})", { fee: FEE_POINT })}</span>
            <strong>{t(lang, parcel.paidAt ? "Paid" : "Not paid yet")}</strong>
          </div>
          {parcel.choice === "door" && (
            <div className="payRow">
              <span>{t(lang, "Door delivery extra (R{fee}), paid in cash to the runner", { fee: FEE_DOOR_EXTRA })}</span>
              <strong>{t(lang, parcel.doorPaidAt ? "Paid" : "Pay at your door")}</strong>
            </div>
          )}
          {parcel.choice === "point" && (
            <p className="muted" style={{ margin: 0 }}>
              {t(lang, "Collecting at the Izza point costs nothing extra.")}
            </p>
          )}
        </section>
      )}

      {showMap && (
        <MapView
          points={point ? [{ id: point.id, name: point.name, lat: point.lat, lng: point.lng }] : []}
          pin={parcel.choice === "door" ? dest : null}
          runner={runnerPos}
          center={runnerPos ?? dest}
          height={240}
        />
      )}

      {full && photo && parcel.stage >= 3 && (
        <section className="card stack" aria-label="Photo of your parcel">
          <h2>{t(lang, "Photo from the runner")}</h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/parcels/${parcel.code}/photo`} alt="Your parcel at the door" style={{ width: "100%", borderRadius: 12 }} />
        </section>
      )}

      <section className="card">
        {parcel.choice === "door" && parcel.landmark && (
          <p className="muted" style={{ margin: "0 0 12px" }}>
            {t(lang, "Bringing it to {place}", { place: parcel.landmark })}
          </p>
        )}
        {parcel.choice !== "door" && (
          <p className="muted" style={{ margin: "0 0 12px" }}>
            {t(lang, "Collect at {point}", { point: parcel.point })}
            {point ? t(lang, ", open {hours}", { hours: point.hours }) : ""}
          </p>
        )}
        {!full && (
          <p className="muted" style={{ margin: "0 0 12px" }}>
            <a href={`/signin?next=${encodeURIComponent(`/track/${parcel.code}`)}`} style={{ color: "var(--primary)", fontWeight: 700 }}>
              {t(lang, "Sign in")}
            </a>{" "}
            {t(lang, "to see more about this parcel.")}
          </p>
        )}
        <ol className="timeline">
          {stepsOf(parcel, lang).map((s) => (
            <li key={s.title} className={s.state}>
              <span className="dot" aria-hidden="true" />
              <div>
                <strong>{s.title}</strong>
                <small>{s.detail}</small>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <EventFeed events={events} title={t(lang, "Updates")} />
    </>
  );
}
