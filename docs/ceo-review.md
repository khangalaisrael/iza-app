# CEO review of Izza

A review of the app as it stood before this round, then what changed. Written to be blunt.

## Score before this round: 5.5 / 10

Good bones, wrong centre of gravity. It was a nice customer app with a runner screen bolted on. A logistics manager would not have trusted it.

### What was strong
- The parcel journey is understandable in one sentence.
- Delivery code at the door, and a failed delivery returns to the point.
- A runner cannot see or do things outside their job.
- Fees are clear.

### What a logistics manager would reject
1. **No exception queue.** The team page showed totals. Nobody could see "what is late right now".
2. **No dispatch.** The team could not give a job to a runner. Jobs only moved if a runner happened to look.
3. **A runner collected from every sender.** That is the most expensive leg and the one most likely to go wrong. The hub model should not need it unless the sender asks.
4. **No way for a customer to send.** Half of township parcels start at a home.
5. **Directions left the website.** A runner was thrown into another app mid-job, and the customer could not see progress.
6. **No clock.** Nothing measured how long a parcel sat, how long a job waited, or how long a trip took.
7. **Inconsistent screens.** Different headers, widths and button positions on different tabs. A person doing a job should never have to relearn the screen.
8. **Points were a black box.** A shop could not tell what was coming, what was overdue, or who to remind.
9. **No audit trail the manager could read.** Events existed but were buried per parcel.
10. **WhatsApp was an afterthought.** Links existed in a few places only.

### Pain points of the pickup points specifically
- They did not know a parcel was being brought in until it appeared.
- Nobody confirmed that a parcel the sender walked in had actually arrived.
- No age on a waiting parcel, so nothing told them it was getting stale.
- No easy way to nudge a customer who had not collected.
- A shop owner has other work. The screen must be one screen with large buttons.

## What changed in this round
- **Three clear journeys.** Collect at the hub needs no runner. Door delivery is a runner collecting from the hub. A sender can bring a parcel in themselves or ask for a runner.
- **Customers can send** from home to the hub. The team is told in the exception queue.
- **Points confirm receipt** with one button and see how long each parcel has waited, with a WhatsApp reminder.
- **Runner trip like Uber:** collected from the hub, on the way, arrived, end trip with the customer's code. Directions, distance, time and turn-by-turn inside the page.
- **Team dashboard rebuilt around exceptions:** seven numbers, a Needs attention list driven by the rules in the playbook, assign a runner, runner roster, latest activity.
- **One frame for every page:** same top bar, same title row, same widths, more room at the bottom.
- **WhatsApp:** share tracking, remind, message customer or sender, a floating chat button once the number is set.

## Score after this round: 7 / 10
It now behaves like a small dispatch system. It is not yet a business.

## What stops it being an 8 or 9
1. **Automatic notifications.** Everything is a tap to open WhatsApp. A real system messages by itself (WhatsApp Business API, which needs a Meta business account and a verified number).
2. **Payments.** Nobody can pay. This is the largest gap.
3. **Proof of delivery.** A code is good. A photo is better when a customer disputes it.
4. **Runner pay and settlement.** Runners need to see what they earned and when they are paid.
5. **Capacity and zones.** No limit on how many parcels a point can hold, no service areas.
6. **Batching.** One runner, one parcel. Real couriers group stops.
7. **Driving routes on a free service.** Directions use a free public routing service, good enough to start and not guaranteed. A paid routing key is the next step.
8. **Phone-only data.** No offline mode for weak signal.
9. **Languages.** isiXhosa and Afrikaans.
10. **Security hardening.** Rate limits on public tracking lookups, and a privacy notice.

## The next three things I would do, in order
1. Payments for the sender.
2. Automatic WhatsApp updates.
3. Proof-of-delivery photo and runner earnings.
