# ironCult Track B — Live Map & Social Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build buddy finder, events, presence, and the live map — the "whoa" feature of ironCult: a Poland map showing riders currently out, events happening now, and a turf-war layer coloring voivodeships by which crew has the most routes there.

**Architecture:** Next.js App Router route handlers under `app/api/*`, Drizzle ORM against Neon Postgres, JWT/Bearer auth via `requireAuth()`, MapLibre GL JS for the map, browser Geolocation API for presence, client-side polling (no websockets).

**Tech Stack:** Next.js, TypeScript, Drizzle ORM, MapLibre GL JS, Vitest, Playwright (local smoke checks only).

## Global Constraints

- **You are starting cold in a fresh session/environment (possibly opencode + GLM-5.2) with no memory of how this plan was written.** Everything you need is either in this file or already committed to the repo — clone/pull first and read `lib/db/schema.ts`, `lib/auth/require-auth.ts`, `lib/geo/voivodeship.ts`, `public/map/poland-voivodeships.json`, and `app/globals.css` before writing any code. **Do not modify any file Track A owns** (`app/api/profile/*`, `app/api/crews/*`, `app/api/leaderboard/*`, `app/api/routes/*` except as a read-only SQL consumer described in Task 5, `app/(app)/settings/*`, `app/(app)/leaderboard/*`, `app/(app)/routes/*`) — you may read the `routes`/`crews` tables via SQL but never edit Track A's application code, to avoid merge conflicts.
- Repo: `https://github.com/malkavian-librarian/ironCult`. Clone it if you don't have it locally: `git clone https://github.com/malkavian-librarian/ironCult.git`.
- Project board: `https://github.com/users/malkavian-librarian/projects/1/views/1`. Your issues are labeled `track:B`.
- **Git binary:** if `git` is in your environment's PATH already (typical for opencode on Linux/Mac), just use `git` directly — confirm with `git --version` first. If you're on the same Windows machine without git in PATH, use `C:\Users\FlyerOne\AppData\Local\GitHubDesktop\app-3.5.11\resources\app\git\cmd\git.exe` (store as `$git` in PowerShell).
- **Branch:** work on a branch named `track-b` (create from `main`: `git checkout -b track-b`). Push to `track-b`, open PRs from `track-b` into `main` — never push directly to `main`.
- **GitHub is a required part of every task, not optional bookkeeping.** For each task below:
  1. Before starting, comment on the task's GitHub issue: `gh issue comment <number> --body "Starting: <task name>"`.
  2. Every commit message references the issue: e.g. `git commit -m "feat: add buddy finder posts API (#13)"`. **Issue numbers for this track are #13–#18** (Phase 0 used #1–#6, Track A used #7–#12): Task 1→#13, Task 2→#14, Task 3→#15, Task 4→#16 (presence pins) and #17 (event pins), Task 5→#18. The per-task `gh issue comment <n>`/`Closes #<n>` calls below use these numbers.
  3. After finishing (tests passing, reviewed, simplified, smoke-tested), push and open/update a PR: `gh pr create --base main --head track-b --title "<task>" --body "Closes #<number>"`.
  4. Comment on the issue when done, with a one-line summary.
  If `gh` isn't available, do the equivalent via the GitHub web UI — do not skip this, it's an explicit user requirement.
