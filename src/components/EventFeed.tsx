import type { ParcelEvent } from "@/lib/store";

const time = (at: number) =>
  new Intl.DateTimeFormat("en-ZA", { timeZone: "Africa/Johannesburg", hour: "2-digit", minute: "2-digit", hour12: false }).format(at);

// What has happened to a parcel, newest first, in plain words. This is what customers and businesses read.
export default function EventFeed({ events, title = "Updates" }: { events: ParcelEvent[]; title?: string }) {
  // A wrong code being typed is for the team's records, not for the customer's screen.
  const shown = events.filter((e) => e.kind !== "pin_wrong");
  if (shown.length === 0) return null;
  return (
    <section className="card stack" style={{ gap: 10 }} aria-label={title}>
      <h2>{title}</h2>
      <ul className="feed">
        {shown.map((e) => (
          <li key={e.id} className={e.kind === "problem" || e.kind === "returned" ? "feedItem warn" : "feedItem"}>
            <span className="feedTime">{time(e.at)}</span>
            <span>{e.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
