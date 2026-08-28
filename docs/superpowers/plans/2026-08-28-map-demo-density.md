# ironCult Map Demo Density Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the production live map read as a dark Warsaw biker demo: darker basemap, vivid district turf, five happening-now meetups, clustered blinking biker dots, and clickable event/rider cards.

**Architecture:** Keep this as a focused Phase 5 demo slice on top of the existing Next.js App Router app. Use the existing `events`, `riders`, `crews`, and `presence` tables; do not add a migration unless the implementing agent explicitly upgrades this from demo data to product data. Event check-in counts are derived from online presence dots within a short radius of each event. Rider card fields are composed from existing rider/profile fields plus deterministic demo avatar/color helpers.

**Tech Stack:** Next.js 16 App Router, TypeScript, Drizzle ORM, Neon Postgres, MapLibre GL JS, PMTiles, Vitest, Playwright, GitHub CLI.

**Spec:** `docs/superpowers/specs/2026-08-28-ironcult-design.md`

## Global Constraints

- Work on a feature branch, not `main`. Use `phase5-map-demo-density` unless the branch already exists.
- Every GitHub issue for this plan uses label `phase:5` and maps 1:1 to a task below.
- GitHub issue map:
  - Task 1 -> #42
  - Task 2 -> #46
  - Task 3 -> #45
  - Task 4 -> #44
  - Task 5 -> #43
- Before starting a task, confirm its GitHub issue has Acceptance Criteria with native GitHub checklist syntax.
- On completion of each task: run the named tests, check off the issue AC, post a pass/fail comment, close the issue, commit, push, and update the PR.
- Before every push, run the `security-review` skill. Fix CRITICAL/HIGH issues before pushing.
- Use PowerShell on Windows. Git is not in PATH on this machine; use `C:\Users\FlyerOne\AppData\Local\GitHubDesktop\app-3.5.11\resources\app\git\cmd\git.exe`.
- No Tailwind and no Google Fonts. Use `app/globals.css` CSS custom properties and the existing `.panel` visual language.
- Route handlers touching rider-owned data must call `requireAuth(req)` and derive rider identity server-side.
- `routes.voivodeship` and `routes.district` remain server-derived only; this plan does not change route creation.
- Do not delete real riders or crews in the demo seeder. The user requested clearing events; delete all `events`, but scope rider/crew/presence cleanup to demo records only.
- The hackathon event for this demo is `IronCult Hackathon Checkpoint` at Warsaw Presidential Hotel, coordinates `lat: 52.22769`, `lon: 21.00481`, based on the current Warsaw Glitch / hackathon venue context.

---

## File Structure

- Modify `lib/map/warsaw-style.ts`: darker basemap layer colors.
- Create `lib/map/district-colors.ts`: fixed high-contrast district color palette and helpers.
- Modify `components/LiveMap.tsx`: use district palette for turf, render event/rider markers with popups, derive check-ins, make FlyerOne larger/red.
- Modify `app/globals.css`: marker, popup, card, and opacity styling.
- Modify `app/api/events/route.ts`: include `district`, `districtColor`, and `checkedInCount` in GET response.
- Modify `app/api/presence/route.ts`: include rider card fields needed by the map.
- Create `lib/map/checkins.ts`: pure distance/check-in helpers shared by API tests and UI logic as needed.
- Create `lib/demo/rider-card.ts`: pure helpers for rank, club name, avatar URL, and demo rider color fallback.
- Create `scripts/seed-map-demo.ts`: clear events, seed five happening-now meetups, seed demo crews/riders/presence around each event.
- Create or modify tests:
  - `tests/unit/district-colors.test.ts`
  - `tests/unit/map/checkins.test.ts`
  - `tests/integration/events-map-details.test.ts`
  - `tests/integration/presence-rider-card.test.ts`
  - `tests/e2e/live-map-demo.spec.ts`

---

### Task 1: Dark Basemap And District Palette

**Files:**
- Modify: `lib/map/warsaw-style.ts`
- Create: `lib/map/district-colors.ts`
- Modify: `app/globals.css`
- Test: `tests/unit/district-colors.test.ts`
- Test: `tests/e2e/live-map.spec.ts`

