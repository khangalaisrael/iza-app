# Izza operating playbook

Rules a logistics manager would expect, and where the app enforces them. The numbers live in `src/lib/rules.ts` so the team can change them in one place.

## Principles
1. **One owner at every moment.** A parcel is always held by exactly one party: sender, runner, or point. Every hand-over is recorded.
2. **Proof at every hand-over.** Code at the counter, 4-digit code at the door. No code, no hand-over.
3. **Nothing is silent.** Every status change writes a line the customer can read. Exceptions are never hidden.
4. **Exceptions first.** The manager's home screen leads with what is late or stuck, not with totals.
5. **Least data.** A runner sees what the job needs. A stranger sees where a parcel is, not who it is for.
6. **Failed delivery is normal.** A parcel nobody could deliver returns to the point, and the customer is told.

## Service rules (SLAs)
| Rule | Limit | What happens |
| --- | --- | --- |
| A job waits for a runner | 15 minutes | Shows under **Needs attention** with an Assign button |
| A parcel is sent to the hub by the sender and not received | 24 hours | Flagged, WhatsApp the sender |
| A parcel waits at a point, not collected | 3 days reminder, 7 days overdue | Point and team see the age, one tap to remind on WhatsApp |
| A runner is on the way | 60 minutes | Flagged as stalled |
| Wrong delivery code | 5 tries in 30 minutes | Blocked, logged |
| A problem or return in the last 24 hours | any | Shown to the team |

## Roles and what each may do
| Role | May | May not |
| --- | --- | --- |
| Customer | Track, choose collect or door, send a parcel to the hub | See other people's parcels |
| Business | Send, see own parcels | Take jobs, see others' parcels |
| Runner | See open jobs, accept, update, deliver with the code | Send parcels, see all parcels |
| Izza point | Receive, hand over, see own parcels | Hand over a door-delivery parcel |
| Team | Approve, assign runners, see everything | Nothing is hidden from the team |

## KPIs on the team dashboard
Active parcels, needing a runner, waiting at points, out for delivery, delivered today, returned today, average door trip time.

## Not built yet (be honest)
Payments, automatic WhatsApp messages (links only), proof-of-delivery photo, route batching, runner pay, SMS fallback.
