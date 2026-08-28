# Mobile-First Redesign Implementation Plan

> **For agentic workers (any tool):** This plan is written to be executed by any coding agent, not
> a specific one — every step gives exact file paths, real code, and literal shell commands rather
> than assuming a particular assistant's plugins. Read `CLAUDE.md` and `AGENTS.md` at the repo root
> before starting Task 1; both are plain project docs, not tool-specific config. Work through the
> tasks below in order (1→13), one task at a time, with a human review checkpoint between tasks
> (every task ends with **STOP-AND-REVIEW CHECKPOINT**). Steps use checkbox (`- [ ]`) syntax —
> check each box off as it's completed so progress is visible if a different session/agent picks
> this plan back up. A handful of steps reference Claude Code plugin skills (`code-review`,
> `claude-md-improver`, `security-review`) as the ideal path; every one of those steps also states
> a plain manual fallback right next to it — if your tooling doesn't have that skill, do the manual
> version, don't skip the step.

**Goal:** Make ironCult usable and demo-ready on a Pixel 7 (and phones generally) by (a) finishing Track B's unbuilt live-map/presence/turf-war centerpiece mobile-first from the start, and (b) redesigning navigation and every existing page for touch/small-viewport use, so the live map + turf-war becomes the app's home screen on launch.

**Architecture:** Two sequential branches. Tasks 1–4 land on the existing `track-b` branch (first rebased onto `main` to pick up Track A's merged pages) and finish Track B's outstanding presence/live-map/turf-war work, mobile-first instead of the original desktop-oriented spec. Task 5 merges `track-b` into `main`. Tasks 6–11 then happen on a new `mobile-redesign` branch off the updated `main`, replacing the flat `NavBar` with an adaptive bottom-tab-bar (mobile) / top-bar (≥768px) component and retrofitting every existing page (routes, leaderboard, settings, buddy finder, events) for touch/small-viewport use. Verification throughout is Playwright device-emulated (`devices['Pixel 7']`) — this UI work has no meaningful unit-test surface beyond the two pure functions (`isOnline`, `pickOwner`) that Track B's plan already covers.

**Tech Stack:** Next.js App Router, TypeScript, MapLibre GL JS (new dependency), Drizzle/Neon Postgres (existing schema, unchanged), plain CSS custom properties in `app/globals.css` (no Tailwind), Playwright (`@playwright/test` ^1.62.1, which ships `devices['Pixel 7']`), Vitest.

**Spec:** [docs/superpowers/specs/2026-08-28-ironcult-design.md](../specs/2026-08-28-ironcult-design.md) and [docs/superpowers/plans/2026-08-28-track-b-live-map-social.md](2026-08-28-track-b-live-map-social.md) (Tasks 3–5 define the presence/live-map/turf-war interfaces this plan builds on, adapted mobile-first below — do not re-derive them differently).

## Global Constraints

- **Target device:** Google Pixel 7 — CSS viewport 412×915, `devicePixelRatio` 2.625, touch. Verify every task against Playwright's `devices['Pixel 7']` project (added in Task 1), not desktop Chrome with a resized window.
- **Breakpoint:** mobile layout (bottom tab bar, single-column stacks) below 768px; tablet/desktop layout (top nav bar, multi-column) at 768px and above. One breakpoint, not a cascade of them — this app has few enough views that a single split is sufficient.
- **Touch targets:** every interactive element (buttons, nav tabs, map markers people tap) is at least 44×44 CSS px, per WCAG 2.2 AA and Apple/Material guidance, with visible spacing between adjacent targets.
- **Primary navigation:** 3–5 items in the bottom tab bar, thumb-zone (bottom ~40% of viewport) placement. Anything beyond 5 destinations moves out of the bar (this plan puts Settings/profile behind a persistent top-right icon instead of a 6th tab).
- **Full-bleed viewport units:** use `100dvh`/`100svh`, never a bare `100vh`, for any element meant to fill the visible mobile screen (the map) — bare `vh` overshoots under Android Chrome's collapsing toolbar and clips content.
- **Safe areas:** `app/layout.tsx` sets `viewportFit: 'cover'` in its `viewport` export; fixed-position UI (bottom nav, floating presence toggle) pads for `env(safe-area-inset-bottom, 0px)`.
- **No Tailwind, no Google Fonts** — extend `app/globals.css`'s custom properties and the `.panel` primitive; system font stack stays as-is.
- **`routes.voivodeship` / `routes.district` stay server-derived** — nothing in this plan touches that logic, only how the pages around it are laid out.
- **GitHub label:** this work spans both tracks' pages after both are otherwise complete, so file every issue under a new `phase:5` label (create it if `gh label list` doesn't show it: `gh label create "phase:5" --color "5319E7" --description "Mobile-first redesign"`) rather than `track:A`/`track:B` — mirrors how `phase:4` already covers cross-track integration work.
- **Acceptance criteria required before every task** per `.claude/rules/github-projects.md` — each task below states its own; copy it into the task's GitHub issue before starting that task's code.

## Process notes that apply to every task below