- **Acceptance criteria checklist, required before every task (added 2026-08-28):** before starting any task below, its GitHub issue must have an "## Acceptance Criteria" checklist (GitHub `- [ ]` task-list syntax) derived from that task's own **Interfaces** section and test assertions — not a generic "tests pass" line. Issues #13–#18 (this track) were pre-filed in Phase 0 with acceptance criteria already added; if you find one missing it, add it via `gh issue edit <n> --body "..."` before writing code for that task. On finishing a task: re-verify against each criterion individually (run the actual test/command it names), check off (`- [x]`) each one that passed in the issue body, and post a completion comment stating pass/fail per criterion before closing the issue. Full mechanics: `.claude/rules/github-projects.md`.
- **SCOPE UPDATE (2026-08-28, added after this plan was written):** turf-war for the demo is Warsaw-district-based, not whole-Poland-voivodeship-based — see the design spec's 2026-08-28 addendum. This changes Task 5 below: group by `routes.district` (nullable, set only inside Warsaw), not `routes.voivodeship`; render `public/map/warsaw-districts.json`, not `public/map/poland-voivodeships.json`, as the turf-war fill layer's source. Task 5's code samples below have been updated accordingly — read them as written, not as "voivodeship" in the surrounding prose might suggest.
- Time budget: **Track B should take no more than 2.5 hours** (it runs in parallel with Track A, not after it). 5 tasks below — if a task runs long, cut scope (e.g. skip a filter option) rather than consume the whole budget. Report time spent at each checkpoint.
- No Tailwind. Use the CSS custom properties in `app/globals.css` (`--signal`, `--paper`, `--panel`, `--line`, `--visor`, etc.) and the `.panel` class — don't invent a new visual language.
- Every route handler that touches rider-owned data calls `requireAuth(req)` from `@/lib/auth/require-auth` and derives the acting rider from its return value — never trust a client-supplied rider id.
- Read the auth token from `localStorage.getItem('ironcult_token')` in every Client Component that needs it — this is the shared convention Track A also uses, so both tracks' pages behave identically once merged.
- `install maplibre-gl` yourself in Task 4 — Phase 0 did not install it since only Track B uses it.

---

### Task 1: Buddy finder (create post + filtered list)

**Files:**
- Create: `app/api/buddy-posts/route.ts` (POST creates, GET lists with optional `voivodeship`/`date` filters)
- Create: `app/(app)/buddy-finder/page.tsx`
- Test: `tests/integration/buddy-posts.test.ts`

**Interfaces:**
- Consumes: `db`, `buddyPosts`, `riders` from `@/lib/db/schema`; `requireAuth`.
- Produces: `POST /api/buddy-posts` body `{ voivodeship, plannedDate, note? }` (auth required, `riderId` derived from token) → `201`. `GET /api/buddy-posts?voivodeship=<slug>&date=<YYYY-MM-DD>` → `200` array of posts joined with the poster's `displayName`, `style`, `experience`, `pace`, `language` (public read, no auth required — matches events/leaderboard precedent of public browse).

- [ ] **Step 1: Pull latest, create branch**

```bash
git pull origin main
git checkout -b track-b
```

- [ ] **Step 2: Write failing integration test**

Create `tests/integration/buddy-posts.test.ts`:
```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { POST as createPost, GET as listPosts } from '@/app/api/buddy-posts/route';
import { POST as register } from '@/app/api/auth/register/route';

let token: string;

beforeAll(async () => {
  const res = await register(new Request('http://localhost/api/auth/register', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: `buddy-${Date.now()}@example.com`, password: 'hunter22', displayName: 'Buddy Tester' }),
  }));
  token = (await res.json()).token;
});

function authed(url: string, init: RequestInit = {}) {
  return new Request(url, { ...init, headers: { ...init.headers, authorization: `Bearer ${token}` } });
}

describe('buddy-posts API', () => {
  it('creates a post', async () => {
    const res = await createPost(authed('http://localhost/api/buddy-posts', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ voivodeship: 'malopolskie', plannedDate: '2026-09-15', note: 'Looking for two riders, relaxed pace' }),
    }));
    expect(res.status).toBe(201);
  });

  it('lists posts filtered by voivodeship', async () => {
    await createPost(authed('http://localhost/api/buddy-posts', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ voivodeship: 'mazowieckie', plannedDate: '2026-09-20' }),
    }));
    const res = await listPosts(new Request('http://localhost/api/buddy-posts?voivodeship=mazowieckie'));
    const body = await res.json();
    expect(body.every((p: { voivodeship: string }) => p.voivodeship === 'mazowieckie')).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  it('rejects unauthenticated post creation', async () => {
    const res = await createPost(new Request('http://localhost/api/buddy-posts', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ voivodeship: 'slaskie', plannedDate: '2026-09-01' }),
    }));
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 3: Run test, confirm it fails** — `npx vitest run tests/integration/buddy-posts.test.ts`.

- [ ] **Step 4: Implement**

Create `app/api/buddy-posts/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { buddyPosts, riders } from '@/lib/db/schema';
import { requireAuth, AuthError } from '@/lib/auth/require-auth';

