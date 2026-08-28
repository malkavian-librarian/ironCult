# Live Map Demo Simulation Runbook

## What this is

A purely client-side visual simulation layered onto the live map for the pitch. It does not
write anything to the database, does not call any real API beyond what the map already calls,
and does not touch the real seeded demo data (`seed:map-demo`) or real riders in any way.
Turning it off (loading the page without `?sim=1`) leaves the real map exactly as it is today.

## How to turn it on

Add `?sim=1` to the live map URL:

```
https://ironcult.vercel.app/?sim=1
```

## What to expect, and when

- **Immediately**: 500 small colored dots appear across Warsaw and start gliding — each dot
  picks a new nearby point roughly every 3 seconds and moves toward it smoothly (city-riding
  pace, not a teleport). Most dots cluster in their home district's color; a minority are
  "guest" riders scattered in other districts' colors.
- **Within 15 minutes** (and every 15 minutes after): a "territory invasion" cycle starts on a
  district that hasn't been targeted yet this rotation —
  1. Over the first **20 seconds**, 20 riders of a color that doesn't match the district's
     current fill appear one at a time in that district.
  2. They sit there for the next **60 seconds** — visibly the "wrong" color for that territory.
  3. **80 seconds** after the cycle started, the district's fill flips to their color. They stay
     — now they're the new local color, blending in.
  - The next cycle picks a different, not-yet-used district; once every district has had a turn
    it starts rotating again.

## Rehearsing a fast run-through before the pitch

Add `cycleMs` to shorten how soon each cycle rolls over to the next district, e.g. a 90-second
cycle so you don't wait 15 real minutes between invasions:

```
https://ironcult.vercel.app/?sim=1&cycleMs=90000
```

**Important**: the 20-second spawn and 60-second dwell always run at real speed regardless of
`cycleMs` — that's the part that has to look right during the actual pitch, so it's never sped
up. `cycleMs` only controls how soon after the flip the *next* district's cycle begins. Set it
to at least ~85000 (85s) if you want to see one full spawn→dwell→flip sequence without it
getting cut off by an early rollover; shorter values are fine if you just want to preview the
rider-movement layer quickly and don't care about watching a full invasion.

## Confirming the real map is unaffected

Load the plain URL with no `sim` param — no simulated dots, no district-color overrides, the
turf-war layer and presence markers work exactly as they did before this feature existed. The
simulation adds a component (`DemoSimulationLayer`) that only mounts when `sim=1` is present;
nothing it does touches `/api/presence`, `/api/events`, `/api/turf-war`, or Postgres.