- **GitHub Projects, not just Issues.** For every task: file the issue with its acceptance criteria, add it to project board 1 (`gh project item-add 1 --owner malkavian-librarian --url <issue-url>`), move it to "In Progress" when work starts, then to "Done" in the same step you close the issue with its pass/fail comment — not as a later sweep. This applies to Tasks 1–13 uniformly even though only Task 13 spells out the board-close step explicitly.
- **Use a cheaper/smaller model for boilerplate steps where your tooling supports it.** Per `CLAUDE.md`'s Model preferences table: every "Write the failing test" step whose test is boilerplate CRUD/layout assertion (which is most of them in this plan — Playwright overflow/bounding-box checks, Vitest table-driven unit tests), and every "Code review pass" step, is a good candidate to hand to a smaller/faster model or a lightweight subagent instead of running it on the main model driving the session — if your tooling doesn't support delegating to a different model, just run these steps yourself; the point is cost control where it's available, not a hard requirement. Keep the following on the primary/most capable model regardless: the branch/merge decisions (Tasks 1, 5, 13), the CSS breakpoint/nav architecture decisions (Task 6), and anything touching schema-adjacent or cross-track integration judgment (Task 4's SQL, Task 5's merge). Plan-writing (this document) and final review synthesis stay on the primary model too.
- **Run a review pass at the end of every task, not just at the final merge.** Every task in this plan except Task 5 (a merge checkpoint, not a code task) and Task 12 (docs/cleanup, verified via its own acceptance criteria) already names an explicit "Code review pass" step between "Simplify pass" and "Commit and push" — run it as written (using the `code-review` skill if your tooling has it, otherwise a manual read-through against that task's own Acceptance Criteria plus a check for the usual things: unhandled errors, leaked resources/listeners, obvious security issues). If a future task gets added to this plan without one, treat that as a gap to fix, not a step to skip; no task should reach its commit step without a review having run.

---

### Task 1: Sync `track-b` onto `main` + mobile viewport/design-token foundation

**Branch:** `track-b` (existing remote branch — check it out, merge `main` in first).

**Files:**
- Modify: `app/layout.tsx` (add `viewport` export)
- Modify: `app/globals.css:1–15` (add mobile design tokens)
- Modify: `playwright.config.ts:36–60` (enable a Pixel 7 project)
- Test: `tests/e2e/viewport-smoke.spec.ts`

**Interfaces:**
- Produces: CSS custom properties `--safe-top`, `--safe-bottom`, `--touch-min`, `--breakpoint-tablet` on `:root` in `app/globals.css`, consumed by every later task's CSS.
- Produces: a `pixel7` Playwright project (`devices['Pixel 7']`) that later tasks' mobile e2e specs run under via `--project=pixel7`.

- [ ] **Step 1: Sync the branch**

```powershell
$git = "C:\Users\FlyerOne\AppData\Local\GitHubDesktop\app-3.5.11\resources\app\git\cmd\git.exe"
& $git fetch origin
& $git checkout -b track-b origin/track-b
& $git merge origin/main -m "Merge main into track-b (pick up Track A pages before mobile-first live-map work)"
```
Resolve any conflict in `components/NavBar.tsx` by keeping `main`'s version for now — Task 6 replaces this file entirely, so whichever version wins here is temporary.

- [ ] **Step 2: Write the failing viewport test**

Create `tests/e2e/viewport-smoke.spec.ts`:
```typescript
import { test, expect } from '@playwright/test';

test('homepage renders without horizontal overflow on Pixel 7', async ({ page }) => {
  await page.goto('/');
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(hasOverflow).toBe(false);
});
```

- [ ] **Step 3: Run it against the new project to confirm the project wiring works and the test currently fails or errors**

Run: `npx playwright test tests/e2e/viewport-smoke.spec.ts --project=pixel7`
Expected: fails with "Unknown project pixel7" (project doesn't exist yet) — this confirms Step 2's test is wired to a project name Step 4 must create.

- [ ] **Step 4: Enable the Pixel 7 project**

Modify `playwright.config.ts`, replace the commented-out mobile block (current lines 52–60) with:
```typescript
    /* Test against mobile viewports. */
    {
      name: 'pixel7',
      use: { ...devices['Pixel 7'] },
    },
```
Leave the existing `chromium` project in place — most e2e specs still run desktop-width by default; only specs that assert mobile-specific layout (this plan's new ones) pass `--project=pixel7` explicitly, or get a matching `test.use({ ...devices['Pixel 7'] })` block inside the spec file itself so `npx playwright test` with no `--project` flag still exercises them on mobile. Use the in-file `test.use()` form for every new spec this plan adds, so CI running the full suite with no `--project` flag still covers mobile — do not rely on `--project=pixel7` being remembered.

Rewrite Step 2's spec to use that pattern instead of depending on `--project`:
```typescript
import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['Pixel 7'] });

test('homepage renders without horizontal overflow on Pixel 7', async ({ page }) => {
  await page.goto('/');
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(hasOverflow).toBe(false);
});
```

- [ ] **Step 5: Add the viewport-fit meta**

Modify `app/layout.tsx` — add a `viewport` export alongside the existing `metadata` export:
```typescript
import type { Viewport } from 'next';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};
```
(Keep the existing `metadata` export as-is — Next.js requires `viewport` as a separate export, not nested inside `metadata`, since Next 14.)

- [ ] **Step 6: Add mobile design tokens to `globals.css`**

Modify `app/globals.css`, inside the existing `:root { ... }` block (lines 1–15), add:
```css
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --touch-min: 44px;
  --breakpoint-tablet: 768px;
```
Also raise the existing `button` rule's `min-height: 42px` (line 29) to `min-height: var(--touch-min);` so every button in the app already meets the 44px touch-target floor without per-page changes.

- [ ] **Step 7: Run the test, confirm it passes**

Run: `npm run dev` (separate terminal), then `npx playwright test tests/e2e/viewport-smoke.spec.ts`
Expected: PASS (with `npm run dev` running; `page.goto('/')` currently hits the old homepage from `main`, which is narrow enough not to overflow — this is a baseline check, Task 3 replaces the homepage).

- [ ] **Step 8: Run the full existing suite to confirm nothing broke from the merge**

Run: `npx vitest run` and `npx playwright test` (chromium project)
Expected: same pass count as before the merge — this is a sync/merge task, not a feature change, so no existing test should flip.

- [ ] **Step 9: Commit and push**

```powershell
& $git add app/layout.tsx app/globals.css playwright.config.ts tests/e2e/viewport-smoke.spec.ts
& $git commit -m "feat: mobile viewport foundation - safe-area tokens, touch-min, Pixel 7 Playwright project"
& $git push origin track-b
```

**Acceptance criteria (add to this task's GitHub issue before starting):**
- [ ] `track-b` merges `main` cleanly (or documents the resolution) and the pre-existing test suite still passes at the same count
- [ ] `app/layout.tsx` exports `viewport` with `viewportFit: 'cover'`
- [ ] `:root` defines `--safe-top`, `--safe-bottom`, `--touch-min`, `--breakpoint-tablet`
- [ ] `button { min-height: var(--touch-min) }` (44px, not 42px)
- [ ] `playwright.config.ts` has a working `pixel7` project using `devices['Pixel 7']`
- [ ] `tests/e2e/viewport-smoke.spec.ts` passes using in-file `test.use({ ...devices['Pixel 7'] })`

**STOP-AND-REVIEW CHECKPOINT.**

---

### Task 2: Presence API + mobile PresenceToggle (floating action button)

**Branch:** `track-b`

**Files:**
- Create: `lib/presence/online-window.ts`
- Create: `app/api/presence/route.ts`
- Create: `components/PresenceToggle.tsx`
- Test: `tests/unit/presence/online-window.test.ts`
- Test: `tests/integration/presence.test.ts`

**Interfaces:**
- Produces: `isOnline(updatedAt: Date): boolean` (true if within the last 60 seconds) from `lib/presence/online-window.ts`, consumed by `GET /api/presence`.
- Produces: `POST /api/presence` (auth required, body `{ lat: number, lon: number }`, upserts by `riderId`) and `GET /api/presence` (public, returns `{ riderId, displayName, lat, lon }[]` for riders online in the last 60s) — consumed by Task 3's `LiveMap`.
- Produces: `<PresenceToggle />` — a fixed-position floating action button, consumed by Task 3's map page.

- [ ] **Step 1: Write the failing unit test**

Create `tests/unit/presence/online-window.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { isOnline } from '@/lib/presence/online-window';

describe('isOnline', () => {
  it('is true for a timestamp updated 10 seconds ago', () => {
    expect(isOnline(new Date(Date.now() - 10_000))).toBe(true);
  });

  it('is false for a timestamp updated 5 minutes ago', () => {
    expect(isOnline(new Date(Date.now() - 5 * 60_000))).toBe(false);
  });
});
```

- [ ] **Step 2: Run it, confirm it fails ("Cannot find module")**

Run: `npx vitest run tests/unit/presence/online-window.test.ts`

- [ ] **Step 3: Implement**

Create `lib/presence/online-window.ts`:
```typescript
const ONLINE_WINDOW_MS = 60_000;

export function isOnline(updatedAt: Date): boolean {
  return Date.now() - updatedAt.getTime() < ONLINE_WINDOW_MS;
}
```

- [ ] **Step 4: Run it, confirm it passes**

Run: `npx vitest run tests/unit/presence/online-window.test.ts`

- [ ] **Step 5: Write the failing integration test**

Create `tests/integration/presence.test.ts`:
```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { POST as pingPresence, GET as listPresence } from '@/app/api/presence/route';
import { POST as register } from '@/app/api/auth/register/route';

let token: string;

beforeAll(async () => {
  const res = await register(new Request('http://localhost/api/auth/register', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: `presence-${Date.now()}@example.com`, password: 'hunter22', displayName: 'Presence Tester' }),
  }));
  token = (await res.json()).token;
});

function authed(url: string, init: RequestInit = {}) {
  return new Request(url, { ...init, headers: { ...init.headers, authorization: `Bearer ${token}` } });
}

describe('presence API', () => {
  it('upserts presence and appears in the online list', async () => {
    const res = await pingPresence(authed('http://localhost/api/presence', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ lat: 52.23, lon: 21.01 }),
    }));
    expect(res.status).toBe(200);
    const listRes = await listPresence(new Request('http://localhost/api/presence'));
    const body = await listRes.json();
    expect(body.some((p: { displayName: string }) => p.displayName === 'Presence Tester')).toBe(true);
  });

  it('upserting again updates the same row, not a duplicate', async () => {
    await pingPresence(authed('http://localhost/api/presence', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ lat: 52.24, lon: 21.02 }) }));
    await pingPresence(authed('http://localhost/api/presence', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ lat: 52.25, lon: 21.03 }) }));
    const listRes = await listPresence(new Request('http://localhost/api/presence'));
    const body = await listRes.json();
    const matches = body.filter((p: { displayName: string }) => p.displayName === 'Presence Tester');
    expect(matches.length).toBe(1);
    expect(matches[0].lat).toBe(52.25);
  });
});
```

- [ ] **Step 6: Run it, confirm it fails**

Run: `npx vitest run tests/integration/presence.test.ts`

- [ ] **Step 7: Implement the route**

Create `app/api/presence/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { presence, riders } from '@/lib/db/schema';
import { requireAuth, AuthError } from '@/lib/auth/require-auth';
import { isOnline } from '@/lib/presence/online-window';

export async function POST(req: Request) {
  try {
    const { riderId } = requireAuth(req);
    const { lat, lon } = await req.json();
    if (lat == null || lon == null) {
      return NextResponse.json({ error: 'lat and lon are required' }, { status: 400 });
    }
    await db
      .insert(presence)
      .values({ riderId, lat, lon, updatedAt: new Date() })
      .onConflictDoUpdate({ target: presence.riderId, set: { lat, lon, updatedAt: new Date() } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 });
    throw e;
  }
}

export async function GET() {
  const rows = await db
    .select({ riderId: presence.riderId, displayName: riders.displayName, lat: presence.lat, lon: presence.lon, updatedAt: presence.updatedAt })
    .from(presence)
    .innerJoin(riders, eq(presence.riderId, riders.id));
  return NextResponse.json(
    rows.filter((r) => isOnline(r.updatedAt)).map(({ updatedAt: _unused, ...rest }) => rest)
  );
}
```
Check `lib/auth/require-auth.ts` for `requireAuth`'s and `AuthError`'s exact exported names before writing this — Task 2 assumes the same shape Track A's other authenticated routes already use (e.g. `app/api/profile/route.ts`); adjust the import if the real names differ.

- [ ] **Step 8: Run it, confirm it passes**

Run: `npx vitest run tests/integration/presence.test.ts`

- [ ] **Step 9: Build the mobile PresenceToggle as a floating action button**

Create `components/PresenceToggle.tsx`:
```typescript
'use client';
import { useEffect, useRef, useState } from 'react';

export function PresenceToggle() {
  const [riding, setRiding] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function ping() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      fetch('/api/presence', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${localStorage.getItem('ironcult_token')}` },
        body: JSON.stringify({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      });
    });
  }

  useEffect(() => {
    if (riding) {
      ping();
      intervalRef.current = setInterval(ping, 10000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [riding]);

  return (
    <button
      onClick={() => setRiding((r) => !r)}
      data-testid="presence-toggle"
      style={{
        position: 'fixed',
        right: '1rem',
        bottom: 'calc(var(--nav-height, 64px) + var(--safe-bottom) + 1rem)',
        zIndex: 20,
        minWidth: 'var(--touch-min)',
        minHeight: 'var(--touch-min)',
        borderRadius: '999px',
        padding: '0 1.25rem',
        background: riding ? 'var(--visor)' : 'var(--signal)',
        color: riding ? 'var(--asphalt)' : 'var(--paper)',
      }}
    >
      {riding ? "Riding \u2014 stop" : "I'm riding"}
    </button>
  );
}
```
Fixed bottom-right, stacked just above where Task 6's bottom nav bar sits (`--nav-height` is defined in that task; falls back to `64px` here so this component works standalone before Task 6 lands) and padded above `--safe-bottom` — this keeps it in the one-handed thumb zone without overlapping the nav bar or the iOS/Android gesture strip.

Verify `localStorage.getItem('ironcult_token')` is the correct key by checking how `app/(app)/settings/page.tsx` or the login flow stores the JWT (grep for `ironcult_token` or `localStorage.setItem` under `app/`/`lib/`) before relying on it — adjust the key name here if the real one differs.

- [ ] **Step 10: Code review pass** — confirm `onConflictDoUpdate` targets `presence.riderId` (the true unique/primary key, so this is upsert not insert-then-fail); confirm `GET` never returns a rider who has gone offline (the `isOnline` filter runs server-side); confirm the FAB's `bottom` calc references a CSS variable that either exists yet or degrades gracefully.

- [ ] **Step 11: Simplify pass.**

- [ ] **Step 12: Commit and push**

```powershell
& $git add app/api/presence lib/presence components/PresenceToggle.tsx tests/unit/presence tests/integration/presence.test.ts
& $git commit -m "feat: presence upsert/list API + mobile floating-action presence toggle"
& $git push origin track-b
```

**Acceptance criteria:**
- [ ] `isOnline` unit tests pass (online <60s, offline >60s)
- [ ] `POST /api/presence` requires auth, upserts (not duplicates) by rider
- [ ] `GET /api/presence` excludes riders offline >60s
- [ ] `PresenceToggle` renders as a fixed, thumb-zone floating button ≥44×44px, padded above `--safe-bottom`

**STOP-AND-REVIEW CHECKPOINT.**

---

### Task 3: Full-screen mobile live map as the new homepage

**Branch:** `track-b`

**Files:**
- Create: `components/LiveMap.tsx`
- Modify: `app/page.tsx` (replace entirely — map becomes `/`)
- Delete: nothing yet — the old `/map` route this plan's earlier spec drafts referenced is skipped; the map now lives at `/` directly, so there is no separate `/map` page to create
- Test: `tests/e2e/live-map.spec.ts`

**Interfaces:**
- Consumes: `GET /api/presence` (Task 2), `GET /api/events` (already on `track-b` from the prior buddy-finder/events work), `<PresenceToggle />` (Task 2).
- Produces: `<LiveMap />` — a MapLibre map that fills the viewport via `100dvh`, showing a marker per online rider and per event, consumed by `app/page.tsx` and by Task 4 (turf-war layer, added on top of this component).

- [ ] **Step 1: Install MapLibre**

```powershell
npm install maplibre-gl
npm install -D @types/maplibre-gl
```

- [ ] **Step 2: Build the full-screen map component**

Create `components/LiveMap.tsx`:
```typescript
'use client';
import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

type PresenceRow = { riderId: string; displayName: string; lat: number; lon: number };
type EventRow = { id: string; title: string; type: string; lat: number; lon: number; happeningNow: boolean };

export function LiveMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [presenceRows, setPresenceRows] = useState<PresenceRow[]>([]);
  const [eventRows, setEventRows] = useState<EventRow[]>([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    mapRef.current = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {},
        layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#10100f' } }],
      },
      center: [19.1, 52.0],
      zoom: 6,
      touchPitch: false,
      dragRotate: false,
      // Single-finger pan/zoom, no rotate/pitch gestures to fight with — this is
      // the app's primary mobile screen, not a secondary embedded map, so
      // MapLibre's default cooperativeGestures (require two fingers) is off.
    });
    mapRef.current.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
  }, []);

  useEffect(() => {
    async function poll() {
      const res = await fetch('/api/presence');
      setPresenceRows(await res.json());
    }
    poll();
    const interval = setInterval(poll, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetch('/api/events').then((r) => r.json()).then(setEventRows);
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    for (const rider of presenceRows) {
      const el = document.createElement('div');
      el.style.cssText = 'width:16px;height:16px;border-radius:50%;background:var(--signal);border:2px solid var(--paper);';
      el.title = rider.displayName;
      markersRef.current.push(new maplibregl.Marker({ element: el }).setLngLat([rider.lon, rider.lat]).addTo(mapRef.current));
    }

    for (const event of eventRows) {
      const el = document.createElement('div');
      el.style.cssText = `width:18px;height:18px;border-radius:2px;background:${event.happeningNow ? 'var(--visor)' : 'var(--concrete)'};border:2px solid var(--paper);`;
      el.title = `${event.title}${event.happeningNow ? ' (happening now)' : ''}`;
      markersRef.current.push(new maplibregl.Marker({ element: el }).setLngLat([event.lon, event.lat]).addTo(mapRef.current));
    }
  }, [presenceRows, eventRows]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100dvh' }}
      data-testid="live-map"
    />
  );
}
```
Marker size is bumped from the original 12–14px spec to 16–18px — small enough not to obscure the map, but a bare 12px circle is under the 44px touch-target floor for a Pixel 7 finger-tap; MapLibre markers can't be made invisibly larger without an invisible padded hit-area, which is out of scope for this pass — note as a known gap in Task 3's acceptance criteria rather than silently claiming full compliance.

- [ ] **Step 3: Replace the homepage with the map**

Read the current `app/page.tsx` first (its 3 CTA buttons — Settings & Crew, Routes, Leaderboard — move into Task 6's nav, so nothing from it is lost, just relocated). Replace it:

```typescript
import { LiveMap } from '@/components/LiveMap';
import { PresenceToggle } from '@/components/PresenceToggle';

