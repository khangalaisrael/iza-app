import { Check } from "@phosphor-icons/react/dist/ssr";
import type { Step } from "@/lib/parcels";

// When a step happened, in South African time: "14:32" today, "Yesterday 09:10", or "Mon 3 Nov, 16:05".
export function whenText(ms: number, now: number): string {
  const tz = "Africa/Johannesburg";
  const day = (t: number) => new Intl.DateTimeFormat("en-ZA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(t);
  const time = new Intl.DateTimeFormat("en-ZA", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).format(ms);
  if (day(ms) === day(now)) return time;
  if (day(ms) === day(now - 24 * 60 * 60 * 1000)) return `Yesterday ${time}`;
  return `${new Intl.DateTimeFormat("en-ZA", { timeZone: tz, weekday: "short", day: "numeric", month: "short" }).format(ms)}, ${time}`;
}

// A parcel's journey, drawn like a courier tracker: a circle for each step on one unbroken line, the step it is on now pulsing,
// and the time each finished step happened. Each step carries its own piece of the line, so the circles can never drift off it.
export default function Tracker({ steps, times, now }: { steps: Step[]; times: Partial<Record<number, number>>; now: number }) {
  const doneCount = steps.filter((s) => s.state === "done").length;
  return (
    <div className="tracker" aria-label="Parcel progress">
      <p className="trSummary" aria-live="polite">
        Step {Math.min(doneCount + (steps.some((s) => s.state === "now") ? 1 : 0), steps.length)} of {steps.length}
      </p>
      <ol className="trList">
        {steps.map((s, i) => {
          const at = times[s.stage];
          return (
            <li key={s.stage} className={`trStep tr-${s.state}`} aria-current={s.state === "now" ? "step" : undefined}>
              <div className="trRail" aria-hidden="true">
                <span className="trDot">{s.state === "done" ? <Check size={16} weight="bold" /> : null}</span>
                {i < steps.length - 1 && <span className="trLine" />}
              </div>
              <div className="trBody">
                <strong>{s.title}</strong>
                <small>{s.detail}</small>
                {at ? <time dateTime={new Date(at).toISOString()}>{whenText(at, now)}</time> : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
