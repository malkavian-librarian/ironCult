# The core loop: crews, turf war, and the live map

## The live map is the home screen

When you open ironCult, you don't see a feed or a menu. You see a **dark map of Warsaw** with colored district overlays and blinking dots — riders who are out right now. It's the first thing you see and the thing you come back to.

- **Presence dots:** riders who toggle "I'm riding" broadcast their location every 10 seconds. You see them pulsing on the map in real time, colored by crew.
- **Event pins:** happening-now meetups show as glowing markers. Tap one to see title, type, district, and how many riders are checked in nearby.
- **FlyerOne** is the larger red dot at the hackathon checkpoint — the demo anchor.

## Crews

Riders create or join a crew. A crew is your identity in the app — it colors your presence dot, it groups you on the leaderboard, and it's how you fight for turf.

- Create a crew (unique name), or join an existing one
- Crew leaderboard ranks crews by total route count
- Individual leaderboard ranks riders by their own route count
- Both leaderboards are visible side by side

## Turf war

This is the retention hook. Warsaw is split into **18 districts** (Srodmiescie, Praga, Mokotow, Wola, etc.). Each district is colored on the map by whichever crew has the **most logged routes** there.

- Log a route in Praga? Your crew gets +1 in Praga.
- If your crew has the most routes in a district, it's **your color** on the map.
- It's a straight count (highest wins), recomputed live — no score formula, no decay, no voting. Simple and competitive.
- Ties keep the first crew that reached the count.

## Routes and ratings

- Riders log routes by start/end coordinates. Voivodeship is derived server-side — you can't fake it.
- Rate any route 1–5 stars. Re-rating updates your score, doesn't duplicate it.
- More routes in a district = more turf for your crew. Rating quality creates social pressure to log good rides.

## Buddy finder and events

- **Buddy finder:** post "riding in Mazowieckie on Saturday" → browse others' posts filtered by region and date. No swipe UI — a filtered list that serves the purpose.
- **Events:** create and browse local rides/meetups (rally, trackday, bikenight, swapmeet). Filter by voivodeship and date. A yellow "happening now" badge shows when an event is live.

## Why this loop works

Crews give you identity. Routes give you currency. Turf war gives you a reason to keep riding and logging. The live map gives you a reason to open the app every day — not to plan a ride, but to see who's out and whether your district is still yours.