export default function HomePage() {
  return (
    <div style={{ position: 'relative' }}>
      <LiveMap />
      <PresenceToggle />
    </div>
  );
}
```

- [ ] **Step 4: Playwright smoke test on Pixel 7**

Create `tests/e2e/live-map.spec.ts`:
```typescript
import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['Pixel 7'] });

test('homepage renders a full-viewport map with the presence toggle in the thumb zone', async ({ page }) => {
  await page.goto('/');
  const map = page.locator('[data-testid="live-map"]');
  await expect(map).toBeVisible();
  const mapBox = await map.boundingBox();
  expect(mapBox?.height).toBeGreaterThan(800); // Pixel 7 viewport height is 915; map should fill nearly all of it

  const toggle = page.locator('[data-testid="presence-toggle"]');
  await expect(toggle).toBeVisible();
  const toggleBox = await toggle.boundingBox();
  expect(toggleBox?.height).toBeGreaterThanOrEqual(44);
  expect(toggleBox!.y).toBeGreaterThan(915 / 2); // toggle sits in the bottom half of the screen (thumb zone)
});
```
Run with `npm run dev` in another terminal: `npx playwright test tests/e2e/live-map.spec.ts`. This is a real-browser check — MapLibre bugs fail silently, so also add a temporary `await page.screenshot({ path: 'scratchpad/map-smoke.png' })` before removing the assertions block, and actually look at the screenshot to confirm the canvas paints tiles/pins rather than a blank div.

- [ ] **Step 5: Code review pass** — confirm the presence-poll `setInterval` is cleared on unmount; confirm markers from the previous poll are removed before new ones are added (no accumulation leak); confirm `touchPitch: false` / `dragRotate: false` don't also block ordinary single-finger pan (they shouldn't — those two options only disable rotate/pitch gestures).

- [ ] **Step 6: Simplify pass.**

- [ ] **Step 7: Commit and push**

```powershell
& $git add app/page.tsx components/LiveMap.tsx package.json package-lock.json tests/e2e/live-map.spec.ts
& $git commit -m "feat: full-screen live map with presence and event pins as the mobile homepage"
& $git push origin track-b
```

**Acceptance criteria:**
- [ ] `/` renders `<LiveMap>` filling ~the full Pixel 7 viewport (`100dvh`, confirmed via Playwright bounding box, not just "looks full on desktop")
- [ ] Presence pins refresh every 10s, event pins load once, both render as MapLibre markers
- [ ] `PresenceToggle` sits in the bottom half of a Pixel 7 viewport and is ≥44px tall
- [ ] Manual screenshot check confirms the map canvas actually paints (not a silent blank div)
- [ ] Known gap logged (not silently hidden): individual marker hit-areas (16–18px) are under the 44px touch floor — acceptable for a demo, flagged for a future pass

**STOP-AND-REVIEW CHECKPOINT.**

---

### Task 4: Turf-war Warsaw-district layer

**Branch:** `track-b`

**Files:**
- Create: `app/api/turf-war/route.ts`
- Create: `lib/turf-war/ownership.ts`
- Modify: `components/LiveMap.tsx` (add the polygon fill layer)
- Test: `tests/unit/turf-war/ownership.test.ts`
- Test: `tests/integration/turf-war.test.ts`

**Interfaces:**
- Consumes: `routes`, `crews`, `riders` tables (read-only), `public/map/warsaw-districts.json`.
- Produces: `pickOwner(counts: { crewId: string; crewName: string; district: string; count: number }[]): Record<string, { crewId: string; crewName: string; count: number }>` and `GET /api/turf-war` → object keyed by Warsaw district slug.

- [ ] **Step 1: Write the failing unit test**

Create `tests/unit/turf-war/ownership.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { pickOwner } from '@/lib/turf-war/ownership';

describe('pickOwner', () => {
  it('picks the crew with the highest count per district', () => {
    const result = pickOwner([
      { crewId: 'a', crewName: 'Alpha', district: 'srodmiescie', count: 3 },
      { crewId: 'b', crewName: 'Beta', district: 'srodmiescie', count: 7 },
      { crewId: 'a', crewName: 'Alpha', district: 'mokotow', count: 2 },
    ]);
    expect(result.srodmiescie).toEqual({ crewId: 'b', crewName: 'Beta', count: 7 });
    expect(result.mokotow).toEqual({ crewId: 'a', crewName: 'Alpha', count: 2 });
  });

  it('omits districts with no entries', () => {
    const result = pickOwner([{ crewId: 'a', crewName: 'Alpha', district: 'wola', count: 1 }]);
    expect(result.srodmiescie).toBeUndefined();
  });

  it('breaks ties by keeping the first entry seen', () => {
    const result = pickOwner([
      { crewId: 'a', crewName: 'Alpha', district: 'praga-polnoc', count: 4 },
      { crewId: 'b', crewName: 'Beta', district: 'praga-polnoc', count: 4 },
    ]);
    expect(result['praga-polnoc'].crewId).toBe('a');
  });
});
```

- [ ] **Step 2: Run it, confirm it fails, then implement**

Create `lib/turf-war/ownership.ts`:
```typescript
type CrewCount = { crewId: string; crewName: string; district: string; count: number };
type Owner = { crewId: string; crewName: string; count: number };