**Interfaces:**
- Produces: `DISTRICT_COLORS: Record<string, string>` with explicit HSL strings for all 18 Warsaw districts.
- Produces: `districtColor(name: string | null | undefined): string`.
- Produces: `districtFillOpacity = 0.82` or higher in the turf-war layer.
- Consumes: Warsaw district names from `public/map/warsaw-districts.json`.

- [ ] **Step 1: Write failing unit test for complete district palette**

Create `tests/unit/district-colors.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import districts from '@/public/map/warsaw-districts.json';
import { DISTRICT_COLORS, districtColor } from '@/lib/map/district-colors';

type DistrictCollection = { features: Array<{ properties: { name: string } }> };

describe('district color palette', () => {
  it('has a named color for every Warsaw district', () => {
    const names = (districts as DistrictCollection).features.map((feature) => feature.properties.name);
    expect(Object.keys(DISTRICT_COLORS).sort()).toEqual([...names].sort());
  });

  it('uses visibly distinct colors and a neutral fallback', () => {
    const colors = Object.values(DISTRICT_COLORS);
    expect(new Set(colors).size).toBe(colors.length);
    expect(colors.every((color) => /^hsl\(\d+, \d+%, \d+%\)$/.test(color))).toBe(true);
    expect(districtColor('missing')).toBe('hsl(0, 0%, 26%)');
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npx.cmd vitest run tests/unit/district-colors.test.ts`

Expected: FAIL because `lib/map/district-colors.ts` does not exist.

- [ ] **Step 3: Implement fixed palette**

Create `lib/map/district-colors.ts`:

```typescript
export const DISTRICT_COLORS: Record<string, string> = {
  Bemowo: 'hsl(348, 86%, 50%)',
  Bialoleka: 'hsl(32, 92%, 48%)',
  Bielany: 'hsl(54, 92%, 48%)',
  Mokotow: 'hsl(139, 78%, 42%)',
  Ochota: 'hsl(176, 84%, 42%)',
  PragaPolnoc: 'hsl(198, 92%, 50%)',
  PragaPoludnie: 'hsl(218, 86%, 56%)',
  Rembertow: 'hsl(252, 82%, 62%)',
  Srodmiescie: 'hsl(286, 80%, 58%)',
  Targowek: 'hsl(314, 84%, 54%)',
  Ursus: 'hsl(12, 86%, 54%)',
  Ursynow: 'hsl(88, 78%, 44%)',
  Wawer: 'hsl(158, 82%, 38%)',
  Wesola: 'hsl(186, 78%, 50%)',
  Wilanow: 'hsl(232, 88%, 62%)',
  Wlochy: 'hsl(272, 80%, 55%)',
  Wola: 'hsl(336, 88%, 56%)',
  Zoliborz: 'hsl(44, 94%, 52%)',
};

export function districtColor(name: string | null | undefined): string {
  if (!name) return 'hsl(0, 0%, 26%)';
  return DISTRICT_COLORS[name] ?? 'hsl(0, 0%, 26%)';
}
```

- [ ] **Step 4: Darken the basemap**

In `lib/map/warsaw-style.ts`, change the visual values only:

```typescript
{ id: 'background', type: 'background', paint: { 'background-color': '#050505' } }
```

Use this target palette for existing layers:

```typescript
earth: '#151515'
landuse park/forest/grass: '#1d241f'
landuse industrial/commercial: '#241f20'
landuse fallback: '#181818'
water: '#101820'
boundaries: '#5b5650' with line-opacity 0.34
minor-roads: '#3c3933'
major-roads-casing: '#090909'
major-roads: '#70695e'
buildings: '#24211e'
building outline: '#3d3832'
```

Keep the local PMTiles source URL and bounds unchanged.

- [ ] **Step 5: Increase district opacity**

In `components/LiveMap.tsx`, update the turf layer paint:

```typescript
paint: { 'fill-color': ['get', 'fillColor'], 'fill-opacity': 0.84 }
```

Use `districtColor(f.properties.name as string)` for fallback district fills when there is no crew owner. If owner colors remain for turf ownership, mix them only for owned districts and keep all district colors visually distinct.

- [ ] **Step 6: Run verification**

Run:

```powershell
npx.cmd vitest run tests/unit/district-colors.test.ts tests/unit/warsaw-basemap.test.ts
npx.cmd tsc --noEmit
npx.cmd playwright test tests/e2e/live-map.spec.ts
```

Expected: all pass. If Playwright tries to start a dev server on a busy port, use the existing-server config pattern from the previous map work.

