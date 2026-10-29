import { MapPin, Storefront } from "@phosphor-icons/react/dist/ssr";
import { directionsUrl, openNow } from "@/lib/geo";
import type { IzaPoint } from "@/lib/pointStore";

// Everything someone needs when they go to collect: the code, big enough to read across a counter, where it is, whether it is open,
// that there is nothing to pay, and a button that opens directions in their phone's maps.
export default function CollectCard({ code, point, now }: { code: string; point: IzaPoint; now: number }) {
  const open = openNow(point.hours, new Date(now));
  return (
    <section className="card stack collectCard" aria-label="Collect your parcel">
      <h2>Collect your parcel</h2>
      <p className="muted" style={{ margin: 0 }}>
        Show this code at the counter. There is nothing to pay.
      </p>
      <div className="bigCode mono">{code}</div>
      <div className="collectPlace">
        <Storefront size={26} aria-hidden="true" />
        <div>
          <strong>{point.name}</strong>
          <span>{point.address}</span>
          <span>
            Open {point.hours}
            {open !== null && (
              <b className={open ? "openChip yes" : "openChip no"}>{open ? "Open now" : "Closed now"}</b>
            )}
          </span>
        </div>
      </div>
      <a className="btn btn-primary" href={directionsUrl(point)} target="_blank" rel="noopener noreferrer">
        <MapPin size={20} weight="bold" aria-hidden="true" /> Get directions
      </a>
    </section>
  );
}