export function pickOwner(counts: CrewCount[]): Record<string, Owner> {
  const result: Record<string, Owner> = {};
  for (const row of counts) {
    const current = result[row.district];
    if (!current || row.count > current.count) {
      result[row.district] = { crewId: row.crewId, crewName: row.crewName, count: row.count };
    }
  }
  return result;
}
```

- [ ] **Step 3: Run it, confirm it passes.**

- [ ] **Step 4: Write the failing integration test**

Create `tests/integration/turf-war.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { GET as getTurfWar } from '@/app/api/turf-war/route';

describe('turf-war API', () => {
  it('returns an object keyed by Warsaw district', async () => {
    const res = await getTurfWar();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body).toBe('object');
  });
});
```

- [ ] **Step 5: Implement the API route**

Create `app/api/turf-war/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { pickOwner } from '@/lib/turf-war/ownership';

export async function GET() {
  const result = await db.execute(sql`
    SELECT r.district, c.id as "crewId", c.name as "crewName", COUNT(r.id)::int as count
    FROM routes r
    JOIN riders ri ON ri.id = r.owner_id
    JOIN crews c ON c.id = ri.crew_id
    WHERE r.district IS NOT NULL
    GROUP BY r.district, c.id, c.name
    ORDER BY count DESC
  `);
  const owners = pickOwner(result.rows as { crewId: string; crewName: string; district: string; count: number }[]);
  return NextResponse.json(owners);
}
```

- [ ] **Step 6: Run tests, confirm they pass.**

- [ ] **Step 7: Add the turf-war fill layer to `LiveMap`, with tap-friendly opacity**

Modify `components/LiveMap.tsx`: in a new `useEffect` (after the map-init effect from Task 3), add the district GeoJSON as a source and a fill layer once the map loads, refresh every 30s:

```typescript
useEffect(() => {
  if (!mapRef.current) return;
  const map = mapRef.current;

  function hashToHue(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) % 360;
    return hash;
  }

  async function addTurfWarLayer() {
    const [geo, owners] = await Promise.all([
      fetch('/map/warsaw-districts.json').then((r) => r.json()),
      fetch('/api/turf-war').then((r) => r.json()),
    ]);
    const colored = {
      ...geo,
      features: geo.features.map((f: { properties: { name: string } }) => {
        const owner = owners[f.properties.name];
        return { ...f, properties: { ...f.properties, fillColor: owner ? `hsl(${hashToHue(owner.crewId)}, 55%, 32%)` : '#181714' } };
      }),
    };
    if (map.getSource('turf-war')) {
      (map.getSource('turf-war') as maplibregl.GeoJSONSource).setData(colored);
    } else {
      map.addSource('turf-war', { type: 'geojson', data: colored });
      // fill-opacity is bumped from the original 0.55 to 0.65 on mobile so district
      // ownership is legible at a glance on a 412px-wide screen without zooming in.
      map.addLayer({ id: 'turf-war-fill', type: 'fill', source: 'turf-war', paint: { 'fill-color': ['get', 'fillColor'], 'fill-opacity': 0.65 } });
      map.addLayer({ id: 'turf-war-outline', type: 'line', source: 'turf-war', paint: { 'line-color': 'rgba(243,239,230,0.4)', 'line-width': 1 } });
    }
  }

  if (map.loaded()) addTurfWarLayer();
  else map.once('load', addTurfWarLayer);

  const interval = setInterval(addTurfWarLayer, 30000);
  return () => clearInterval(interval);
}, []);
```

- [ ] **Step 8: Manual verification** — with `npm run dev` running and at least one route+crew whose `startLat`/`startLon` fall inside Warsaw (e.g. ~52.23, 21.01), confirm that district visibly fills with color on `/`, at the Pixel 7 viewport size (resize the browser or use device emulation) so you're checking the layout you actually shipped, not just the desktop view.

- [ ] **Step 9: Code review pass** — confirm the SQL's `JOIN crews` (not `LEFT JOIN`) correctly excludes crewless riders' routes rather than bucketing them as "unowned"; confirm this matches the intended crew-vs-crew turf-war semantics.

- [ ] **Step 10: Simplify pass.**

- [ ] **Step 11: Commit and push**

```powershell
& $git add app/api/turf-war lib/turf-war components/LiveMap.tsx tests/unit/turf-war tests/integration/turf-war.test.ts
& $git commit -m "feat: turf-war Warsaw-district ownership layer, mobile-tuned opacity"
& $git push origin track-b
```

**Acceptance criteria:**
- [ ] `pickOwner` unit tests pass (highest count wins, ties keep first-seen, empty districts omitted)
- [ ] `GET /api/turf-war` returns 200 with a district-keyed object
- [ ] Turf-war fill layer renders on `/` and visibly updates when a Warsaw-district route exists
- [ ] Fill opacity (0.65) is legible on a 412px-wide screenshot without zooming

**STOP-AND-REVIEW CHECKPOINT — this closes out Track B's originally-planned scope. Do not merge yet; Task 5 does that deliberately.**

---

### Task 5: Merge `track-b` into `main`

**Branch:** none (merge task) — opens a PR from `track-b` into `main`.

**Files:** none created; this is an integration checkpoint, not a code task.

- [ ] **Step 1: Push and open the PR**

```powershell
& $git push origin track-b
gh pr create --base main --head track-b --title "Track B: buddy finder, events, presence, live map, turf-war (mobile-first)" --body "Closes #13, closes #14, closes #15, closes #16, closes #17, closes #18"
```
(Issue numbers per the original Track B plan's numbering — confirm against `gh issue list --label "track:B"` before using literal numbers, in case any were renumbered.)

- [ ] **Step 2: Run the full suite one more time against the merge-base to be sure**

Run: `npx vitest run` and `npx tsc --noEmit` (per the repo's documented gotcha: `vitest run` does not typecheck, and a type error here would silently break the Vercel build even though tests are green)

- [ ] **Step 3: Merge**

Merge the PR (via `gh pr merge --merge` or the GitHub UI, per user preference — this is the one point in the plan to check with the user first, since merging to `main` is exactly the kind of action that warrants a confirmation rather than proceeding autonomously).

- [ ] **Step 4: Update the board** — close issues #13–#18 (or whichever the real numbers are) if the PR's closing keywords didn't already do it, move them to Done.

**Acceptance criteria:**
- [ ] PR merged into `main`, no conflicts left unresolved
- [ ] `npx vitest run` and `npx tsc --noEmit` both pass on `main` post-merge
- [ ] All six Track B issues closed

**STOP-AND-REVIEW CHECKPOINT.**

---

### Task 6: Adaptive navigation — bottom tab bar (mobile) + top bar (≥768px)

**Branch:** `mobile-redesign` (new, off updated `main`)

```powershell
& $git checkout main
& $git pull origin main
& $git checkout -b mobile-redesign
```

**Files:**
- Create: `components/BottomNav.tsx`
- Modify: `components/NavBar.tsx` (becomes the ≥768px variant)
- Create: `components/AppNav.tsx` (wraps both, toggles via CSS not JS)
- Modify: `app/layout.tsx:14` (swap `<NavBar />` for `<AppNav />`)
- Modify: `app/globals.css` (add `--nav-height`, breakpoint media query)
- Test: `tests/e2e/nav.spec.ts`

**Interfaces:**
- Produces: `<AppNav />`, rendered once in `app/layout.tsx`, replacing the old always-visible `<NavBar />`.
- Consumes: `--breakpoint-tablet` (Task 1), `--safe-bottom` (Task 1), `--touch-min` (Task 1).

- [ ] **Step 1: Write the failing nav test**

Create `tests/e2e/nav.spec.ts`:
```typescript
import { test, expect, devices } from '@playwright/test';

test.describe('mobile bottom nav (Pixel 7)', () => {
  test.use({ ...devices['Pixel 7'] });

  test('shows exactly 5 primary tabs in the thumb zone, each a 44px+ touch target', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('[data-testid="bottom-nav"]');
    await expect(nav).toBeVisible();
    const tabs = nav.locator('a');
    await expect(tabs).toHaveCount(5);
    for (const tab of await tabs.all()) {
      const box = await tab.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
      expect(box!.y).toBeGreaterThan(915 * 0.6); // bottom ~40% of the 915px-tall viewport
    }
    // top NavBar must NOT be the visible nav on mobile
    await expect(page.locator('[data-testid="top-nav"]')).toBeHidden();
  });

  test('settings/profile is reachable via a persistent top-right icon, not the bottom bar', async ({ page }) => {
    await page.goto('/');
    const profileLink = page.locator('[data-testid="profile-link"]');
    await expect(profileLink).toBeVisible();
    await profileLink.click();
    await expect(page).toHaveURL(/\/settings/);
  });
});

