import { Suspense } from "react";
import { notFound } from "next/navigation";
import AutoRefresh from "@/components/AutoRefresh";
import Shell from "@/components/Shell";
import { NO_RUNNER, etaOf, stepsOf } from "@/lib/parcels";
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

  return (
    <>
      <AutoRefresh />
      <section className="hero">
        <p className="greeting">Molo, {parcel.to}</p>
        <h1>{etaOf(parcel)}</h1>
        <p style={{ margin: 0 }}>
          <span className="mono">{parcel.code}</span>
          {parcel.runner !== NO_RUNNER && <> · {parcel.runner} has it</>}
        </p>
      </section>

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