- [ ] **Step 7: Commit**

```powershell
& $git add lib/map/warsaw-style.ts lib/map/district-colors.ts app/globals.css components/LiveMap.tsx tests/unit/district-colors.test.ts tests/e2e/live-map.spec.ts
& $git commit -m "style: darken Warsaw map and district fills (#ISSUE)"
```

---

### Task 2: Event And Presence Detail API Contracts

**Files:**
- Create: `lib/map/checkins.ts`
- Create: `lib/demo/rider-card.ts`
- Modify: `app/api/events/route.ts`
- Modify: `app/api/presence/route.ts`
- Test: `tests/unit/map/checkins.test.ts`
- Test: `tests/integration/events-map-details.test.ts`
- Test: `tests/integration/presence-rider-card.test.ts`

**Interfaces:**
- Produces: `distanceMeters(a: LatLon, b: LatLon): number`.
- Produces: `countNearbyRiders(event: LatLon, riders: LatLon[], radiusMeters?: number): number`, default radius `220`.
- `GET /api/events` includes `district: string | null`, `districtColor: string`, `checkedInCount: number`, and existing `happeningNow`.
- `GET /api/presence` includes `motorcycle`, `rank`, `clubName`, `avatarUrl`, `isCurrentDemoUser`, and `markerColor`.
- No auth is added to public GET routes.

- [ ] **Step 1: Write failing check-in unit test**

Create `tests/unit/map/checkins.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { countNearbyRiders, distanceMeters } from '@/lib/map/checkins';

describe('map check-in helpers', () => {
  it('measures close Warsaw points under the event radius', () => {
    const event = { lat: 52.22769, lon: 21.00481 };
    const rider = { lat: 52.228, lon: 21.005 };
    expect(distanceMeters(event, rider)).toBeLessThan(50);
  });

  it('counts riders inside 220 meters and excludes farther riders', () => {
    const event = { lat: 52.22769, lon: 21.00481 };
    const riders = [
      { lat: 52.228, lon: 21.005 },
      { lat: 52.2271, lon: 21.0042 },
      { lat: 52.238, lon: 21.02 },
    ];
    expect(countNearbyRiders(event, riders)).toBe(2);
  });
});
```

- [ ] **Step 2: Implement helpers**

Create `lib/map/checkins.ts`:

```typescript
export type LatLon = { lat: number; lon: number };

export function distanceMeters(a: LatLon, b: LatLon): number {
  const earthMeters = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * earthMeters * Math.asin(Math.sqrt(h));
}

export function countNearbyRiders(event: LatLon, riders: LatLon[], radiusMeters = 220): number {
  return riders.filter((rider) => distanceMeters(event, rider) <= radiusMeters).length;
}
```

- [ ] **Step 3: Add rider card helper**

Create `lib/demo/rider-card.ts`:

```typescript
import { crewColor } from '@/lib/crew-color';

type RiderCardInput = {
  riderId: string;
  displayName: string;
  crewId: string | null;
  crewName: string | null;
  motorcycle: string | null;
  experience: string | null;
  style: string | null;
};

export function riderRank(experience: string | null): string {
  if (experience?.toLowerCase().includes('founder')) return 'Founder';
  if (experience?.toLowerCase().includes('captain')) return 'Road Captain';
  if (experience?.toLowerCase().includes('prospect')) return 'Prospect';
  return 'Rider';
}

export function riderAvatarUrl(displayName: string, markerColor: string): string {
  const initials = displayName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="#080808"/><circle cx="48" cy="48" r="36" fill="${markerColor}"/><text x="48" y="56" text-anchor="middle" font-family="Arial" font-size="24" font-weight="800" fill="#f3efe6">${initials}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function riderCard(row: RiderCardInput) {
  const isCurrentDemoUser = row.displayName.toLowerCase() === 'flyerone';
  const markerColor = isCurrentDemoUser ? 'hsl(5, 92%, 54%)' : crewColor(row.crewId);
  return {
    rank: riderRank(row.experience),
    clubName: row.crewName ?? 'Guest rider',
    motorcycle: row.motorcycle ?? 'Motorcycle not set',
    avatarUrl: riderAvatarUrl(row.displayName, markerColor),
    markerColor,
    isCurrentDemoUser,
  };
}
```