test.describe('desktop top nav (≥768px)', () => {
  test.use({ viewport: { width: 1024, height: 768 } });

  test('shows the top nav bar, hides the bottom tab bar', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="top-nav"]')).toBeVisible();
    await expect(page.locator('[data-testid="bottom-nav"]')).toBeHidden();
  });
});
```

- [ ] **Step 2: Run it, confirm it fails** (`[data-testid="bottom-nav"]` doesn't exist yet)

Run: `npx playwright test tests/e2e/nav.spec.ts`

- [ ] **Step 3: Build the bottom nav (5 primary destinations, live map is the home tab)**

Create `components/BottomNav.tsx`:
```typescript
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/', label: 'Map', icon: '\u{1F5FA}\uFE0F' },
  { href: '/routes', label: 'Routes', icon: '\u{1F6E3}\uFE0F' },
  { href: '/leaderboard', label: 'Ranks', icon: '\u{1F3C6}' },
  { href: '/buddy-finder', label: 'Buddies', icon: '\u{1F91D}' },
  { href: '/events', label: 'Events', icon: '\u{1F4C5}' },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      data-testid="bottom-nav"
      className="bottom-nav"
      aria-label="Primary"
    >
      {TABS.map((tab) => {
        const active = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);
        return (
          <Link key={tab.href} href={tab.href} className="bottom-nav-tab" aria-current={active ? 'page' : undefined}>
            <span aria-hidden="true">{tab.icon}</span>
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 4: Build the persistent profile icon (used on both layouts, always top-right)**

Add to the same file (or a small sibling component — keep in `BottomNav.tsx` since it always renders alongside it):
```typescript
export function ProfileLink() {
  return (
    <Link href="/settings" data-testid="profile-link" className="profile-link" aria-label="Settings and profile">
      <span aria-hidden="true">{'\u{1F464}'}</span>
    </Link>
  );
}
```
(Add `import Link from 'next/link';` once at the top, shared by both exports.)

- [ ] **Step 5: Adapt the existing `NavBar` for the ≥768px case, tagging it for the test**

Modify `components/NavBar.tsx` — add `data-testid="top-nav"` to the existing `<nav>` element (its markup otherwise stays the flat link row it already is; the `.top-nav` CSS class added in Step 7 governs when it's visible):
```typescript
import Link from 'next/link';

export function NavBar() {
  return (
    <nav data-testid="top-nav" className="top-nav">
      <Link href="/">ironCult</Link>
      <Link href="/routes">Routes</Link>
      <Link href="/leaderboard">Leaderboard</Link>
      <Link href="/buddy-finder">Buddy Finder</Link>
      <Link href="/events">Events</Link>
      <Link href="/settings">Settings &amp; Crew</Link>
    </nav>
  );
}
```
(Drops the old inline `style={}` in favor of the `.top-nav` class from Step 7, and drops the `/map` link — the live map is now `/` itself, already reachable via the "ironCult" home link.)

- [ ] **Step 6: Wrap both in `AppNav`, rendered unconditionally so CSS — not JS — decides which shows**

Create `components/AppNav.tsx`:
```typescript
import { NavBar } from './NavBar';
import { BottomNav, ProfileLink } from './BottomNav';

export function AppNav() {
  return (
    <>
      <NavBar />
      <BottomNav />
      <ProfileLink />
    </>
  );
}
```
Rendering both server-side and letting CSS toggle visibility (rather than a `useMediaQuery` hook) avoids a hydration flash where the wrong nav briefly shows before JS measures the viewport — the CSS media query in Step 7 is authoritative from first paint.

- [ ] **Step 7: CSS — the breakpoint switch, thumb-zone sizing, safe-area padding**

Modify `app/globals.css`, add:
```css
:root {
  --nav-height: 64px;
}

.top-nav { display: none; }
.bottom-nav {
  display: flex;
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: calc(var(--nav-height) + var(--safe-bottom));
  padding-bottom: var(--safe-bottom);
  background: var(--panel);
  border-top: 1px solid var(--line);
  z-index: 30;
}
.bottom-nav-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-height: var(--touch-min);
  font-size: 0.7rem;
  text-decoration: none;
  color: var(--mist);
}
.bottom-nav-tab[aria-current='page'] { color: var(--signal); }
.profile-link {
  position: fixed;
  top: calc(var(--safe-top) + 0.75rem);
  right: 0.75rem;
  z-index: 30;
  width: var(--touch-min);
  height: var(--touch-min);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--panel);
  border: 1px solid var(--line);
  text-decoration: none;
}

@media (min-width: 768px) {
  .top-nav {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    border-bottom: 1px solid var(--line);
  }
  .bottom-nav, .profile-link { display: none; }
}
```
Every page's content needs bottom padding on mobile so the fixed bottom nav doesn't cover it — add to `body`:
```css
body { padding-bottom: calc(var(--nav-height) + var(--safe-bottom)); }
@media (min-width: 768px) { body { padding-bottom: 0; } }
```
(The homepage/map is the deliberate exception — Task 3's `LiveMap` is `100dvh` and meant to run full-bleed under the nav, not padded above it; scope this `body` padding rule so it doesn't fight the map. Simplest fix: move the padding onto a wrapper the non-map pages share, e.g. give `app/(app)/layout.tsx` — check whether one exists; create it if not — a class the map's route group doesn't use, rather than a blanket `body` rule.)

- [ ] **Step 8: Wire `AppNav` into the root layout**

Modify `app/layout.tsx:14`, replace `<NavBar />` with `<AppNav />` (update the import accordingly).

- [ ] **Step 9: Run the test, confirm it passes**

Run: `npx playwright test tests/e2e/nav.spec.ts`

- [ ] **Step 10: Run the full suite** — confirm no other e2e spec broke from the nav swap (the four pre-existing specs render pages that include the nav; check none of them was asserting on the old NavBar's exact markup).

Run: `npx vitest run` and `npx playwright test`

- [ ] **Step 11: Code review pass** — confirm the CSS breakpoint match (`min-width: 768px`) is the only place mobile/desktop nav visibility is decided (no leftover JS `matchMedia` toggle fighting it); confirm `aria-label`/`aria-current` are present for accessibility.

- [ ] **Step 12: Simplify pass.**

- [ ] **Step 13: Commit and push**

```powershell
& $git add components/BottomNav.tsx components/AppNav.tsx components/NavBar.tsx app/layout.tsx app/globals.css tests/e2e/nav.spec.ts
& $git commit -m "feat: adaptive nav - Pixel 7 bottom tab bar + desktop top bar, CSS-only breakpoint"
& $git push origin mobile-redesign
```

**Acceptance criteria:**
- [ ] On Pixel 7 viewport: exactly 5 bottom-nav tabs, each ≥44px tall, positioned in the bottom ~40% of the screen; top nav hidden
- [ ] Settings reachable via a persistent top-right icon (not a 6th bottom tab)
- [ ] At ≥768px viewport: top nav visible, bottom nav and profile icon hidden
- [ ] No hydration flash — nav choice is CSS-driven, not `useMediaQuery`
- [ ] Full pre-existing test suite still green

**STOP-AND-REVIEW CHECKPOINT.**

---

### Task 7: Global background texture — Bonneville engine photo

**Branch:** `mobile-redesign`

**Files:**
- Add (already produced, optimized, and committed as binary assets — see Step 1): `public/backgrounds/bonneville-engine-bg.jpg`, `public/backgrounds/bonneville-engine-bg-mobile.jpg`
- Modify: `app/globals.css` (`body` background rules)
- Test: `tests/e2e/background-mobile.spec.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks — pure CSS addition to `body`, orthogonal to the nav/map work.
- Produces: a `body` background visible only in the empty space around `.panel` cards and around the bottom/top nav bars (which have their own opaque `--panel` background) — never competing with map or text legibility, per the user's "high scrim opacity" requirement.

- [ ] **Step 1: Source image already optimized — record provenance**

The source photo (a Triumph Bonneville T100 Black engine, 1920×2880, 807KB JPEG) was resized and re-encoded with .NET `System.Drawing` (no new npm dependency needed for a one-time asset prep):
- `public/backgrounds/bonneville-engine-bg.jpg` — 900×1350, quality 72, 142KB (tablet/desktop, ≥768px)
- `public/backgrounds/bonneville-engine-bg-mobile.jpg` — 480×720, quality 65, 42KB (mobile, <768px)

Both are already committed-ready in `public/backgrounds/`. If this task is executed by a fresh subagent that doesn't have them, regenerate from the same source with:
```powershell
Add-Type -AssemblyName System.Drawing
function Resize-Jpeg($srcPath, $dstPath, $width, $quality) {
  $original = [System.Drawing.Image]::FromFile($srcPath)
  $ratio = $width / $original.Width
  $height = [int]([math]::Round($original.Height * $ratio))
  $resized = New-Object System.Drawing.Bitmap($width, $height)
  $graphics = [System.Drawing.Graphics]::FromImage($resized)
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.DrawImage($original, 0, 0, $width, $height)
  $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
  $params = New-Object System.Drawing.Imaging.EncoderParameters(1)
  $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [int64]$quality)
  $resized.Save($dstPath, $codec, $params)
  $graphics.Dispose(); $resized.Dispose(); $original.Dispose()
}
Resize-Jpeg "<source.jpg>" "public\backgrounds\bonneville-engine-bg.jpg" 900 72
Resize-Jpeg "<source.jpg>" "public\backgrounds\bonneville-engine-bg-mobile.jpg" 480 65
```

- [ ] **Step 2: Write the failing test**

Create `tests/e2e/background-mobile.spec.ts`:
```typescript
import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['Pixel 7'] });

test('body uses the mobile-optimized background image with a high-opacity dark scrim, no overflow added', async ({ page }) => {
  await page.goto('/routes'); // a page with empty body space around its .panel cards, unlike the full-bleed map homepage
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundImage);
  expect(bg).toContain('bonneville-engine-bg-mobile.jpg');
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(hasOverflow).toBe(false);
});

test.describe('desktop', () => {
  test.use({ viewport: { width: 1024, height: 768 } });
  test('body uses the larger background variant at desktop width', async ({ page }) => {
    await page.goto('/routes');
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundImage);
    expect(bg).toContain('bonneville-engine-bg.jpg');
    expect(bg).not.toContain('mobile.jpg');
  });
});
```

- [ ] **Step 3: Run it, confirm it fails** (no background-image set yet)

Run: `npx playwright test tests/e2e/background-mobile.spec.ts`

- [ ] **Step 4: Add the background rules to `app/globals.css`**

Modify the existing `body` rule (originally just `margin`/`background`/`color`/`font-family`) to layer a high-opacity dark scrim over the mobile image by default, swapping to the larger desktop image at the existing `768px` breakpoint:
```css
body {
  margin: 0;
  color: var(--paper);
  font-family: var(--font-display);
  background-color: var(--asphalt);
  background-image:
    linear-gradient(rgba(16, 16, 15, 0.94), rgba(16, 16, 15, 0.94)),
    url('/backgrounds/bonneville-engine-bg-mobile.jpg');
  background-size: cover;
  background-position: top center;
  background-repeat: no-repeat;
  background-attachment: scroll; /* `fixed` is unreliable/janky on iOS and Android Chrome — don't use it here */
}

