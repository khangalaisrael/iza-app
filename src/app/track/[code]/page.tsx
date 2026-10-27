import { Suspense } from "react";
import { notFound } from "next/navigation";
import AutoRefresh from "@/components/AutoRefresh";
import MapView from "@/components/MapView";
import Shell from "@/components/Shell";
import { etaMinutes } from "@/lib/geo";
import { pointByName } from "@/lib/points";
import { NO_RUNNER, destinationOf, etaOf, runnerPositionOf, stepsOf } from "@/lib/parcels";
import { getParcel } from "@/lib/store";

export default function ParcelPage({ params }: PageProps<"/track/[code]">) {
  return (
    <Shell>
      <Suspense fallback={<p className="muted">Finding your parcel…</p>}>
        <ParcelDetails params={params} />
      </Suspense>
    </Shell>
  );
}

async function ParcelDetails({
  params,
}: {
  params: PageProps<"/track/[code]">["params"];
}) {
  const { code } = await params;
  const parcel = await getParcel(decodeURIComponent(code));
  if (!parcel) notFound();

  const dest = destinationOf(parcel);
  const runnerPos = parcel.stage === 3 ? runnerPositionOf(parcel) : undefined;
  const headline = runnerPos ? `About ${etaMinutes(runnerPos, dest)} min away` : etaOf(parcel);
  const point = pointByName(parcel.point);
  const showMap = parcel.stage >= 2 && parcel.stage < 4;

  return (
    <>
      <AutoRefresh seconds={parcel.stage === 3 ? 2 : 5} />
      <section className="hero">
        <p className="greeting">Molo, {parcel.to}</p>
        <h1>{headline}</h1>
        <p style={{ margin: 0 }}>
          <span className="mono">{parcel.code}</span>
          {parcel.runner !== NO_RUNNER && <> · {parcel.runner} has it</>}
        </p>
      </section>

      {showMap && (
        <MapView
          points={point ? [point] : []}
          pin={dest}
          runner={runnerPos}
          center={runnerPos ?? dest}
          height={240}
        />
      )}

      <section className="card">
        <p className="muted" style={{ margin: "0 0 12px", fontSize: 14 }}>
          Delivering to {parcel.landmark}
        </p>
        {parcel.plusCode && (
          <p className="mono muted" style={{ margin: "0 0 12px", fontSize: 13 }}>
            Pin: {parcel.plusCode}
          </p>
        )}
        <ol className="timeline">
          {stepsOf(parcel).map((s) => (
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
    </>
  );
}
