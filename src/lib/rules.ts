// The operating rules in one place. See docs/logistics-playbook.md.
const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export const RULES = {
  jobWaitingMs: 15 * MIN, // a job nobody has accepted
  selfDropMs: 24 * HOUR, // a sender said they would bring it to the hub
  remindAtPointMs: 3 * DAY, // time to remind the customer
  overdueAtPointMs: 7 * DAY, // time to decide: return or recycle
  stalledTripMs: 60 * MIN, // a runner on the way for too long
  recentProblemMs: 24 * HOUR,
};

export function ageText(ms: number): string {
  const m = Math.max(0, Math.round(ms / MIN));
  if (m < 60) return `${m} min`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} h`;
  return `${Math.round(h / 24)} days`;
}