@media (min-width: 768px) {
  body {
    background-image:
      linear-gradient(rgba(16, 16, 15, 0.94), rgba(16, 16, 15, 0.94)),
      url('/backgrounds/bonneville-engine-bg.jpg');
  }
}
```
The `0.94`-alpha scrim is the "high opacity" the user asked for — it keeps roughly 6% of the photo's tonal detail visible (a hint of the engine casing and Bonneville badge in the negative space around cards) without ever competing with `.panel` text, since every panel already renders on its own opaque `--panel` background on top of this. Do not lower the scrim alpha to make the photo more visible — that's the one explicit constraint from the request this step exists to satisfy.

- [ ] **Step 5: Run the test, confirm it passes**

Run: `npx playwright test tests/e2e/background-mobile.spec.ts`

- [ ] **Step 6: Run the full suite**, confirm the new background doesn't push any existing overflow/visibility assertion from Tasks 1, 6, or the pre-existing specs into failure.

- [ ] **Step 7: Code review pass** — confirm the two JPEGs are actually the resized/compressed versions (142KB and 42KB, not the original 807KB file copied in under a new name); confirm `background-attachment: fixed` was not used; confirm the scrim gradient sits *before* the `url(...)` in the `background-image` list (CSS layers first-listed-on-top, so the gradient must come first to sit above the photo).

- [ ] **Step 8: Simplify pass.**

- [ ] **Step 9: Commit and push**

```powershell
& $git add public/backgrounds/bonneville-engine-bg.jpg public/backgrounds/bonneville-engine-bg-mobile.jpg app/globals.css tests/e2e/background-mobile.spec.ts
& $git commit -m "feat: subtle global background texture (Bonneville engine photo, high-opacity scrim)"
& $git push origin mobile-redesign
```

**Acceptance criteria:**
- [ ] `public/backgrounds/bonneville-engine-bg-mobile.jpg` (480×720, ~42KB) and `bonneville-engine-bg.jpg` (900×1350, ~142KB) exist and are the compressed/resized versions, not the 807KB original
- [ ] `body` shows the mobile variant below 768px, the desktop variant at 768px+
- [ ] Scrim is high-opacity (0.94 alpha) — text and `.panel` content remain fully legible, image reads as a faint texture only
- [ ] `background-attachment` is `scroll`, never `fixed`
- [ ] No added horizontal overflow on any existing page at Pixel 7 width
- [ ] Full pre-existing suite still green

**STOP-AND-REVIEW CHECKPOINT.**

---

### Task 8: Mobile redesign — Routes list & route creation form

**Branch:** `mobile-redesign`

**Files:**
- Modify: `app/(app)/routes/page.tsx`
- Modify: `app/(app)/routes/new/page.tsx`
- Modify: `app/globals.css` (extend `.panel` usage patterns if needed — no new primitives expected)
- Test: `tests/e2e/routes-mobile.spec.ts`

**Interfaces:**
- Consumes: existing `GET /api/routes`/`POST /api/routes` (unchanged) — this task is layout-only, no API changes.

- [ ] **Step 1: Write the failing mobile layout test**

Create `tests/e2e/routes-mobile.spec.ts`:
```typescript
import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['Pixel 7'] });

test('routes list renders single-column cards with touch-sized rating controls', async ({ page }) => {
  await page.goto('/routes');
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(hasOverflow).toBe(false);

  const cards = page.locator('.panel');
  const count = await cards.count();
  if (count > 0) {
    const box = await cards.first().boundingBox();
    expect(box?.width).toBeGreaterThan(350); // near-full-width single column on a 412px viewport
  }
});

test('route creation form fields and submit button are touch-sized', async ({ page }) => {
  await page.goto('/routes/new');
  const submit = page.getByRole('button', { name: /save|create|submit/i });
  const box = await submit.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(44);
});
```

- [ ] **Step 2: Run it, confirm current state (likely already passes for overflow, may fail on the width assertion depending on today's inline `maxWidth`)**

Run: `npx playwright test tests/e2e/routes-mobile.spec.ts`

- [ ] **Step 3: Read the current `app/(app)/routes/page.tsx` in full and update its layout for single-column mobile**

Replace any fixed `maxWidth` inline style that would leave excess side margin on a 412px viewport with a responsive one, e.g. change `style={{ padding: '1rem', maxWidth: 640 }}`-style wrappers to:
```typescript
<div style={{ padding: '1rem', maxWidth: 640, margin: '0 auto', width: '100%' }}>
```
`maxWidth` caps it on desktop; `width: '100%'` plus `margin: '0 auto'` makes it fill the Pixel 7 viewport instead of leaving dead space. Apply the same pattern to every `.panel`-wrapped list item so cards read full-width on mobile.

- [ ] **Step 4: Same pass on `app/(app)/routes/new/page.tsx`** — read it in full, apply the same responsive wrapper pattern, and confirm every `<input>`/`<select>`/submit `<button>` inherits `min-height: var(--touch-min)` from the global `button` rule (Task 1) — form `<input>`/`<select>` elements don't get that rule automatically since it's scoped to `button`, so add to `globals.css`:
```css
input, select, textarea {
  min-height: var(--touch-min);
  font-size: 16px; /* prevents iOS Safari auto-zoom on focus; harmless on Android */
}
```

- [ ] **Step 5: Run the test, confirm it passes**

Run: `npx playwright test tests/e2e/routes-mobile.spec.ts`

- [ ] **Step 6: Run the full suite** to confirm the pre-existing `routes-list.spec.ts`/`routes-new.spec.ts` specs still pass.

- [ ] **Step 7: Code review pass** — confirm no layout regression at desktop width (spot-check `chromium` project still passes the same specs).

- [ ] **Step 8: Simplify pass.**

- [ ] **Step 9: Commit and push**

```powershell
& $git add "app/(app)/routes" app/globals.css tests/e2e/routes-mobile.spec.ts
& $git commit -m "feat: mobile-responsive routes list and route creation form"
& $git push origin mobile-redesign
```

**Acceptance criteria:**
- [ ] No horizontal overflow on Pixel 7 for `/routes` or `/routes/new`
- [ ] Route cards render near-full-width single-column on a 412px viewport
- [ ] All form inputs and the submit button are ≥44px tall, inputs use 16px font (no iOS zoom-on-focus)
- [ ] Pre-existing desktop-width tests for these pages still pass

**STOP-AND-REVIEW CHECKPOINT.**

---

### Task 9: Mobile redesign — Leaderboard

**Branch:** `mobile-redesign`

**Files:**
- Modify: `app/(app)/leaderboard/page.tsx`
- Test: `tests/e2e/leaderboard-mobile.spec.ts`

**Interfaces:** none — layout-only, `GET /api/leaderboard/*` unchanged.

- [ ] **Step 1: Write the failing test**

Create `tests/e2e/leaderboard-mobile.spec.ts`:
```typescript
import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['Pixel 7'] });

test('leaderboard columns stack vertically on Pixel 7 instead of sitting side by side', async ({ page }) => {
  await page.goto('/leaderboard');
  const panels = page.locator('.panel');
  await expect(panels).toHaveCount(2);
  const first = await panels.nth(0).boundingBox();
  const second = await panels.nth(1).boundingBox();
  // stacked means the second panel starts below the first, not beside it
  expect(second!.y).toBeGreaterThanOrEqual(first!.y + first!.height - 5);
});
```

- [ ] **Step 2: Run it, confirm it fails** — today's page uses `flex-wrap: wrap` with `flex: 1 1 320px`, which on a 412px viewport puts both 320px-min panels on separate lines already in most cases, but confirm with the real assertion rather than assuming; if it already passes, the fix is smaller than expected — still proceed to Step 3 to make the stacking explicit and remove reliance on wrap arithmetic.

Run: `npx playwright test tests/e2e/leaderboard-mobile.spec.ts`

- [ ] **Step 3: Read `app/(app)/leaderboard/page.tsx` in full, replace the `flex-wrap` layout with an explicit mobile-first stack**

Change the wrapping container's inline style from the current `flex`/`flex-wrap: wrap` pattern to a CSS class-driven one:
```typescript
<div className="leaderboard-columns">
  {/* existing two .panel columns unchanged */}
</div>
```
Add to `app/globals.css`:
```css
.leaderboard-columns {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
@media (min-width: 768px) {
  .leaderboard-columns {
    flex-direction: row;
  }
  .leaderboard-columns > .panel {
    flex: 1 1 320px;
  }
}
```

- [ ] **Step 4: Run the test, confirm it passes**

- [ ] **Step 5: Run the full suite**, confirm `tests/e2e/leaderboard.spec.ts` (pre-existing) still passes.

- [ ] **Step 6: Code review pass** — confirm the ≥768px behavior still matches the original side-by-side layout (visual parity at desktop width).

- [ ] **Step 7: Simplify pass.**

- [ ] **Step 8: Commit and push**

```powershell
& $git add "app/(app)/leaderboard" app/globals.css tests/e2e/leaderboard-mobile.spec.ts
& $git commit -m "feat: explicit mobile-stacked leaderboard columns"
& $git push origin mobile-redesign
```

**Acceptance criteria:**
- [ ] Crew and rider leaderboard panels stack vertically on Pixel 7
- [ ] Panels sit side-by-side again at ≥768px (unchanged desktop behavior)
- [ ] Pre-existing `leaderboard.spec.ts` still passes

**STOP-AND-REVIEW CHECKPOINT.**

---

### Task 10: Mobile redesign — Settings & crew picker

**Branch:** `mobile-redesign`

**Files:**
- Modify: `app/(app)/settings/page.tsx`
- Modify: `app/(app)/settings/crew-picker.tsx`
- Test: `tests/e2e/settings-mobile.spec.ts`

**Interfaces:** none — layout-only.

- [ ] **Step 1: Write the failing test**

Create `tests/e2e/settings-mobile.spec.ts`:
```typescript
import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['Pixel 7'] });

