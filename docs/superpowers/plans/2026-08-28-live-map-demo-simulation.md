# Live Map Demo Simulation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the live map look alive during the pitch without touching real data: 500
smoothly-moving simulated rider dots across Warsaw, plus a recurring "territory invasion" set
piece — every 15 minutes, 20 riders of a contrasting crew color appear one by one in a
district that belongs to a different color, then after they've been present for a minute the
district flips to their color.

**Scope decision (confirmed with user):** Purely client-side visual simulation — no DB writes,
no new API routes, no load on Neon, does not touch or depend on the real `seed:map-demo` data.
Everything here is pure TypeScript logic plus a rendering layer added to the existing
`LiveMap` MapLibre instance, gated behind a `?sim=1` query param so it never runs unless the
presenter turns it on.

**"Following routes" clarification:** There is no road-snapped routing engine in this stack
(no OSRM). "Following routes" means each simulated rider walks a sequence of randomly chosen
waypoints inside Warsaw's bounds, moving smoothly between them. A **new waypoint is chosen
every 3 seconds** (satisfies "changing coordinates every 3 seconds"); rendered position is
interpolated every animation tick between the current and next waypoint so 500 dots don't
visibly snap/jump, they glide.

**Invasion timing, spelled out:**
- `t=0s`: cycle starts, a target district is chosen (rotates through all 18 Warsaw districts
  each 15-minute cycle, reshuffling once exhausted so no repeats until every district has had a
  turn), and an invader color is picked that's visually distinct from the district's current
  fill color.
- `t=0s..20s`: the 20 invader riders appear one at a time, evenly spaced (~1 every second), each
  at a random point inside the target district's polygon.
- `t=20s..80s`: all 20 sit there, visibly a different color than the district they're standing
  on — this is the "wrong territory" beat.
- `t=80s` (60 seconds after the *last* invader appeared): the district's turf-war fill flips to
  the invader color. The invaders remain — they're now the local color too, blending in.
- The flipped district stays flipped; the next 15-minute cycle targets a different district.

**Tech stack:** Same as the rest of the app — TypeScript, React client component, MapLibre GL JS
(existing `LiveMap.tsx` map instance), Vitest for pure-logic unit tests, Playwright for one
opt-in visual smoke test. No new dependencies.

**Spec:** This plan; no changes to `docs/superpowers/specs/2026-08-28-ironcult-design.md` are
needed since nothing here touches the data model.

---

## Global Constraints

