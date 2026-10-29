import { connection } from "next/server";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import AutoRefresh from "@/components/AutoRefresh";
import CancelButton from "@/components/CancelButton";
import ReceiveButton from "@/components/ReceiveButton";
import ChimeOnChange from "@/components/ChimeOnChange";
import ChooseDelivery from "@/components/ChooseDelivery";
import EventFeed from "@/components/EventFeed";
import LanguageLinks from "@/components/LanguageLinks";
import CollectCard from "@/components/CollectCard";
import LazyMap from "@/components/LazyMap";
import Tracker from "@/components/Tracker";
import NotifyButton from "@/components/NotifyButton";
import Shell from "@/components/Shell";
import { currentUser } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { getLang } from "@/lib/lang";
import { etaMinutes } from "@/lib/geo";
import { FEE_DOOR_EXTRA, FEE_POINT, destinationOf, etaOf, runnerPositionOf, stepsOf, type Parcel } from "@/lib/parcels";
import { getPointById, type IzaPoint } from "@/lib/pointStore";
import { ageText } from "@/lib/rules";
import { getParcel, hasPhoto, keyMatches, listEvents } from "@/lib/store";
import type { User } from "@/lib/users";

export default function ParcelPage({ params, searchParams }: PageProps<"/track/[code]">) {
  return (
    <Shell title="Track" subtitle="Where is my parcel?">
      <Suspense fallback={<p className="muted">Finding your parcel…</p>}>
        <ParcelDetails params={params} searchParams={searchParams} />
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

async function ParcelDetails({
  params,
  searchParams,
}: {
  params: PageProps<"/track/[code]">["params"];
  searchParams: PageProps<"/track/[code]">["searchParams"];
}) {
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
  // The short code on its own only shows where a parcel is. The key in the receiver's link (or being signed in as the person it
  // is addressed to) is what unlocks the delivery code and the choice, so a runner who knows the code cannot read the delivery code.
  const { k } = await searchParams;
  const key = Array.isArray(k) ? k[0] : k;
  const keyOk = keyMatches(found, key);
  const isReceiver = keyOk || user?.role === "admin" || (!!user && !!found.recipientPhone && user.identifier === found.recipientPhone);
  const isSender = !!user && (user.id === found.ownerId || user.role === "admin");
  const full = canSeePrivate(user, found, point) || keyOk;
  const parcel = full ? found : redact(found);
  const cancelled = !!parcel.cancelledAt;

  // When each step happened, from what was recorded. Newest first, so the first match is the latest.
  const now = Date.now();
  const at = (...kinds: string[]) => events.find((e) => kinds.includes(e.kind))?.at;
  const stageTimes: Partial<Record<number, number>> = {
    0: parcel.createdAt,
    1: at("collected"),
    2: at("dropped", "received"),
    3: at("picked_from_point"),
    4: at("delivered", "collected_by_customer"),
  };
  const latest = events.find((e) => e.kind !== "pin_wrong" && e.kind !== "sent_by_customer");

  const here = point ? { lat: point.lat, lng: point.lng } : undefined;
  const dest = destinationOf(parcel, here);
  const runnerPos = full && parcel.stage === 3 ? runnerPositionOf(parcel) : undefined;
  const headline = runnerPos ? t(lang, "About {min} min away", { min: etaMinutes(runnerPos, dest) }) : etaOf(parcel, lang);
  const showMap = parcel.stage >= 1 && parcel.stage < 4 && (full || parcel.choice !== "door");
  const canChoose = parcel.stage < 3 && !cancelled && isReceiver;

  return (
    <>
      <AutoRefresh seconds={parcel.stage === 3 ? 2 : 5} />
      <ChimeOnChange value={latest?.id} />
      <section className="hero">
        <p className="greeting">{t(lang, "Molo, {name}", { name: parcel.to })}</p>
        <h1>{headline}</h1>
        <p style={{ margin: 0 }}>
          <span className="mono">{parcel.code}</span>
        </p>
      </section>

      {cancelled && (
        <section className="card stack" role="status">
          <h2>{t(lang, "Cancelled")}</h2>
          <p style={{ margin: 0 }}>The sender cancelled this parcel. Nothing more will happen to it.</p>
        </section>
      )}

      {!isReceiver && !cancelled && parcel.stage < 4 && (
        <p className="muted" style={{ margin: 0 }}>
          Got a link from the sender? Open it to choose how you want your parcel and to see your delivery code.
        </p>
      )}

      {isReceiver && !cancelled && parcel.stage === 2 && parcel.choice === "point" && point && <CollectCard code={parcel.code} point={point} now={now} />}

      {canChoose && (
        <section className="card">
          <ChooseDelivery key={parcel.stage} code={parcel.code} pointName={parcel.point} current={parcel.choice} lang={lang} accessKey={keyOk ? key : undefined} landmark={parcel.choice === "door" ? parcel.landmark : undefined} lat={parcel.choice === "door" ? parcel.lat : undefined} lng={parcel.choice === "door" ? parcel.lng : undefined} />
        </section>
      )}

      <a
        className="btn btn-soft"
        href={`https://wa.me/?text=${encodeURIComponent(`Follow my Izza parcel ${parcel.code}: ${process.env.NEXT_PUBLIC_SITE_URL ?? "https://izza-app.vercel.app"}/track/${parcel.code}${keyOk ? `?k=${key}` : ""}`)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        {t(lang, "Share this on WhatsApp")}
      </a>

      {isReceiver && !cancelled && parcel.choice === "door" && parcel.stage >= 2 && parcel.stage < 4 && parcel.deliveryPin && (
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

      {full && parcel.stage === 3 && !cancelled && (
        <p className="muted" style={{ margin: 0 }} role="status">
          {runnerPos
            ? now - (parcel.updatedAt ?? now) < 20000
              ? "Your runner is live on the map."
              : `Your runner's location was last seen ${ageText(now - (parcel.updatedAt ?? now))} ago.`
            : "Your runner has not shared their location yet."}
        </p>
      )}

      {showMap && (
        <LazyMap
          auto={parcel.stage === 3}
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
          <img src={`/api/parcels/${parcel.code}/photo${keyOk ? `?k=${key}` : ""}`} alt="Your parcel at the door" style={{ width: "100%", borderRadius: 12 }} />
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
        {latest && (
          <div className="trLatest" role="status">
            <span>Latest update</span>
            <strong>{latest.text}</strong>
            <small>{ageText(now - latest.at)} ago</small>
          </div>
        )}
        <Tracker steps={stepsOf(parcel, lang)} times={stageTimes} now={now} />
      </section>
      {(isReceiver || isSender) && !cancelled && parcel.stage < 4 && <NotifyButton code={parcel.code} accessKey={keyOk ? key : undefined} />}
      {isSender && !cancelled && found.stage === 0 && found.dropoff === "self" && (
        <section className="card stack" aria-label="Handed in">
          <p style={{ margin: 0 }}>Has {parcel.point} got the parcel? Tell us, and a runner can carry on.</p>
          <ReceiveButton code={parcel.code} label={`It's at ${parcel.point}`} />
        </section>
      )}
      {isSender && !cancelled && found.stage === 0 && <CancelButton code={parcel.code} />}
      <EventFeed events={events} title={t(lang, "Updates")} />
      <LanguageLinks />
    </>
  );
}