test('settings form fills the Pixel 7 width without overflow and all fields are touch-sized', async ({ page }) => {
  await page.goto('/settings');
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(hasOverflow).toBe(false);

  const form = page.locator('form');
  const box = await form.boundingBox();
  expect(box?.width).toBeGreaterThan(350);
});
```

- [ ] **Step 2: Run it, confirm current state.**

- [ ] **Step 3: Read `app/(app)/settings/page.tsx` in full, apply the same responsive-wrapper pattern from Task 8 Step 3** (`maxWidth` + `width: '100%'` + `margin: '0 auto'`) to its `.panel` (currently `maxWidth: 480`).

- [ ] **Step 4: Read `app/(app)/settings/crew-picker.tsx` in full**, confirm any crew-list buttons/rows meet the 44px touch floor (they should already, via the global `button` rule from Task 1, unless the picker uses non-`<button>` clickable `<div>`s — if so, add `min-height: var(--touch-min)` directly to that element's style).

- [ ] **Step 5: Run the test, confirm it passes.**

- [ ] **Step 6: Run the full suite**, confirm pre-existing `settings.spec.ts` still passes.

- [ ] **Step 7: Code review pass.**

- [ ] **Step 8: Simplify pass.**

- [ ] **Step 9: Commit and push**

```powershell
& $git add "app/(app)/settings" tests/e2e/settings-mobile.spec.ts
& $git commit -m "feat: mobile-responsive settings and crew picker"
& $git push origin mobile-redesign
```

**Acceptance criteria:**
- [ ] No horizontal overflow on `/settings` at Pixel 7 width
- [ ] Form fills near-full viewport width
- [ ] Crew-picker interactive rows meet the 44px touch floor
- [ ] Pre-existing `settings.spec.ts` still passes

**STOP-AND-REVIEW CHECKPOINT.**

---

### Task 11: Mobile redesign — Buddy Finder & Events

**Branch:** `mobile-redesign`

**Files:**
- Modify: `app/(app)/buddy-finder/page.tsx`
- Modify: `app/(app)/events/page.tsx`
- Test: `tests/e2e/buddy-finder-mobile.spec.ts`
- Test: `tests/e2e/events-mobile.spec.ts`

**Interfaces:** none — layout-only.

- [ ] **Step 1: Write the failing tests**

Create `tests/e2e/buddy-finder-mobile.spec.ts`:
```typescript
import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['Pixel 7'] });

test('buddy finder posts render single-column without overflow', async ({ page }) => {
  await page.goto('/buddy-finder');
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(hasOverflow).toBe(false);
});
```

Create `tests/e2e/events-mobile.spec.ts`:
```typescript
import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['Pixel 7'] });