- [ ] **Step 4: Extend `GET /api/events`**

Use existing `findWarsawDistrict` from `@/lib/geo/voivodeship`, `districtColor`, and `countNearbyRiders`. Fetch online presence rows in the same route. Add fields to each event response:

```typescript
{
  ...event,
  happeningNow: isHappeningNow(event.startsAt),
  district,
  districtColor: districtColor(district),
  checkedInCount: countNearbyRiders({ lat: event.lat, lon: event.lon }, onlinePresenceRows),
}
```

Do not trust client-provided district data; derive it from event coordinates.

- [ ] **Step 5: Extend `GET /api/presence`**

Add select fields from `riders`: `motorcycle`, `experience`, `style`, `bio`, `pace`, `language`. Map each row through `riderCard(row)` and include:

```typescript
{
  riderId,
  displayName,
  lat,
  lon,
  crewId,
  crewName,
  motorcycle,
  rank,
  clubName,
  avatarUrl,
  markerColor,
  isCurrentDemoUser,
}
```

- [ ] **Step 6: Write integration tests**

`tests/integration/events-map-details.test.ts` must create an event at `52.22769, 21.00481`, ping two presence rows nearby and one far away, then assert `checkedInCount: 2`, `district` is not null, `districtColor` matches `/^hsl/`, and `happeningNow: true`.

`tests/integration/presence-rider-card.test.ts` must register a rider named `FlyerOne`, set `motorcycle: 'Triumph Bonneville T120'`, join/create `Iron Cult`, ping presence, then assert the presence row includes `isCurrentDemoUser: true`, `markerColor: 'hsl(5, 92%, 54%)'`, `clubName: 'Iron Cult'`, `motorcycle`, `rank`, `avatarUrl`, and `riderId`.

- [ ] **Step 7: Run verification**

Run:

```powershell
npx.cmd vitest run tests/unit/map/checkins.test.ts tests/integration/events-map-details.test.ts tests/integration/presence-rider-card.test.ts
npx.cmd tsc --noEmit
```

- [ ] **Step 8: Commit**

```powershell
& $git add lib/map/checkins.ts lib/demo/rider-card.ts app/api/events/route.ts app/api/presence/route.ts tests/unit/map/checkins.test.ts tests/integration/events-map-details.test.ts tests/integration/presence-rider-card.test.ts
& $git commit -m "feat: expose map event and rider details (#ISSUE)"
```

---

### Task 3: Interactive Map Event And Rider Cards

**Files:**
- Modify: `components/LiveMap.tsx`
- Modify: `app/globals.css`
- Test: `tests/e2e/live-map-demo.spec.ts`

**Interfaces:**
- Consumes: event rows from Task 2 with `district`, `districtColor`, `checkedInCount`.
- Consumes: presence rows from Task 2 with `avatarUrl`, `rank`, `clubName`, `motorcycle`, `markerColor`, `isCurrentDemoUser`.
- Produces: event markers with class `.event-marker` and `data-event-id`.
- Produces: biker markers with class `.presence-dot`, `data-rider-id`, `data-crew-id`, and `data-current-demo-user`.
- Produces: event popup/card with `[data-testid="event-card"]`.
- Produces: rider popup/card with `[data-testid="rider-card"]`.

- [ ] **Step 1: Write failing Playwright test**

Create `tests/e2e/live-map-demo.spec.ts`:

```typescript
import { expect, test } from '@playwright/test';

test('map event and biker markers open detail cards', async ({ page }) => {
  await page.route('**/api/events', (route) => route.fulfill({
    json: [{
      id: 'event-hackathon',
      title: 'IronCult Hackathon Checkpoint',
      type: 'hackathon',
      lat: 52.22769,
      lon: 21.00481,
      happeningNow: true,
      district: 'Srodmiescie',
      districtColor: 'hsl(286, 80%, 58%)',
      checkedInCount: 7,
    }],
  }));
  await page.route('**/api/presence', (route) => route.fulfill({
    json: [{
      riderId: 'flyerone-demo',
      displayName: 'FlyerOne',
      lat: 52.22795,
      lon: 21.00495,
      crewId: 'iron-cult',
      crewName: 'Iron Cult',
      motorcycle: 'Triumph Bonneville T120',
      rank: 'Founder',
      clubName: 'Iron Cult',
      avatarUrl: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22/%3E',
      markerColor: 'hsl(5, 92%, 54%)',
      isCurrentDemoUser: true,
    }],
  }));
  await page.route('**/api/turf-war', (route) => route.fulfill({ json: {} }));

  await page.goto('/');
  await expect(page.locator('[data-testid="live-map"]')).toHaveAttribute('data-map-loaded', 'true', { timeout: 15000 });

  await page.locator('[data-event-id="event-hackathon"]').click();
  await expect(page.locator('[data-testid="event-card"]')).toContainText('IronCult Hackathon Checkpoint');
  await expect(page.locator('[data-testid="event-card"]')).toContainText('7 riders');

  const flyer = page.locator('[data-rider-id="flyerone-demo"]');
  await expect(flyer).toHaveAttribute('data-current-demo-user', 'true');
  await flyer.click();
  await expect(page.locator('[data-testid="rider-card"]')).toContainText('FlyerOne');
  await expect(page.locator('[data-testid="rider-card"]')).toContainText('Founder');
  await expect(page.locator('[data-testid="rider-card"]')).toContainText('Iron Cult');
  await expect(page.locator('[data-testid="rider-card"]')).toContainText('Triumph Bonneville T120');
});
```

- [ ] **Step 2: Refactor marker creation into focused helpers**

In `components/LiveMap.tsx`, add local helper functions:

```typescript
function createRiderMarkerElement(rider: PresenceRow): HTMLButtonElement
function createEventMarkerElement(event: EventRow): HTMLButtonElement
function riderPopupHtml(rider: PresenceRow): string
function eventPopupHtml(event: EventRow): string
```

Use `button` elements for keyboard accessibility. Set `aria-label` to `Open rider details for ${displayName}` or `Open event details for ${title}`.

- [ ] **Step 3: Implement rider marker and popup**

Rider marker requirements:

```typescript
el.className = rider.isCurrentDemoUser ? 'presence-dot presence-dot-self' : 'presence-dot';
el.dataset.riderId = rider.riderId;
el.dataset.crewId = rider.crewId ?? 'guest';
el.dataset.currentDemoUser = rider.isCurrentDemoUser ? 'true' : 'false';
el.style.setProperty('--presence-color', rider.markerColor);
```

Popup HTML must include:

```html
<article data-testid="rider-card" class="map-card rider-card">
  <img alt="" src="...avatarUrl..." />
  <p class="map-card-kicker">rank - clubName</p>
  <h3>displayName</h3>
  <dl>
    <dt>ID</dt><dd>riderId</dd>
    <dt>Motorcycle</dt><dd>motorcycle</dd>
  </dl>
</article>
```

- [ ] **Step 4: Implement event marker and popup**

Event marker requirements:

```typescript
el.className = event.happeningNow ? 'event-marker event-marker-live' : 'event-marker';
el.dataset.eventId = event.id;
el.style.setProperty('--event-color', event.districtColor);
```

Popup HTML must include:

```html
<article data-testid="event-card" class="map-card event-card">
  <p class="map-card-kicker">district - happening now</p>
  <h3>title</h3>
  <dl>
    <dt>Type</dt><dd>type</dd>
    <dt>Checked in</dt><dd>checkedInCount riders</dd>
  </dl>
</article>
```

- [ ] **Step 5: Add CSS**

In `app/globals.css`, add:

```css
.presence-dot,
.event-marker {
  border: 0;
  cursor: pointer;
}

.presence-dot-self {
  width: 30px;
  height: 30px;
  border-width: 3px;
  z-index: 2;
}

.event-marker {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  background: var(--event-color);
  box-shadow: 0 0 0 2px var(--paper), 0 0 22px color-mix(in srgb, var(--event-color) 72%, transparent);
}

.event-marker-live {
  animation: presence-pulse 1.2s ease-out infinite;
}

.map-card {
  width: min(260px, 78vw);
  color: var(--paper);
  background: #080807;
}

.map-card img {
  width: 56px;
  height: 56px;
  object-fit: cover;
  border-radius: 6px;
}

.map-card h3 {
  margin: 0.2rem 0 0.5rem;
}

.map-card-kicker {
  margin: 0;
  color: var(--mist);
  font-size: 0.72rem;
  text-transform: uppercase;
}
```

Make sure popup text does not overflow on Pixel 7.

- [ ] **Step 6: Run verification**

Run:

```powershell
npx.cmd playwright test tests/e2e/live-map-demo.spec.ts tests/e2e/live-map.spec.ts
npx.cmd tsc --noEmit
```

- [ ] **Step 7: Commit**

```powershell
& $git add components/LiveMap.tsx app/globals.css tests/e2e/live-map-demo.spec.ts
& $git commit -m "feat: add interactive map rider and event cards (#ISSUE)"
```

---

### Task 4: Seed Happening-Now Demo Events And Bikers

**Files:**
- Create: `scripts/seed-map-demo.ts`
- Modify: `package.json`
- Test: `tests/integration/seed-map-demo.test.ts` or a documented one-off verification command if test isolation is too risky for production data.

**Interfaces:**
- Produces: npm script `seed:map-demo`.
- Clears all rows from `events`.
- Deletes only previous demo presence/rider records matching emails ending in `@demo.ironcult.local`.
- Creates or reuses demo crews: `Iron Cult`, `Srodmiescie Pistons`, `Praga Night Shift`, `Mokotow Carb Unit`, `Wola Sparks`, `Guest Nomads`, `Guest Vistula`.
- Creates 5 happening-now events with exact coordinates below.
- Creates 3-10 online presence dots within 220 meters of each event.
- Creates at least one guest rider from another club near each event.
- Creates `FlyerOne` at the hackathon event, with red marker color via `isCurrentDemoUser`.

**Seed events:**

```typescript
const DEMO_EVENTS = [
  {
    title: 'IronCult Hackathon Checkpoint',
    type: 'hackathon',
    lat: 52.22769,
    lon: 21.00481,
    district: 'Srodmiescie',
    riderCount: 9,
  },
  {
    title: 'Koneser Bike Night',
    type: 'bikenight',
    lat: 52.254444,
    lon: 21.043889,
    district: 'PragaPolnoc',
    riderCount: 7,
  },
  {
    title: 'Oczki After Ride',
    type: 'bikenight',
    lat: 52.2243525,
    lon: 21.0019246,
    district: 'Ochota',
    riderCount: 5,
  },
  {
    title: 'National Stadium Throttle Meet',
    type: 'meetup',
    lat: 52.2394,
    lon: 21.0456,
    district: 'PragaPoludnie',
    riderCount: 6,
  },
  {
    title: 'Pole Mokotowskie Night Loop',
    type: 'meetup',
    lat: 52.2109,
    lon: 21.0053,
    district: 'Mokotow',
    riderCount: 4,
  },
];
```

- [ ] **Step 1: Write the seeder**

Use Drizzle `db`, schema tables, and `hashPassword('hunter22')`. Make `startsAt` `new Date(Date.now() - 15 * 60 * 1000)` for all seeded events so `happeningNow` is true.

Use deterministic offsets:

```typescript
function offsetAround(center: { lat: number; lon: number }, index: number) {
  const ring = 0.00045 + (index % 3) * 0.00018;
  const angle = (index * 137.5 * Math.PI) / 180;
  return {
    lat: center.lat + Math.sin(angle) * ring,
    lon: center.lon + Math.cos(angle) * ring,
  };
}
```

Seed rider records with:

```typescript
{
  email: `map-demo-${slug}-${index}@demo.ironcult.local`,
  passwordHash,
  displayName,
  motorcycle,
  style,
  experience,
  pace,
  language: 'pl/en',
  crewId,
}
```

Use `experience` values that map to ranks from Task 2: `Founder`, `Road Captain`, `Prospect`, `Rider`.

- [ ] **Step 2: Preserve real users**

Cleanup must use scoped predicates:

```typescript
await db.delete(presence).where(inArray(presence.riderId, demoRiderIds));
await db.delete(riders).where(like(riders.email, '%@demo.ironcult.local'));
await db.delete(events);
```

Do not delete non-demo riders or crews.

- [ ] **Step 3: Add npm script**

In `package.json`:

```json
"seed:map-demo": "tsx scripts/seed-map-demo.ts"
```

- [ ] **Step 4: Run seeder locally**

Run:

```powershell
npm.cmd run seed:map-demo
```

Expected output:

```text
Seeded 5 events and 31 demo riders for the live map.
Hackathon anchor: FlyerOne at 52.22769, 21.00481
```

- [ ] **Step 5: Verify through APIs**

Run:

