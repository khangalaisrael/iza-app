# How Izza works

Written from the design artifact (Monak/Izza App Mockup), Pargo's public pages and how other delivery
platforms split access by role. This is the reference the app is built to.

## The idea

A **business** (township seller, online shop) sends parcels to an **Izza point**: a trusted place in the
neighbourhood such as a tuckshop, spaza, salon or the Izza hub. The **customer** (the person the parcel is
for) then decides:

- **Collect at the Izza point.** R12 in total. They show their delivery code at the counter.
- **Bring it to my door.** R20 in total, which is R8 extra. A local runner brings it using the landmark or pin.

## Who uses it (roles)

| Role | Joins by | What they can do | What they cannot do |
| --- | --- | --- | --- |
| **Business** | Signs up, team approves | Book parcels to a point, see their own parcels | See other businesses' parcels, run jobs |
| **Customer** | Needs no account. A code from WhatsApp is enough. Can sign up to keep a list | See and choose collection or door delivery for their own parcels | Book, run jobs |
| **Runner** | Applies, team approves | See open jobs, accept one, share location, mark steps done | See parcels they have not taken beyond the job card, book |
| **Izza point** | Applies with the shop's name, place and hours, team approves | See parcels arriving at or waiting at their own shop, hand over by code | See other shops, run jobs |
| **Team (admin)** | Created by the owner | Approve runners, points and businesses; see everything | |

This follows how delivery platforms are built: separate screens per role, merchants and couriers approved
by the platform, customers self-service, and every role seeing only its own work.

## A parcel's journey

1. **Business books**: pick up from (typed, shared location or pin), who it is for (name and WhatsApp number),
   which Izza point, size, note for the runner. The customer gets a delivery code.
2. **A runner accepts** the collection job and picks the parcel up from the business.
3. **Runner drops it at the Izza point.** The point confirms.
4. **The customer chooses** collect or door.
   - Collect: they show the code at the point, the point hands over.
   - Door: the delivery appears as a new job for runners. A runner picks it up from the point and delivers it.
5. **Delivered**, with a code at the door or counter.

## Finding places

Wherever a place is asked for, a person can **type it** (suggestions appear as they type), **use their location**
(works on a computer too, and the map moves to where they are) or **drop a pin**.

## Pargo ideas used

- Ask first whether you are **collecting** or **sending**, then show points.
- A **map and a list** side by side, with distance and opening hours, and a clear "Choose this point".
- A friendly "**Become a point**" page: what you get (a fee for every parcel, more people through the door),
  what you need, one button.
- Businesses get their own entry ("I'm a business") separate from shoppers.
- Always a WhatsApp way to reach someone.

## Not built yet

Payments (the prices are shown but nobody is charged), WhatsApp messages (codes are shown on screen),
isiXhosa and Afrikaans, photos at pickup and delivery.
