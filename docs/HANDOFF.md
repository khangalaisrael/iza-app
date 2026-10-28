# Iza handoff

Paste this file into a new session to continue. Last updated 2026-10-28.

## What Iza is
A neighbourhood parcel network for Cape Town townships. Parcels go to an **Iza point** (the hub, a spaza, salon or hall). The person it is for collects it with a code, or asks for door delivery and a runner brings it.

## The three journeys
1. Sent to the hub, **collected by the customer**: no runner.
2. Sent to the hub, **door delivery** (R20, R8 extra): a runner collects from the hub and delivers with the customer's 4-digit code.
3. **Sent from home**: a customer or business brings it to the hub, or asks a runner to collect it. A parcel sent by a customer shows to the team as "New from a customer".

Stages: 0 Booked, 1 Picked up, 2 At the Iza point, 3 On the way, 4 Delivered. Fees: R12 collect, R20 door.

## Roles
customer, business, runner, point, admin. Business, runner and point sign-ups wait for admin approval. Customers need no account to track a parcel. A runner has no Send. Workers land in their own workspace after sign-in (`src/lib/roles.ts`, menu in `src/lib/nav.ts`).

## Where things are
- Live site: https://iza-app-israels-projects-71356823.vercel.app (auto-deploys from `main`)
- GitHub: khangalaisrael/iza-app (private)
- Vercel project `iza-app`, id `prj_5zERIB7n3VrRjJRXXsSlOuHTcjwK`, team `team_vnVgTr4nySuvdeftjl35slDx`
- Database: Neon Postgres `iza-db`. Locally the same SQL runs on PGlite in `data/pglite`.
- Admin account: khangalaisrael@gmail.com. Demo accounts only exist when `IZA_SEED_DEMO=1` (never on production).
- WhatsApp chat button number is set as `NEXT_PUBLIC_WHATSAPP_NUMBER` (Vercel and `.env.local`). It only shows after a rebuild.

## Code map
- `src/lib/`: `db.ts` (schema, seed), `store.ts` (parcels, events), `parcels.ts` (types, stages, fees), `rules.ts` (service limits), `nav.ts`, `roles.ts`, `auth.ts`, `users.ts`, `pointStore.ts`
- `src/app/api/parcels/route.ts` (book) and `[code]/route.ts` (actions: choose, collect, receive, assign, accept, release, update, problem, location, collected, dropped, pickup_from_point, deliver, return_to_point)
- Pages: `/` home, `/why`, `/business`, `/join`, `/send`, `/collect`, `/points`, `/track`, `/track/[code]`, `/runner`, `/runner/[code]`, `/point`, `/parcels`, `/ops`
- Frames: `SiteChrome.tsx` (top bar, footer), `Shell.tsx` and `PortalShell.tsx` (title row + content)
- Runner trip: `JobPanel.tsx` + `TripRoute.tsx` (in-page route using the free OSRM service)
- Team: `ops/page.tsx`, `AssignRunner.tsx`
- Docs: `brief.md`, `logistics-playbook.md`, `ceo-review.md`, `system.md`, `logistics.md`, `deploy.md`

## Run and test
```bash
npm run dev            # http://localhost:3000, needs .env.local
npx playwright test    # builds, serves on port 3100, 51 tests
```
Next.js here is v16 with breaking changes. Read `node_modules/next/dist/docs/` before changing framework code. Dynamic data must sit inside `<Suspense>`, and use `await connection()` before DB reads or `Date.now()`.

## Gotchas learned
- If `localhost:3100` is "already used", kill the leftover node process on that port.
- Disk space on C: has run out before; clear `.next` and npm cache.
- Git push from the Bash tool was blocked; push from the Terminal panel.
- A phone-height page needs empty space under the last button, or Playwright cannot click it.
- Do not read the production database without the user's permission.

## State at handoff
- Everything above is committed. Last feature commit `4c7716f`, then a small commit turning on the WhatsApp number.
- Tests: 51 total, all passed in the last runs (full suite once, then the four fixed ones again).
- Not checked by eye: the runner trip screen on a phone, and the live site after the last deploy.

## Not built yet
Payments, automatic WhatsApp messages (links only; needs Meta WhatsApp Business API), proof-of-delivery photo, runner pay, batching, point capacity and zones, isiXhosa and Afrikaans, offline mode, password reset, privacy notice, a paid routing service.
Still to do by the owner: add the first Iza point in `/ops` on the live site if none exists; restrict the Google Maps key to the site's address in Google Cloud.

## Next three things, in order
1. Payments for the sender.
2. Automatic WhatsApp updates.
3. Proof-of-delivery photo and runner earnings.