```powershell
curl.exe https://ironcult.vercel.app/api/events
curl.exe https://ironcult.vercel.app/api/presence
```

For local verification, use localhost. For production seeding, only run against the production database once the code is deployed and the user explicitly approves.

- [ ] **Step 6: Commit**

```powershell
& $git add scripts/seed-map-demo.ts package.json package-lock.json
& $git commit -m "chore: add live map demo seeder (#ISSUE)"
```

---

### Task 5: Production Verification And Demo Handoff

**Files:**
- Modify: `tests/e2e/live-map-demo.spec.ts`
- Optional create: `docs/demo-map-runbook.md`

**Interfaces:**
- Produces: a repeatable verification command against production.
- Produces: a short runbook with seed command, expected visible demo state, and rollback notes.
- Confirms production homepage shows dark basemap, high-opacity distinct district colors, five event markers, 31+ rider dots, `FlyerOne` larger/red at the hackathon, and clickable cards.

- [ ] **Step 1: Add production-safe e2e expectations**

Extend `tests/e2e/live-map-demo.spec.ts` with a non-mutating production-compatible test:

```typescript
test('production seeded map shows demo density', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-testid="live-map"]')).toHaveAttribute('data-basemap-loaded', 'true', { timeout: 20000 });
  await expect(page.locator('[data-testid="live-map"]')).toHaveAttribute('data-turf-loaded', 'true', { timeout: 20000 });
  await expect(page.locator('[data-event-id]')).toHaveCount(5, { timeout: 20000 });
  await expect(page.locator('[data-rider-id]')).toHaveCount(31, { timeout: 20000 });
  await expect(page.locator('[data-rider-id="flyerone-demo"]')).toHaveAttribute('data-current-demo-user', 'true');
});
```

If real production can contain additional riders, change the rider assertion to `toHaveCount` only in mocked tests and use `expect(await locator.count()).toBeGreaterThanOrEqual(31)` in production config.

- [ ] **Step 2: Add runbook**

Create `docs/demo-map-runbook.md`:

```markdown
# Live Map Demo Runbook

## Seed

Run after deploying the Phase 5 map demo branch and after explicit user approval:

```powershell
npm.cmd run seed:map-demo
```

## Expected State

- Production homepage uses the dark Warsaw basemap.
- District turf fills are vivid and high-opacity.
- Five happening-now event markers are visible in Warsaw.
- Each event has 3-10 blinking biker dots nearby.
- FlyerOne is the larger red biker dot at IronCult Hackathon Checkpoint.
- Clicking an event opens title/type/district/checked-in riders.
- Clicking a rider opens image, rank, club name, motorcycle, name, and id.

## Rollback

Run the previous production deployment rollback in Vercel, then restore data from Neon if demo seed data must be removed. The seeder deletes all events by design.
```

- [ ] **Step 3: Full verification before PR**

Run:

```powershell
npx.cmd tsc --noEmit
npm.cmd run lint
npx.cmd vitest run
npm.cmd run build
npx.cmd playwright test tests/e2e/live-map.spec.ts tests/e2e/live-map-demo.spec.ts
```

- [ ] **Step 4: Security gate and push**

Run `security-review` before push. If no CRITICAL/HIGH findings:

```powershell
& $git push -u origin phase5-map-demo-density
gh pr create --base main --head phase5-map-demo-density --title "Phase 5: dense live map demo" --body "Closes #ISSUE"
```

- [ ] **Step 5: Production deploy and seed**

After PR merge and explicit user approval:

```powershell
npm.cmd run seed:map-demo
```

Then run the production Playwright config against `https://ironcult.vercel.app` and post the results to the issue.

---

## Self-Review

- Spec coverage: The plan covers the requested darker map, more distinct district colors, higher opacity, cleared/seeded happening-now events, seeded riders near events, guest club dots, click cards, FlyerOne red/larger dot, and image/rank/club/motorcycle/name/id rider details.
- Scope control: The plan avoids a schema migration for speed and preserves real rider/crew records. If persistent event check-ins or uploaded photos become required, create a separate schema-migration plan.
- Type consistency: `districtColor`, `countNearbyRiders`, `riderCard`, `PresenceRow`, and `EventRow` fields are named consistently across API, UI, and tests.
- Handoff: Each task is independently testable and should become exactly one GitHub issue labeled `phase:5`.