test('events list renders single-column without overflow, happening-now badge stays visible', async ({ page }) => {
  await page.goto('/events');
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(hasOverflow).toBe(false);
});
```

- [ ] **Step 2: Run both, confirm current state** (these pages just merged in from `track-b` in Task 5 and were built desktop-first — expect overflow or cramped multi-column layouts to actually appear here).

Run: `npx playwright test tests/e2e/buddy-finder-mobile.spec.ts tests/e2e/events-mobile.spec.ts`

- [ ] **Step 3: Read `app/(app)/buddy-finder/page.tsx` in full**, apply the Task 8-style responsive wrapper to its list container and any filter controls; if filters are laid out in a fixed-width row, switch that row to `flex-direction: column` below 768px via a new `.filter-row` class in `globals.css`:
```css
.filter-row {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
@media (min-width: 768px) {
  .filter-row { flex-direction: row; }
}
```

- [ ] **Step 4: Read `app/(app)/events/page.tsx` in full**, apply the same responsive wrapper and `.filter-row` class where it has its own filter/create-form controls; confirm the happening-now badge (yellow `--visor`) isn't clipped by a fixed-width container at 412px.

- [ ] **Step 5: Run both tests, confirm they pass.**

- [ ] **Step 6: Run the full suite** — confirm the pre-existing `buddy-finder.spec.ts`/`events.spec.ts` (brought in from Task 5's merge) still pass.

- [ ] **Step 7: Code review pass.**

- [ ] **Step 8: Simplify pass.**

- [ ] **Step 9: Commit and push**

```powershell
& $git add "app/(app)/buddy-finder" "app/(app)/events" app/globals.css tests/e2e/buddy-finder-mobile.spec.ts tests/e2e/events-mobile.spec.ts
& $git commit -m "feat: mobile-responsive buddy finder and events pages"
& $git push origin mobile-redesign
```

**Acceptance criteria:**
- [ ] No horizontal overflow on `/buddy-finder` or `/events` at Pixel 7 width
- [ ] Filter controls stack vertically below 768px
- [ ] Happening-now badge remains visible/unclipped at 412px width
- [ ] Pre-existing specs for both pages still pass

**STOP-AND-REVIEW CHECKPOINT.**

---

### Task 12: Documentation, cleanup & repo presentation

**Branch:** `mobile-redesign`

**Files:**
- Modify: `CLAUDE.md` (Gotchas section)
- Modify: `.claude/rules/github-projects.md` (label list)
- Modify: `AGENTS.md` (mirror the relevant `CLAUDE.md` changes)
- Modify: `README.md`
- Delete: whatever orphaned files Step 5 finds
- No tests — this is a docs/repo-hygiene task, verified by review rather than TDD.

- [ ] **Step 1: Add new Gotchas to `CLAUDE.md`**

Append to the Gotchas list (after the existing final entry) — these are the non-obvious patterns this plan introduced that a future session/agent needs to know before touching this code again:

```markdown
- **Nav visibility is CSS-only, not `useMediaQuery`.** `components/AppNav.tsx` renders both
  `NavBar` (top, ≥768px) and `BottomNav`+`ProfileLink` (bottom tabs, <768px) unconditionally —
  `app/globals.css`'s `@media (min-width: 768px)` block is the only thing that decides which is
  visible. Don't reintroduce a JS-measured toggle; it reintroduces the hydration-flash bug this
  pattern was chosen to avoid.
- **The live map is the homepage (`/`), not a `/map` subpage.** The original Track B plan drafted
  a separate `/map` route; the mobile-first pass folded it into `app/page.tsx` directly so the map
  loads on first paint. If you see a stray reference to `/map` anywhere (old branch, doc, or a
  cached NavBar link), it's stale — fix the reference, don't recreate the route.
- **`100dvh`, never bare `100vh`, for anything meant to fill the mobile screen.** Bare `vh` on
  Android Chrome is measured against the viewport with the address bar collapsed, which overshoots
  the visible area on load and clips content — this bit `components/LiveMap.tsx` during the mobile
  redesign. `--safe-top`/`--safe-bottom`/`--touch-min`/`--breakpoint-tablet`/`--nav-height` are the
  five CSS custom properties that pattern depends on; don't duplicate them under new names.
- **MapLibre marker hit-areas (16–18px) are below the 44px touch-target floor** the rest of the app
  meets — a known, deliberately accepted gap from the mobile redesign (Task 3), not an oversight.
  Don't "fix" it by silently shrinking the visual marker size to hide the mismatch; if it's ever
  actually fixed, it needs a padded invisible hit-area, not a smaller marker.
- **`phase:5` is the GitHub label for this cross-track mobile-redesign work** — it isn't `track:A`
  or `track:B` because it touches both tracks' pages after both were otherwise complete, the same
  way `phase:4` already covers cross-track integration. Reuse `phase:5` for any future work in this
  same "touches everything, both tracks are done" shape rather than inventing another label.
```

- [ ] **Step 2: Update `.claude/rules/github-projects.md`'s label list**

Modify the `## Issues` section's label sentence (currently `Labels: `phase:0`, `track:A`, `track:B`, `phase:4``) to add `phase:5`:
```markdown
Labels: `phase:0`, `track:A`, `track:B`, `phase:4`, `phase:5` (per the design spec's tagging
scheme, extended for the mobile-redesign pass — see `CLAUDE.md` Gotchas) — this is what lets the
board reflect plan progress without extra bookkeeping.
```

- [ ] **Step 3: Audit the whole `CLAUDE.md` for staleness/quality**

If your tooling has the `claude-md-management:claude-md-improver` skill, invoke it against this repo's `CLAUDE.md` (after Step 1's manual Gotchas addition) and apply whatever targeted fixes it recommends. Otherwise, do the same audit manually: read `CLAUDE.md` top to bottom and check every fact against the current codebase state, since a large new feature area (mobile nav, live map, turf-war) just landed. Specifically confirm/fix:
- The directory map's `components/` and `public/map/` descriptions now mention `LiveMap.tsx`, `BottomNav.tsx`, `AppNav.tsx` (they didn't exist when the directory map was last written).
- The "Note" about `docs/superpowers/plans/` still saying "6-hour" in places — check whether it's still accurate or whether it can finally be resolved now that the hackathon day is further along.
- No other section references a file, route, or component this plan removed or renamed (e.g. `/map` as a route, the old inline-styled `NavBar` markup, `app/page.module.css` if Task 12's Step 5 deleted it — cross-check against what that step actually found).
- The Gotchas list (Step 1's additions plus the pre-existing ones) reads as one consistent list, not two stapled-together sections.

Don't skip this step even though Step 1 already hand-wrote the new Gotchas — it catches drift elsewhere in the file that this plan's own changes may have made outdated.

- [ ] **Step 4: Mirror the relevant changes into `AGENTS.md`**

Read `AGENTS.md`'s own project-rules section (below the Next.js-managed block) and update it to match `CLAUDE.md` post-Step-3: in particular its "Non-negotiable, repo-wide" list should gain a line about the CSS-only nav breakpoint and the `100dvh`/safe-area convention if `CLAUDE.md`'s own non-negotiables gained one, and its "Read before writing any code" pointer list should mention this plan doc. Keep it a mirror of intent, not a verbatim copy — `AGENTS.md` is deliberately the agent-agnostic subset for tools that don't read `CLAUDE.md`.

- [ ] **Step 5: Find and remove orphaned files**

Run:
```powershell
# Files that exist but nothing imports — spot-check candidates first, don't blind-delete
Select-String -Path "c:\Users\FlyerOne\Desktop\ironCult\app\page.module.css" -Pattern "." -ErrorAction SilentlyContinue
Get-ChildItem -Recurse -Path "c:\Users\FlyerOne\Desktop\ironCult\app","c:\Users\FlyerOne\Desktop\ironCult\components" -Include *.tsx,*.ts,*.css | ForEach-Object { $_.FullName }
```
Specifically check: `app/page.module.css` (a track-b-era leftover for the old CTA-card homepage layout — Task 3 replaced `app/page.tsx` with the full-screen map, so this stylesheet is very likely now unused; confirm with `Select-String -Path "app\**\*.tsx" -Pattern "page.module.css"` before deleting) and any other `.module.css`/component file with zero remaining importers. Delete only files confirmed orphaned by an actual reference search, not by assumption — this is exactly the kind of "investigate before deleting" case the global CLAUDE.md's risk-handling guidance calls out.

- [ ] **Step 6: Update `README.md`**

Read it in full, then add/update a section describing the mobile-first redesign: live map as the home screen, turf-war layer, bottom-tab navigation on phones, Pixel 7 as the reference device, and that the app is usable end-to-end on a phone browser from the Vercel deployment. Keep the existing tech-stack/features/hackathon-details structure the prior README pass (`5ccc789`) established — extend it, don't restructure it wholesale.

- [ ] **Step 7: Confirm the GitHub repo is visible to everyone who needs to see it**

Run: `gh repo view malkavian-librarian/ironCult --json visibility,url`
If it reports `"visibility": "PRIVATE"` and the user wants it externally viewable for the hackathon demo/judging, that's a real visibility change (affects who can see the code) — **check with the user before running `gh repo edit --visibility public`**, don't flip it unilaterally. If it's already `PUBLIC`, nothing to do here.

- [ ] **Step 8: Commit and push**

```powershell
& $git add CLAUDE.md AGENTS.md README.md .claude/rules/github-projects.md
# add any deletions from Step 5 explicitly, e.g.:
# & $git rm app/page.module.css
& $git commit -m "docs: mobile-redesign gotchas, phase:5 label, README refresh, orphaned-file cleanup"
& $git push origin mobile-redesign
```

**Acceptance criteria:**
- [ ] `CLAUDE.md` Gotchas section documents the CSS-only nav pattern, the `/` -as-map decision, the `dvh` requirement, the marker touch-target gap, and the `phase:5` label
- [ ] `CLAUDE.md` was audited (via the `claude-md-improver` skill if available, otherwise the manual checklist in Step 3) and its recommended/found fixes were applied (or explicitly declined with a stated reason)
- [ ] `AGENTS.md`'s project-rules section reflects the same non-negotiables `CLAUDE.md` now states
- [ ] Every file deleted in this task was confirmed orphaned via an actual import/reference search, not assumption
- [ ] `README.md` describes the live-map homepage, turf-war, and mobile navigation
- [ ] Repo visibility confirmed (and changed only with explicit user sign-off if it needed to change)

**STOP-AND-REVIEW CHECKPOINT.**

---

### Task 13: Cross-page mobile QA pass + merge to `main`

**Branch:** `mobile-redesign`

**Files:**
- Create: `tests/e2e/mobile-suite.spec.ts` (a single spec that walks every route at Pixel 7 width, for a fast one-command regression check)
- No source changes expected unless this pass finds a gap — if it does, fix inline in this task rather than deferring, since this is the final gate before merge.

**Interfaces:** none.

- [ ] **Step 1: Write the cross-page smoke spec**

Create `tests/e2e/mobile-suite.spec.ts`:
```typescript
import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['Pixel 7'] });

const routes = ['/', '/routes', '/routes/new', '/leaderboard', '/buddy-finder', '/events', '/settings'];

for (const route of routes) {
  test(`${route} has no horizontal overflow on Pixel 7`, async ({ page }) => {
    await page.goto(route);
    const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(hasOverflow).toBe(false);
  });

  test(`${route} bottom nav (or top nav on desktop) is present`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator('[data-testid="bottom-nav"]')).toBeVisible();
  });
}
```

- [ ] **Step 2: Run it**

Run: `npx playwright test tests/e2e/mobile-suite.spec.ts`
Expected: all pass. If any route fails, fix that route's layout now (reopening the relevant earlier task's page file) rather than shipping a known regression.

- [ ] **Step 3: Manual device-emulated walkthrough** — with `npm run dev` running, open Chrome DevTools device toolbar set to Pixel 7 (412×915), and click through every bottom-nav tab plus the presence toggle and the profile icon. Confirm: no tap requires zooming first, the map loads and pans with one finger, the turf-war fill is visible, nothing sits under the bottom nav bar or behind the status bar.

- [ ] **Step 4: Run the complete test suite one final time**

Run: `npx vitest run`, `npx tsc --noEmit`, `npx playwright test` (both `chromium` and `pixel7` projects plus every `test.use({ ...devices['Pixel 7'] })` spec)

- [ ] **Step 5: Security review** (per global CLAUDE.md gate, required before every push) — if your tooling has the `security-review` skill, run it. Otherwise do the same review manually against this plan's actual diff, focused on what's new: `POST /api/presence` (auth required, already `requireAuth`-gated — confirm it still is), `GET /api/turf-war` and `GET /api/presence` (public reads — confirm they leak nothing beyond what's already intended, e.g. no offline riders' locations), the new `public/backgrounds/*.jpg` files (confirm no EXIF/location metadata survived the resize — re-strip with the same `System.Drawing` resize path if unsure, it doesn't preserve EXIF by default), and no secrets/`.env*` files staged (`git status` before the final `git add`). Fix any CRITICAL/HIGH-equivalent findings before continuing either way.

- [ ] **Step 6: Commit, push, open the PR**

```powershell
& $git add tests/e2e/mobile-suite.spec.ts
& $git commit -m "test: cross-page Pixel 7 smoke suite"
& $git push origin mobile-redesign
gh pr create --base main --head mobile-redesign --title "Mobile-first redesign: bottom nav, live-map homepage, Pixel 7 layout pass" --body "Closes #<nav issue>, closes #<routes issue>, closes #<leaderboard issue>, closes #<settings issue>, closes #<buddy-finder/events issue>, closes #<QA issue>"
```
(Fill in the real issue numbers from the `phase:5` label once filed — don't leave the placeholder text in the actual PR body.)

- [ ] **Step 7: Merge** — check with the user before merging to `main`, per the repo's own risk posture for shared-branch actions.

- [ ] **Step 8: Update the board** — close all `phase:5` issues, verify Vercel's deploy from `main` succeeds, then do a final phone check against the live `https://ironcult.vercel.app` URL on an actual or emulated Pixel 7 before calling the work done.

**Acceptance criteria:**
- [ ] `mobile-suite.spec.ts` passes for all 7 routes (no overflow, nav present)
- [ ] Manual DevTools Pixel 7 walkthrough covers every nav tab + the map + presence toggle with no defects found (or defects found are fixed before merge, not deferred)
- [ ] Full suite (`vitest`, `tsc --noEmit`, `playwright` both projects) green
- [ ] Security review run (skill or manual checklist) with no unresolved CRITICAL/HIGH-equivalent findings
- [ ] PR merged into `main`, Vercel deploy verified live

---

## Self-Review

**Spec coverage:** every element of the user's ask is covered — live map as home screen (Task 3), territories/turf-war (Task 4), menu redesign (Task 6), background photo treatment with a high-opacity scrim (Task 7), views redesign (Tasks 8–11), Pixel 7 target with researched best practices baked into the Global Constraints (thumb-zone bottom nav, 44px touch targets, `dvh` not `vh`, safe-area insets, 5-tab cap) and Task 1's foundation, TDD structure (every task writes a failing Playwright/Vitest test before the implementation step), GitHub issues + acceptance criteria (stated per task, `phase:5` label defined) and GitHub Projects board usage (Process notes section, applied to every task), cheaper-model delegation for boilerplate test-writing and code review (Process notes section, per `CLAUDE.md`'s model table), review run automatically at the end of every task rather than only at the final merge (Process notes section), tool-agnostic subagent-friendly decomposition (each task is self-contained enough to hand to a fresh subagent/session regardless of which agentic tool is running this plan), and the mid-turn documentation/cleanup requests — updated Gotchas, updated `.claude/rules/github-projects.md` label list, `claude-md-improver` run, `AGENTS.md` mirrored to `CLAUDE.md`, orphaned-file cleanup, README refresh, and repo-visibility check — all covered by Task 12.

**Placeholder scan:** no "TBD"/"handle edge cases" left in any step; the one deliberately-deferred item (marker hit-area size in Task 3) is called out explicitly as a known, accepted gap rather than hidden.

**Type/name consistency:** `PresenceToggle` (Task 2) is referenced identically in Task 3's `app/page.tsx`; `LiveMap` (Task 3) is the same component Task 4 modifies; `isOnline`/`pickOwner` signatures match between their unit tests and implementations; `--safe-bottom`/`--touch-min`/`--breakpoint-tablet`/`--nav-height` (Task 1 and Task 6) are the only new CSS custom properties introduced and every later task's CSS reuses those exact names rather than inventing new ones.

---

Plan complete, saved to `docs/superpowers/plans/2026-08-28-mobile-first-redesign.md`. Execute it task-by-task in order (1→13), stopping at each **STOP-AND-REVIEW CHECKPOINT** for a human to look at the diff before continuing — whether that's one long session working straight through, or a fresh subagent/session picking up one task at a time, is an implementation choice for whichever tool runs this; the plan itself doesn't require either.