- Work on branch `phase5-live-map-demo-sim` off `main` (rebase onto whatever's merged from the
  two open map-demo-density / ranks-events-ui PRs first — this plan assumes `LiveMap.tsx`,
  `lib/map/district-colors.ts`, `lib/crew-color.ts`, and the Warsaw districts GeoJSON already
  exist as of PR #48/#54).
- Every GitHub issue for this plan uses label `phase:5`.
- Pure logic (waypoint math, invasion scheduling) lives in `lib/demo-sim/*` and must be
  independently unit-testable with Vitest fake timers — no MapLibre/DOM dependency in that layer.
- The simulation must be strictly additive and reversible: opt-in via `?sim=1`, doesn't touch
  `/api/presence`, `/api/events`, or `/api/turf-war`, doesn't write to Postgres, and turning the
  query param off (or reloading without it) must leave the real map exactly as it is today.
- Reuse existing helpers rather than duplicating: `crewColor()` / `DISTRICT_COLORS` /
  `districtColor()` for palette, `WARSAW_CENTER` and the Warsaw districts GeoJSON
  (`public/map/warsaw-districts.json`) for bounds, and the point-in-polygon logic already used by
  `findWarsawDistrict` in `lib/geo/voivodeship.ts` (reuse or lightly adapt rather than
  reimplementing polygon math from scratch).
- No Tailwind, no new npm dependencies. Use `app/globals.css` custom properties.
- Before every push, run the `security-review` skill (or, if Bash is unavailable in this
  environment as noted elsewhere in this repo's CLAUDE.md, manually review the diff — this
  feature has no auth/data surface so risk is inherently low, but still check for e.g. unbounded
  timers/intervals that could leak on unmount).
- Use PowerShell on Windows; git is not in PATH, use the GitHub Desktop bundled binary per
  CLAUDE.md.

---

## File Structure

- Create `lib/demo-sim/waypoints.ts`: pure functions — pick a random point in Warsaw bounds,
  pick a random point inside a given district polygon (rejection sampling against the existing
  point-in-polygon test), interpolate between two points given a progress fraction.
- Create `lib/demo-sim/simulated-riders.ts`: pure functions — generate the 500-rider population
  (id, color, current waypoint, next waypoint, waypoint-chosen-at timestamp), and a pure `step`
  function that, given the population and "now", returns updated positions (still-interpolating
  riders get a lerped position; riders whose 3-second window has elapsed get a freshly chosen
  next waypoint).
- Create `lib/demo-sim/invasion-schedule.ts`: pure functions/state machine — given a cycle start
  time, the list of districts, and "now", returns the current invasion phase
  (`idle | spawning | dwelling | flipped`), which riders should currently be visible (with
  their spawn-triggered positions), and whether the target district's fill should be overridden
  to the invader color yet.
- Create `components/DemoSimulationLayer.tsx`: a client component that, when mounted (only when
  `?sim=1` is present), owns the `requestAnimationFrame`/`setInterval` loop, calls the pure step
  functions, and imperatively adds/updates MapLibre markers on the map instance passed in from
  `LiveMap`, plus calls back into `LiveMap`'s turf-war fill override when a district flips.
- Modify `components/LiveMap.tsx`: read the `sim` search param, conditionally mount
  `DemoSimulationLayer` once the map is loaded, and accept a color override map for turf-war
  district fills (feeding the invasion layer's flip event into the existing `setData` turf-war
  source update) without altering the real turf-war fetch/render path when `sim` is off.
- Modify `app/globals.css`: reuse `.presence-dot` styling for simulated dots (no new classes
  needed if colors are set the same way via `--presence-color`), add a `.presence-dot-sim`
  modifier only if simulated dots need a smaller size for 500-at-once legibility.
- Create tests:
  - `tests/unit/demo-sim/waypoints.test.ts`
  - `tests/unit/demo-sim/simulated-riders.test.ts`
  - `tests/unit/demo-sim/invasion-schedule.test.ts`
  - `tests/e2e/live-map-demo-sim.spec.ts` (opt-in Playwright smoke test, `?sim=1`, mocked
    timers/short-circuited durations so it doesn't need to wait 15 real minutes)
- Create `docs/demo-map-sim-runbook.md`: how to turn it on at the venue (`?sim=1`), what to
  expect and when, how to turn it off / reset before/after a run-through.

---

### Task 1: Waypoint And Polygon-Sampling Helpers

**Files:**
- Create: `lib/demo-sim/waypoints.ts`
- Test: `tests/unit/demo-sim/waypoints.test.ts`

**Interfaces:**
- `randomPointInBounds(bounds: { north: number; south: number; east: number; west: number }): LatLon`
- `randomPointInDistrict(districtGeoJson: DistrictFeature): LatLon` — rejection-samples within
  the feature's bounding box, retrying against a reused point-in-polygon test until inside the
  polygon (cap retries, e.g. 50, falling back to the bbox center so it can never infinite-loop).
- `lerpLatLon(a: LatLon, b: LatLon, t: number): LatLon` — linear interpolation, `t` clamped to
  `[0, 1]`.

- [ ] **Step 1: Write failing tests**

Cover: `randomPointInBounds` always returns a point within the given bounds (property test over
many random seeds); `randomPointInDistrict` always returns a point that the reused
point-in-polygon test confirms is inside the district; `lerpLatLon` at `t=0` returns `a`, at
`t=1` returns `b`, at `t=0.5` returns the midpoint, and clamps out-of-range `t`.

- [ ] **Step 2: Implement**

Reuse the point-in-polygon primitive already backing `findWarsawDistrict` in
`lib/geo/voivodeship.ts` — either export it from there if it isn't already, or duplicate the
minimal ray-casting check only if extracting it would touch unrelated exports (judgment call for
the implementer, but check first before duplicating).

- [ ] **Step 3: Run verification**

```powershell
npx.cmd vitest run tests/unit/demo-sim/waypoints.test.ts
npx.cmd tsc --noEmit
```

- [ ] **Step 4: Commit**

```powershell
& $git add lib/demo-sim/waypoints.ts tests/unit/demo-sim/waypoints.test.ts
& $git commit -m "feat: waypoint and district-sampling helpers for demo sim (#ISSUE)"
```

---

### Task 2: 500-Rider Population And Movement Step Function

**Files:**
- Create: `lib/demo-sim/simulated-riders.ts`
- Test: `tests/unit/demo-sim/simulated-riders.test.ts`

**Interfaces:**
- `type SimRider = { id: string; color: string; from: LatLon; to: LatLon; waypointChosenAt: number }`
- `createSimulatedRiders(count: number, seed: number, districts: DistrictFeature[]): SimRider[]`
  — deterministic given `seed` (so tests are reproducible); assigns each rider a home district
  (weighted so most riders spawn/wander near one district matching a crew color, a minority as
  "guests" scattered elsewhere — reuse `crewColor`/`DISTRICT_COLORS` for the palette so simulated
  dots read as the same visual language as the real turf-war layer) and an initial `to` waypoint.
- `stepSimulatedRiders(riders: SimRider[], now: number, waypointIntervalMs = 3000): SimRider[]`
  — pure, returns a new array; any rider whose `now - waypointChosenAt >= waypointIntervalMs`
  gets `from = its current interpolated position`, a freshly sampled `to`, and
  `waypointChosenAt = now`; others pass through unchanged.
- `renderPosition(rider: SimRider, now: number, waypointIntervalMs = 3000): LatLon` — pure,
  computes the interpolated `t = clamp((now - waypointChosenAt) / waypointIntervalMs, 0, 1)` and
  calls `lerpLatLon`.

- [ ] **Step 1: Write failing tests**

Cover: `createSimulatedRiders` produces exactly `count` riders, all with valid colors and
in-bounds waypoints, and is deterministic for a fixed seed; `stepSimulatedRiders` only advances
riders past their 3-second window and leaves others' `from`/`to`/`waypointChosenAt` untouched;
`renderPosition` matches `lerpLatLon` at the right progress fraction and clamps beyond the
window instead of overshooting.

- [ ] **Step 2: Implement**

- [ ] **Step 3: Run verification**

```powershell
npx.cmd vitest run tests/unit/demo-sim/simulated-riders.test.ts
npx.cmd tsc --noEmit
```

- [ ] **Step 4: Commit**

```powershell
& $git add lib/demo-sim/simulated-riders.ts tests/unit/demo-sim/simulated-riders.test.ts
& $git commit -m "feat: 500-rider simulated population and movement step (#ISSUE)"
```

---

### Task 3: Invasion Cycle State Machine

**Files:**
- Create: `lib/demo-sim/invasion-schedule.ts`
- Test: `tests/unit/demo-sim/invasion-schedule.test.ts`

**Interfaces:**
- Constants: `CYCLE_MS = 15 * 60 * 1000`, `SPAWN_WINDOW_MS = 20 * 1000`,
  `DWELL_MS = 60 * 1000` (flip happens at `SPAWN_WINDOW_MS + DWELL_MS` after cycle start).
- `pickNextDistrict(history: string[], allDistrictNames: string[], randomSeed: number): string`
  — rotates through all districts before repeating; reshuffles (new random order) once the
  history covers every district.
- `type InvasionState = { districtName: string; invaderColor: string; phase: 'spawning' | 'dwelling' | 'flipped'; visibleInvaderCount: number; flipped: boolean }`
- `getInvasionState(cycleStartedAt: number, now: number, districtName: string, invaderColor: string): InvasionState`
  — pure function of elapsed time within the current cycle: `visibleInvaderCount` ramps from 0
  to 20 linearly across `SPAWN_WINDOW_MS`; `phase` is `'spawning'` until `SPAWN_WINDOW_MS`,
  `'dwelling'` until `SPAWN_WINDOW_MS + DWELL_MS`, then `'flipped'` (and stays `'flipped'` for
  the rest of the 15-minute cycle).
- `invaderPositions(districtName: string, districts: DistrictFeature[], count: number, cycleSeed: number): LatLon[]`
  — deterministic set of `count` random-in-district points for a given cycle (reuses
  `randomPointInDistrict` from Task 1), so the same 20 points are used for the whole cycle
  instead of re-randomizing every frame.

- [ ] **Step 1: Write failing tests**

Cover: `pickNextDistrict` never repeats before exhausting all districts, then can repeat only
after every district has appeared once; `getInvasionState` at `now = cycleStartedAt` returns
`phase: 'spawning'`, `visibleInvaderCount: 0`; at `now = cycleStartedAt + 10s` returns roughly 10
visible invaders; at `now = cycleStartedAt + 20s` returns `phase: 'dwelling'`,
`visibleInvaderCount: 20`; at `now = cycleStartedAt + 79s` still `dwelling`/`flipped: false`; at
`now = cycleStartedAt + 80s` returns `phase: 'flipped'`, `flipped: true`; stays `flipped` for the
remainder of the 15-minute cycle.

- [ ] **Step 2: Implement**

- [ ] **Step 3: Run verification**

```powershell
npx.cmd vitest run tests/unit/demo-sim/invasion-schedule.test.ts
npx.cmd tsc --noEmit
```

- [ ] **Step 4: Commit**

```powershell
& $git add lib/demo-sim/invasion-schedule.ts tests/unit/demo-sim/invasion-schedule.test.ts
& $git commit -m "feat: territory-invasion cycle state machine for demo sim (#ISSUE)"
```

---

### Task 4: Wire The Simulation Into The Live Map

**Files:**
- Create: `components/DemoSimulationLayer.tsx`
- Modify: `components/LiveMap.tsx`
- Modify: `app/globals.css` (only if 500-at-once legibility needs a smaller dot variant)
- Test: `tests/e2e/live-map-demo-sim.spec.ts`

**Interfaces:**
- `LiveMap` reads `useSearchParams().get('sim') === '1'` and, once `mapLoaded` is true, mounts
  `<DemoSimulationLayer map={mapRef.current} maplibregl={maplibreRef.current} districts={...} onDistrictFlip={(name, color) => ...} />`.
- `onDistrictFlip` merges into the existing turf-war `colored` GeoJSON's `fillColor` property for
  that district and calls the existing `source.setData(...)` path — the real turf-war fetch
  keeps running underneath and repaints every 30s regardless, so the override needs to be
  re-applied each turf-war refresh tick while a district is in the `flipped` invasion state (keep
  a small map of `{ districtName: overrideColor }` in `LiveMap` state, applied after the real
  owner-color computation each refresh).
- `DemoSimulationLayer` internally: on mount, calls `createSimulatedRiders(500, seed, districts)`
  once; runs a single `requestAnimationFrame` loop that on each tick calls
  `stepSimulatedRiders`, `renderPosition` for all 500, and `getInvasionState`/`invaderPositions`
  for the current cycle, then imperatively updates (not recreates) 500 + 20 MapLibre `Marker`
  instances' `setLngLat` — do not tear down and recreate 520 DOM markers every frame, that will
  visibly jank; create them once on mount and only move them.
- Cleanup: cancels the animation frame and removes all markers on unmount (mirrors the existing
  cleanup pattern already in `LiveMap.tsx`'s main effect).

- [ ] **Step 1: Write failing Playwright test**

`tests/e2e/live-map-demo-sim.spec.ts`: navigate to `/?sim=1`, wait for
`[data-testid="live-map"][data-map-loaded="true"]`, assert `.presence-dot-sim` (or whatever the
simulated-dot selector ends up being) has count 500, capture two position snapshots ~3.5s apart
for a handful of markers and assert at least some moved (proves the animation loop is running,
without asserting exact coordinates). To avoid a 15-minute real-time wait for the invasion
assertions, either expose a small dev-only override (e.g. `?sim=1&cycleMs=5000` shrinking
`CYCLE_MS`/`SPAWN_WINDOW_MS`/`DWELL_MS` proportionally when present) or keep the invasion-timing
assertions to the Task 3 unit tests only and just assert the invasion layer's DOM hooks exist in
this e2e test (implementer's call — prefer the time-scaling override if it's not much extra
code, since it lets a human also rehearse the full cycle in under a minute).

- [ ] **Step 2: Implement `DemoSimulationLayer` and wire it into `LiveMap`**

- [ ] **Step 3: Manual visual check**

Run dev server, open `/?sim=1`, confirm: 500 dots visibly gliding around Warsaw in crew colors,
majority clustered per-district matching that district's color; after enabling the time-scaling
override, watch one full mini-cycle end-to-end and confirm 20 dots of a contrasting color appear
one by one in a district, sit for the dwell period, then the district repaints to their color.

- [ ] **Step 4: Run verification**

```powershell
npx.cmd tsc --noEmit
npx.cmd playwright test tests/e2e/live-map-demo-sim.spec.ts tests/e2e/live-map.spec.ts tests/e2e/live-map-demo.spec.ts
```

- [ ] **Step 5: Commit**

```powershell
& $git add components/DemoSimulationLayer.tsx components/LiveMap.tsx app/globals.css tests/e2e/live-map-demo-sim.spec.ts
& $git commit -m "feat: wire 500-rider movement and territory-invasion sim into live map (#ISSUE)"
```

---

### Task 5: Demo Runbook

**Files:**
- Create: `docs/demo-map-sim-runbook.md`

**Interfaces:**
- Produces: a short doc — how to turn the simulation on (`https://ironcult.vercel.app/?sim=1`),
  what a judge/viewer should expect and roughly when (500 dots immediately, first invasion within
  15 minutes), how to rehearse a fast full cycle before the real pitch (the `cycleMs` override
  from Task 4 if implemented), and confirmation that turning it off (plain URL, no `sim` param)
  leaves the real map untouched.

- [ ] **Step 1: Write the runbook**
- [ ] **Step 2: Commit and push**

```powershell
& $git add docs/demo-map-sim-runbook.md
& $git commit -m "docs: demo simulation runbook (#ISSUE)"
& $git push -u origin phase5-live-map-demo-sim
gh pr create --base main --head phase5-live-map-demo-sim --title "Phase 5: live map demo simulation" --body "Closes #ISSUE"
```

---

## Self-Review

- **Spec coverage:** 500 moving dots changing waypoint every 3s (Task 2), smooth rendering
  between waypoints (Task 2/4), 15-minute recurring invasion of 20 riders appearing one by one
  over 20s (Task 3), district flips to invader color after they've been present for a minute
  (Task 3), all wired into the real map without touching real data (Task 4).
- **Scope control:** explicitly client-only and additive per the user's confirmed choice — no
  schema, no API changes, no risk to the real seeded demo data or the two other in-flight
  phase:5 branches. Reuses existing palette/geometry helpers instead of duplicating them.
- **Risk called out for the implementer:** 500 individually-managed MapLibre `Marker` instances
  each mutating the DOM every animation frame is the main performance risk — Task 4 explicitly
  requires moving existing markers rather than recreating them, and the implementer should
  profile with the browser's performance panel before considering the task done; if 500 native
  `Marker`s prove too slow, the fallback (documented here for handover, not built preemptively)
  is switching the simulated layer to a single MapLibre GL `symbol`/`circle` layer driven by one
  GeoJSON source updated per frame, which is dramatically cheaper than hundreds of DOM markers —
  don't reach for this unless the profiler shows it's needed.
- **Handoff:** each task is independently testable (pure-logic units for 1–3, one Playwright
  smoke test for 4, a doc for 5) and should become one GitHub issue labeled `phase:5` each,
  following this repo's acceptance-criteria-before-starting convention.