export async function POST(req: Request) {
  try {
    const { riderId } = requireAuth(req);
    const { voivodeship, plannedDate, note } = await req.json();
    if (!voivodeship || !plannedDate) {
      return NextResponse.json({ error: 'voivodeship and plannedDate are required' }, { status: 400 });
    }
    const [post] = await db.insert(buddyPosts).values({
      riderId, voivodeship, plannedDate: new Date(plannedDate), note: note ?? null,
    }).returning();
    return NextResponse.json(post, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 });
    throw e;
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const voivodeship = searchParams.get('voivodeship');
  const date = searchParams.get('date');

  const conditions = [];
  if (voivodeship) conditions.push(eq(buddyPosts.voivodeship, voivodeship));
  if (date) conditions.push(sql`${buddyPosts.plannedDate}::date = ${date}::date`);

  const rows = await db
    .select({
      id: buddyPosts.id,
      voivodeship: buddyPosts.voivodeship,
      plannedDate: buddyPosts.plannedDate,
      note: buddyPosts.note,
      displayName: riders.displayName,
      style: riders.style,
      experience: riders.experience,
      pace: riders.pace,
      language: riders.language,
    })
    .from(buddyPosts)
    .innerJoin(riders, eq(buddyPosts.riderId, riders.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(buddyPosts.plannedDate);

  return NextResponse.json(rows);
}
```

- [ ] **Step 5: Run test, confirm it passes.**

- [ ] **Step 6: Build the buddy finder page** — `app/(app)/buddy-finder/page.tsx`: a filter bar (voivodeship `<select>` — hardcode the 16 slugs from `public/map/poland-voivodeships.json`, read the file at build/request time or hardcode the array since it never changes; date input), a create-post form, and a list of posts using `.panel` cards showing displayName + style/experience/pace/language + note.

- [ ] **Step 7: Playwright smoke**

Create `tests/e2e/buddy-finder.spec.ts`:
```typescript
import { test, expect } from '@playwright/test';

test('buddy finder page renders form and list', async ({ page }) => {
  await page.goto('/buddy-finder');
  await expect(page.locator('form')).toBeVisible();
});
```
(Run `npm init playwright@latest -- --quiet --browser=chromium` first if `playwright.config.ts` doesn't exist yet in your branch.)

- [ ] **Step 8: Code review pass (delegate to Haiku)**

Use the `Agent` tool, `model: "haiku"`: review `app/api/buddy-posts/route.ts` for correctness — confirm `riderId` always comes from `requireAuth`, never from the request body; confirm the date-filter SQL fragment can't be used for injection (it uses a parameterized `sql` template, not string concatenation — confirm that pattern is followed exactly).

- [ ] **Step 9: Simplify pass** — inline.

- [ ] **Step 10: Commit, push, PR, issue update**

```bash
git add app/api/buddy-posts app/\(app\)/buddy-finder tests/integration/buddy-posts.test.ts tests/e2e/buddy-finder.spec.ts playwright.config.ts
git commit -m "feat: buddy finder create + filtered list (#13)"
git push -u origin track-b
gh pr create --base main --head track-b --title "Track B: buddy finder" --body "Closes #13"
gh issue comment 13 --body "Done: buddy finder create+list implemented and tested."
```

**STOP-AND-REVIEW CHECKPOINT:** report status, time elapsed, wait for confirmation before Task 2.

---

### Task 2: Events (create + browse/filter + happening-now badge)

**Files:**
- Create: `app/api/events/route.ts` (POST creates, GET lists with optional `voivodeship`/`date` filters)
- Create: `lib/events/happening-now.ts` (pure function, unit tested)
- Create: `app/(app)/events/page.tsx`
- Test: `tests/unit/events/happening-now.test.ts`
- Test: `tests/integration/events.test.ts`

**Interfaces:**
- Consumes: `db`, `events` from `@/lib/db/schema`; `requireAuth`.
- Produces: `isHappeningNow(startsAt: Date, now: Date): boolean` from `lib/events/happening-now.ts` — true if `now` is within the window `[startsAt - 1 hour, startsAt + 4 hours]` (an event reads as "happening now" starting an hour before its listed start, through four hours after, to account for people arriving/leaving at different times — this exact window is a design choice, keep it as stated so Track B's own map badge and this list page agree). `POST /api/events` body `{ title, type, voivodeship, lat, lon, startsAt }` → `201`. `GET /api/events?voivodeship=<slug>&date=<YYYY-MM-DD>` → `200` array, each row including a computed `happeningNow: boolean` field using `isHappeningNow`.

- [ ] **Step 1: Write failing unit test for the pure function**

Create `tests/unit/events/happening-now.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { isHappeningNow } from '@/lib/events/happening-now';

describe('isHappeningNow', () => {
  it('is true exactly at start time', () => {
    const now = new Date('2026-09-15T12:00:00Z');
    expect(isHappeningNow(new Date('2026-09-15T12:00:00Z'), now)).toBe(true);
  });

  it('is true 1 hour before start', () => {
    const now = new Date('2026-09-15T11:00:00Z');
    expect(isHappeningNow(new Date('2026-09-15T12:00:00Z'), now)).toBe(true);
  });

  it('is true 3 hours after start', () => {
    const now = new Date('2026-09-15T15:00:00Z');
    expect(isHappeningNow(new Date('2026-09-15T12:00:00Z'), now)).toBe(true);
  });

  it('is false 2 hours before start', () => {
    const now = new Date('2026-09-15T10:00:00Z');
    expect(isHappeningNow(new Date('2026-09-15T12:00:00Z'), now)).toBe(false);
  });

  it('is false 5 hours after start', () => {
    const now = new Date('2026-09-15T17:00:00Z');
    expect(isHappeningNow(new Date('2026-09-15T12:00:00Z'), now)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test, confirm it fails.**

- [ ] **Step 3: Implement**

Create `lib/events/happening-now.ts`:
```typescript
const WINDOW_BEFORE_MS = 60 * 60 * 1000;
const WINDOW_AFTER_MS = 4 * 60 * 60 * 1000;

export function isHappeningNow(startsAt: Date, now: Date = new Date()): boolean {
  const diff = now.getTime() - startsAt.getTime();
  return diff >= -WINDOW_BEFORE_MS && diff <= WINDOW_AFTER_MS;
}
```

- [ ] **Step 4: Run test, confirm it passes.**

- [ ] **Step 5: Write failing integration test for the events API**

Create `tests/integration/events.test.ts`:
```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { POST as createEvent, GET as listEvents } from '@/app/api/events/route';
import { POST as register } from '@/app/api/auth/register/route';

let token: string;

beforeAll(async () => {
  const res = await register(new Request('http://localhost/api/auth/register', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: `event-${Date.now()}@example.com`, password: 'hunter22', displayName: 'Event Tester' }),
  }));
  token = (await res.json()).token;
});

function authed(url: string, init: RequestInit = {}) {
  return new Request(url, { ...init, headers: { ...init.headers, authorization: `Bearer ${token}` } });
}

describe('events API', () => {
  it('creates an event', async () => {
    const res = await createEvent(authed('http://localhost/api/events', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Krakow Bike Night', type: 'bikenight', voivodeship: 'malopolskie', lat: 50.06, lon: 19.94, startsAt: new Date().toISOString() }),
    }));
    expect(res.status).toBe(201);
  });

  it('marks a just-created event as happening now', async () => {
    await createEvent(authed('http://localhost/api/events', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Warsaw Rally', type: 'rally', voivodeship: 'mazowieckie', lat: 52.23, lon: 21.01, startsAt: new Date().toISOString() }),
    }));
    const res = await listEvents(new Request('http://localhost/api/events?voivodeship=mazowieckie'));
    const body = await res.json();
    expect(body.some((e: { happeningNow: boolean }) => e.happeningNow)).toBe(true);
  });
});
```

- [ ] **Step 6: Run test, confirm it fails, then implement**

Create `app/api/events/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { events } from '@/lib/db/schema';
import { requireAuth, AuthError } from '@/lib/auth/require-auth';
import { isHappeningNow } from '@/lib/events/happening-now';

export async function POST(req: Request) {
  try {
    const { riderId } = requireAuth(req);
    const { title, type, voivodeship, lat, lon, startsAt } = await req.json();
    if (!title || !type || !voivodeship || lat == null || lon == null || !startsAt) {
      return NextResponse.json({ error: 'title, type, voivodeship, lat, lon, startsAt are required' }, { status: 400 });
    }
    const [event] = await db.insert(events).values({
      creatorId: riderId, title, type, voivodeship, lat, lon, startsAt: new Date(startsAt),
    }).returning();
    return NextResponse.json(event, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 });
    throw e;
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const voivodeship = searchParams.get('voivodeship');
  const date = searchParams.get('date');

  const conditions = [];
  if (voivodeship) conditions.push(eq(events.voivodeship, voivodeship));
  if (date) conditions.push(sql`${events.startsAt}::date = ${date}::date`);

  const rows = await db.query.events.findMany({
    where: conditions.length ? and(...conditions) : undefined,
    orderBy: (e, { asc }) => asc(e.startsAt),
  });
  return NextResponse.json(rows.map((e) => ({ ...e, happeningNow: isHappeningNow(e.startsAt) })));
}
```

- [ ] **Step 7: Run tests, confirm they pass.**

- [ ] **Step 8: Build the events page** — `app/(app)/events/page.tsx`: filter bar (voivodeship + date), create-event form (title, type `<select>` of `rally|trackday|bikenight|swapmeet`, voivodeship, lat/lon number inputs, startsAt datetime-local input), and a list of events showing a visible "HAPPENING NOW" badge (use `--visor` yellow per the design system's rule that yellow is reserved for status/data badges, never a CTA color) when `happeningNow` is true.

- [ ] **Step 9: Playwright smoke**

Create `tests/e2e/events.spec.ts`:
```typescript
import { test, expect } from '@playwright/test';

test('events page renders form and list', async ({ page }) => {
  await page.goto('/events');
  await expect(page.locator('form')).toBeVisible();
});
```

- [ ] **Step 10: Code review (Haiku)** — confirm the happening-now window logic in the route handler calls the same `isHappeningNow` function as the unit test (not a re-implemented inline check that could drift), confirm auth is required for POST but not GET.

- [ ] **Step 11: Simplify pass.**

- [ ] **Step 12: Commit, push, PR, issue update**

```bash
git add app/api/events lib/events app/\(app\)/events tests/unit/events tests/integration/events.test.ts tests/e2e/events.spec.ts
git commit -m "feat: events create/browse with happening-now badge (#14)"
git push origin track-b
gh issue comment 14 --body "Done: events create/browse/filter with happening-now badge implemented and tested."
```

**STOP-AND-REVIEW CHECKPOINT.**

---

### Task 3: Presence (geolocation toggle + polling endpoints)

**Files:**
- Create: `app/api/presence/route.ts` (POST upserts the caller's location, GET lists riders online)
- Create: `components/PresenceToggle.tsx`
- Test: `tests/unit/presence/online-window.test.ts`
- Test: `tests/integration/presence.test.ts`

**Interfaces:**
- Consumes: `db`, `presence` from `@/lib/db/schema`; `requireAuth`.
- Produces: `isOnline(updatedAt: Date, now: Date): boolean` from `lib/presence/online-window.ts` — true if `now - updatedAt <= 2 minutes`. `POST /api/presence` body `{ lat, lon }` (auth required) → `200`, upserts the caller's single presence row (one row per rider — insert or update, never a growing history table). `GET /api/presence` → `200` array of `{ riderId, displayName, lat, lon }` for riders currently online, joined with `riders.displayName` for map labels.

- [ ] **Step 1: Write failing unit test**

Create `tests/unit/presence/online-window.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { isOnline } from '@/lib/presence/online-window';

describe('isOnline', () => {
  it('is true when updated 30 seconds ago', () => {
    const now = new Date('2026-09-15T12:00:00Z');
    expect(isOnline(new Date('2026-09-15T11:59:30Z'), now)).toBe(true);
  });

  it('is false when updated 3 minutes ago', () => {
    const now = new Date('2026-09-15T12:00:00Z');
    expect(isOnline(new Date('2026-09-15T11:57:00Z'), now)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test, confirm it fails, then implement**

Create `lib/presence/online-window.ts`:
```typescript
const ONLINE_WINDOW_MS = 2 * 60 * 1000;

export function isOnline(updatedAt: Date, now: Date = new Date()): boolean {
  return now.getTime() - updatedAt.getTime() <= ONLINE_WINDOW_MS;
}
```

- [ ] **Step 3: Run test, confirm it passes.**

- [ ] **Step 4: Write failing integration test**

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

- [ ] **Step 5: Implement**

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

- [ ] **Step 6: Run tests, confirm they pass.**

- [ ] **Step 7: Build the presence toggle component**

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
    <button onClick={() => setRiding((r) => !r)}>
      {riding ? "I'm riding \u2014 stop" : "I'm riding"}
    </button>
  );
}
```
Place this component in the nav bar or the live map page header (Task 4 decides final placement).

- [ ] **Step 8: Code review (Haiku)** — confirm `onConflictDoUpdate` targets the correct unique column (`presence.riderId` is the primary key, so this is a true upsert, not an insert-then-fail), confirm the GET endpoint never leaks a rider's location once they've gone offline (the `isOnline` filter must run server-side, not rely on the client to stop displaying stale pins).

- [ ] **Step 9: Simplify pass.**

- [ ] **Step 10: Commit, push, PR, issue update**

```bash
git add app/api/presence lib/presence components/PresenceToggle.tsx tests/unit/presence tests/integration/presence.test.ts
git commit -m "feat: presence upsert/list + geolocation toggle (#15)"
git push origin track-b
gh issue comment 15 --body "Done: presence ping/list implemented, geolocation toggle component ready for the map page."
```

**STOP-AND-REVIEW CHECKPOINT.**

---

### Task 4: Live map — presence pins + event pins

**Files:**
- Create: `app/(app)/map/page.tsx`
- Create: `components/LiveMap.tsx`
- Test: `tests/e2e/live-map.spec.ts` (Playwright only — MapLibre rendering isn't unit-testable, matching Rid3rMap's established precedent)

**Interfaces:**
- Consumes: `GET /api/presence`, `GET /api/events` (Task 2/3 endpoints), `PresenceToggle` component.
- Produces: a rendered MapLibre map centered on Poland (`[19.1, 52.0]`, zoom 6) showing a marker per online rider (from polling `/api/presence` every 10 seconds) and a marker per happening-now event (from `/api/events`, filtered client-side to `happeningNow === true`, or just show all events with a distinct style for happening-now ones — showing all events on the map with the happening-now ones highlighted is more useful for a demo than hiding non-live ones entirely).

- [ ] **Step 1: Install MapLibre**

```bash
npm install maplibre-gl
npm install -D @types/maplibre-gl
```

- [ ] **Step 2: Build the base map component**

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
    });
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
      el.style.cssText = 'width:12px;height:12px;border-radius:50%;background:var(--signal);border:2px solid var(--paper);';
      el.title = rider.displayName;
      markersRef.current.push(new maplibregl.Marker({ element: el }).setLngLat([rider.lon, rider.lat]).addTo(mapRef.current));
    }

    for (const event of eventRows) {
      const el = document.createElement('div');
      el.style.cssText = `width:14px;height:14px;border-radius:2px;background:${event.happeningNow ? 'var(--visor)' : 'var(--concrete)'};border:2px solid var(--paper);`;
      el.title = `${event.title}${event.happeningNow ? ' (happening now)' : ''}`;
      markersRef.current.push(new maplibregl.Marker({ element: el }).setLngLat([event.lon, event.lat]).addTo(mapRef.current));
    }
  }, [presenceRows, eventRows]);

  return <div ref={containerRef} style={{ width: '100%', height: '70vh' }} data-testid="live-map" />;
}
```
(This uses a minimal inline background-only style rather than reproducing Rid3rMap's full relief/PMTiles pipeline — that pipeline took multiple non-obvious fixes documented in Rid3rMap's `map-and-terrain.md` and is out of scope for a 6-hour build. A plain dark background with pins and the Task 5 turf-war polygon fill is enough for the demo.)

- [ ] **Step 3: Build the map page**

Create `app/(app)/map/page.tsx`:
```typescript
import { LiveMap } from '@/components/LiveMap';
import { PresenceToggle } from '@/components/PresenceToggle';

export default function MapPage() {
  return (
    <div>
      <div style={{ padding: '1rem' }}>
        <PresenceToggle />
      </div>
      <LiveMap />
    </div>
  );
}
```

- [ ] **Step 4: Playwright smoke**

Create `tests/e2e/live-map.spec.ts`:
```typescript
import { test, expect } from '@playwright/test';

test('map page renders the map container', async ({ page }) => {
  await page.goto('/map');
  await expect(page.locator('[data-testid="live-map"]')).toBeVisible();
});
```
Run with `npm run dev` in another terminal: `npx playwright test tests/e2e/live-map.spec.ts`. **This is a real-browser check, not just "did the test pass" — actually look at the page** (via a screenshot: `await page.screenshot({ path: 'map-smoke.png' })` added temporarily, or manually via `mcp__claude-in-chrome__navigate` if available) to confirm the map canvas actually paints something and doesn't silently fail — MapLibre bugs are notorious for failing silently (see Rid3rMap's documented worker/Turbopack gotcha; if pins never appear despite `loaded()` firing, check whether the dev bundler is resolving MapLibre's worker script correctly, the same root cause documented in Rid3rMap's `.claude/rules/map-and-terrain.md`).

- [ ] **Step 5: Code review (Haiku)** — confirm the polling interval is cleaned up on unmount (no leaked `setInterval`), confirm markers from the previous poll are removed before adding new ones (no marker accumulation memory leak).

- [ ] **Step 6: Simplify pass.**

- [ ] **Step 7: Commit, push, PR, issue update**

```bash
git add app/\(app\)/map components/LiveMap.tsx package.json package-lock.json tests/e2e/live-map.spec.ts
git commit -m "feat: live map with presence and event pins (#16, #17)"
git push origin track-b
gh issue comment 16 --body "Done: presence pins render and poll every 10s."
gh issue comment 17 --body "Done: event pins render with happening-now highlight."
```

**STOP-AND-REVIEW CHECKPOINT.**

---

### Task 5: Turf-war Warsaw-district layer

**Files:**
- Create: `app/api/turf-war/route.ts`
- Create: `lib/turf-war/ownership.ts` (pure query-shaping logic, unit tested)
- Modify: `components/LiveMap.tsx` (add the polygon fill layer)
- Test: `tests/unit/turf-war/ownership.test.ts`
- Test: `tests/integration/turf-war.test.ts`

**Interfaces:**
- Consumes: `routes`, `crews` tables (read-only — **do not modify Track A's `app/api/routes/*` or `app/api/crews/*` files**), `public/map/warsaw-districts.json` (18 Warsaw district features — **not** `poland-voivodeships.json`).
- Produces: `pickOwner(counts: { crewId: string; crewName: string; district: string; count: number }[]): Record<string, { crewId: string; crewName: string; count: number }>` from `lib/turf-war/ownership.ts` — pure function that, given raw grouped counts (which may include multiple crews per district), returns one winner per district (highest count; a tie keeps whichever came first in the input array — document this as the tie-break rule, don't leave it undefined). `GET /api/turf-war` → `200` object keyed by Warsaw district slug (e.g. `"srodmiescie"`, `"mokotow"` — the 18 slugs in `public/map/warsaw-districts.json`), e.g. `{ "srodmiescie": { "crewId": "...", "crewName": "Iron Wolves", "count": 5 } }` — districts with zero routes are simply absent from the object (not present with a null owner). Only routes with a non-null `routes.district` count (routes outside Warsaw are excluded entirely, not attributed to any district).

- [ ] **Step 1: Write failing unit test for the pure ownership logic**

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

- [ ] **Step 2: Run test, confirm it fails, then implement**

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

- [ ] **Step 3: Run test, confirm it passes.**

- [ ] **Step 4: Write failing integration test for the API**

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
(This test is intentionally light since it depends on Track A's `routes`/`crews` data existing — the real check is that the endpoint doesn't error, not specific ownership values, since this session doesn't control what Track A has seeded by the time this runs.)

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
This query is read-only against `routes`/`riders`/`crews` — it does not modify or import any file under Track A's ownership, only reads the shared schema from `@/lib/db`. The `WHERE r.district IS NOT NULL` clause excludes routes outside Warsaw entirely (they have no district to attribute).

- [ ] **Step 6: Run tests, confirm they pass.**

- [ ] **Step 7: Add the turf-war fill layer to the map**

Modify `components/LiveMap.tsx`: in the map-initialization `useEffect`, after the map's `load` event fires, add the voivodeship GeoJSON as a source and a fill layer, then fetch `/api/turf-war` and set a `fillColor` expression coloring each voivodeship by a hash of its owning `crewId` (a simple deterministic color: e.g. hash the crew id string to a hue and use `hsl(hue, 60%, 35%)`), leaving unowned voivodeships a neutral `--tar` fill:

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
      map.addLayer({ id: 'turf-war-fill', type: 'fill', source: 'turf-war', paint: { 'fill-color': ['get', 'fillColor'], 'fill-opacity': 0.55 } });
      map.addLayer({ id: 'turf-war-outline', type: 'line', source: 'turf-war', paint: { 'line-color': 'rgba(243,239,230,0.4)', 'line-width': 1 } });
    }
  }

  if (map.loaded()) addTurfWarLayer();
  else map.once('load', addTurfWarLayer);

  const interval = setInterval(addTurfWarLayer, 30000);
  return () => clearInterval(interval);
}, []);
```
(30-second refresh is deliberately slower than the 10-second presence poll — turf-war ownership changes far less often than rider positions, no need to hammer the endpoint.)

- [ ] **Step 8: Manual verification** — with `npm run dev` running and at least one route+crew in the DB, where the route's `startLat`/`startLon` fall inside Warsaw so `district` is non-null (e.g. central Warsaw coordinates ~52.23, 21.01 — create one via Track A's UI, or directly via `curl`/Postman against `/api/routes` with a valid token, if Track A isn't merged yet), confirm the Warsaw district containing that route visibly fills with color on `/map`. A route outside Warsaw will correctly show no fill (its `district` is null) — that's expected, not a bug.

- [ ] **Step 9: Code review (Haiku)** — confirm the SQL query only counts routes belonging to riders who have a crew (the `JOIN crews` with no `LEFT` means crewless riders' routes are correctly excluded from turf-war, not counted as an "unowned" bucket — confirm this is the intended behavior, which it is per the spec: turf-war is crew vs. crew).

- [ ] **Step 10: Simplify pass.**

- [ ] **Step 11: Final commit, push, PR, issue update — close out Track B**

```bash
git add app/api/turf-war lib/turf-war components/LiveMap.tsx tests/unit/turf-war tests/integration/turf-war.test.ts
git commit -m "feat: turf-war Warsaw-district ownership layer (#18)"
git push origin track-b
gh issue comment 18 --body "Done: turf-war layer (Warsaw districts) live on the map. Track B complete."
gh pr create --base main --head track-b --title "Track B: buddy finder, events, presence, live map" --body "Closes #13, closes #14, closes #15, closes #16, closes #17, closes #18" 2>/dev/null || echo "PR already open, ensure its body lists all six closes."
```

**FINAL STOP-AND-REVIEW CHECKPOINT:** Report to the user that Track B is complete: all six issues closed, PR open against `main`, all tests passing (`npx vitest run` full suite), Playwright smoke checks green, and the turf-war layer visibly renders when routes+crews exist. Do not merge into `main` yourself — Phase 4 (a separate plan) handles the merge and integration review alongside Track A.
