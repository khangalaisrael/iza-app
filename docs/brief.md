# Iza build brief (v3)

This is the owner's latest instruction, restructured so it can be built and checked without guessing.

## Role
Act as a logistics lead for a township last-mile network, then as the CEO who reviews the result. Build for a logistics manager who is not the owner. The owner is not a logistics manager, so every rule below must be explained in plain words on screen or in docs.

## Parcel journeys (the only three)
1. **Sent to the hub, collected by the customer.** A business or a customer sends a parcel to an Iza point (the hub, a spaza, a salon, a hall). The customer collects it with their code. **No runner is used.**
2. **Sent to the hub, brought to the door.** The customer asks for door delivery (R20, R8 extra). A runner collects it **from the hub** and gives it to the customer.
3. **Sent from home to the hub.** A customer (or business) either **brings the parcel to the hub themselves**, or **asks a runner to collect it** from their home. When a customer sends a parcel to the hub, **the team is notified**.

## Runner trip (like Uber)
- Updates the runner can send: **Collected from hub**, **On the way to the customer**, **Arrived at the customer**, **Trip ended** (needs the customer's 4-digit code).
- Directions are shown **inside the website** on a map, with distance, time and turn-by-turn steps. No redirect to another app.
- A runner sees only work: open jobs, accept one, update the customer. **No Send tab.**

## Pickup points
- Any spaza, shop, salon or hall can apply to be a pickup point. The team approves it.
- A point confirms parcels it receives, hands over with the code, and sees what is waiting and for how long.

## Consistency rules for the interface
- Every page has the same top bar, then a page title row, then content. Nothing appears or disappears when you change tab or press a button.
- One main action per screen, always in the same place.
- Always leave empty space below the last button so the page can scroll.

## Messaging
- WhatsApp is offered everywhere a person needs to be told something (click-to-chat links, no automatic sending yet).

## Definition of done
- A logistics manager can see what needs attention now, who is carrying what, what is stuck, and can assign a runner.
- All tests pass and the live site matches.
