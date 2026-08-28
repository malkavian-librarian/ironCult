# ironCult Track A — Community & Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build rider settings, crews (create/join), both leaderboards, and route create/browse/rate — the "content" half of ironCult.

**Architecture:** Next.js App Router route handlers under `app/api/*`, Drizzle ORM against Neon Postgres, JWT/Bearer auth via `requireAuth()`. Server Components for read-only pages, Client Components + `fetch` for forms.

**Tech Stack:** Next.js, TypeScript, Drizzle ORM, Vitest, Playwright (local smoke checks only).

## Global Constraints

- **You are starting cold in a fresh session with no memory of how this plan was written.** Everything you need is either in this file or in files already committed to the repo — do not assume anything not stated here.
- Repo: `https://github.com/malkavian-librarian/ironCult`, already scaffolded by Phase 0 (schema, auth, voivodeship helper, design tokens, nav all exist — **do not recreate them**, `git pull`/clone first and read `lib/db/schema.ts`, `lib/auth/require-auth.ts`, `lib/geo/voivodeship.ts` before writing any code).
- Project board: `https://github.com/users/malkavian-librarian/projects/1/views/1`. Your issues are labeled `track:A`.
- **Windows or other OS**: if you're on Windows without git in PATH, use `C:\Users\FlyerOne\AppData\Local\GitHubDesktop\app-3.5.11\resources\app\git\cmd\git.exe` (store as `$git` in PowerShell). If you're on a Linux/Mac environment (e.g. opencode) with `git` already in PATH, just use `git` directly — check with `git --version` first.
- **Branch:** work on a branch named `track-a` (create it from `main` at the start: `git checkout -b track-a`). Push to `track-a`, open PRs from `track-a` into `main` — do not push directly to `main`.
- **GitHub is not optional bookkeeping — it is a required part of every task.** For each task below:
  1. Before starting, comment on the task's GitHub issue: `gh issue comment <number> --body "Starting: <task name>"` (or move it to "In Progress" on the project board if using `gh project item-edit`).
  2. Every commit message must reference the issue: e.g. `git commit -m "feat: add rider settings API (#1)"`.
  3. After finishing the task (tests passing, reviewed, simplified, smoke-tested), push and open/update a PR linked to the issue: `gh pr create --base main --head track-a --title "<task>" --body "Closes #<number>"` (open once, then just push more commits to update it for subsequent tasks, or open one PR per task — either is fine, but every PR body must say `Closes #<number>` for its issue).
  4. Comment on the issue that it's done, with a one-line summary of what was built.
  If `gh` CLI isn't available in your environment, do the equivalent via the GitHub web UI, but do not skip this — the user explicitly requires visible GitHub activity per task.
- Time budget: **Track A should take no more than 2.5 hours.** 6 tasks below — if any single task is running long, cut its scope (e.g. skip an edge case) rather than let it consume the whole budget. Report time spent at each checkpoint.
- No Tailwind. Use the CSS custom properties already defined in `app/globals.css` (`--signal`, `--paper`, `--panel`, `--line`, etc.) and the `.panel` class for any card/container UI — don't invent a new visual language.
- Every route handler that touches rider-owned data calls `requireAuth(req)` from `@/lib/auth/require-auth` and derives the acting rider from its return value — never trust a client-supplied rider/owner id in a request body.
- `routes.voivodeship` is always derived server-side via `findVoivodeship(lat, lon)` from `@/lib/geo/voivodeship` — never accept it from the client.

---

### Task 1: Rider settings (profile fields + crew picker read-only for now)

**Files:**
- Create: `app/api/profile/route.ts` (GET returns the authenticated rider's profile, PATCH updates it)
- Create: `app/(app)/settings/page.tsx`
- Test: `tests/integration/profile.test.ts`

**Interfaces:**
- Consumes: `db`, `riders` from `@/lib/db`, `@/lib/db/schema`; `requireAuth` from `@/lib/auth/require-auth`.
- Produces: `GET /api/profile` (auth required) → `200 { id, email, displayName, bio, motorcycle, style, experience, pace, language, crewId }`. `PATCH /api/profile` body `{ displayName?, bio?, motorcycle?, style?, experience?, pace?, language? }` → `200` with the updated profile. (Crew assignment is handled by Task 2's endpoint, not this one — `crewId` is read-only here.)

- [ ] **Step 1: Pull latest, create branch**

```bash
git pull origin main
git checkout -b track-a
```

- [ ] **Step 2: Write failing integration test**

Create `tests/integration/profile.test.ts`:
```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { GET, PATCH } from '@/app/api/profile/route';
import { POST as register } from '@/app/api/auth/register/route';

let token: string;

beforeAll(async () => {
  const res = await register(new Request('http://localhost/api/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: `profile-${Date.now()}@example.com`, password: 'hunter22', displayName: 'Profile Tester' }),
  }));
  const body = await res.json();
  token = body.token;
});

function authedRequest(url: string, init: RequestInit = {}) {
  return new Request(url, {
    ...init,
    headers: { ...init.headers, authorization: `Bearer ${token}` },
  });
}

describe('profile API', () => {
  it('returns the authenticated rider profile', async () => {
    const res = await GET(authedRequest('http://localhost/api/profile'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.displayName).toBe('Profile Tester');
  });

  it('rejects unauthenticated requests', async () => {
    const res = await GET(new Request('http://localhost/api/profile'));
    expect(res.status).toBe(401);
  });

  it('updates profile fields', async () => {
    const res = await PATCH(authedRequest('http://localhost/api/profile', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ bio: 'Loves twisty roads', style: 'adventure', pace: 'relaxed' }),
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.bio).toBe('Loves twisty roads');
    expect(body.pace).toBe('relaxed');
  });
});
```

- [ ] **Step 3: Run test, confirm it fails** — `npx vitest run tests/integration/profile.test.ts` — expect FAIL (module not found).

- [ ] **Step 4: Implement the route**

Create `app/api/profile/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { riders } from '@/lib/db/schema';
import { requireAuth, AuthError } from '@/lib/auth/require-auth';

export async function GET(req: Request) {
  try {
    const { riderId } = requireAuth(req);
    const rider = await db.query.riders.findFirst({ where: eq(riders.id, riderId) });
    if (!rider) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const { passwordHash: _unused, ...safe } = rider;
    return NextResponse.json(safe);
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 });
    throw e;
  }
}

export async function PATCH(req: Request) {
  try {
    const { riderId } = requireAuth(req);
    const updates = await req.json();
    const allowed = ['displayName', 'bio', 'motorcycle', 'style', 'experience', 'pace', 'language'] as const;
    const patch: Record<string, string> = {};
    for (const key of allowed) {
      if (typeof updates[key] === 'string') patch[key] = updates[key];
    }
    const [updated] = await db.update(riders).set(patch).where(eq(riders.id, riderId)).returning();
    const { passwordHash: _unused, ...safe } = updated;
    return NextResponse.json(safe);
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 });
    throw e;
  }
}
```

- [ ] **Step 5: Run test, confirm it passes** — `npx vitest run tests/integration/profile.test.ts`.

- [ ] **Step 6: Build the settings page**

Create `app/(app)/settings/page.tsx` as a Client Component with a form for `displayName`, `bio`, `motorcycle`, `style`, `experience`, `pace`, `language`, reading the JWT from `localStorage.getItem('ironcult_token')` (this is the convention every Track A/B page uses to read the stored token — set it once here so both tracks agree: `localStorage.getItem('ironcult_token')`), calling `GET /api/profile` on mount and `PATCH /api/profile` on submit, using `.panel` styling for the form container.

- [ ] **Step 7: Local Playwright smoke test**

Create `tests/e2e/settings.spec.ts` (create `playwright.config.ts` first if it doesn't exist — `npm init playwright@latest -- --quiet --browser=chromium` accepting defaults, base URL `http://localhost:3000`):
```typescript
import { test, expect } from '@playwright/test';

test('settings page loads and shows the form', async ({ page }) => {
  await page.goto('/settings');
  await expect(page.locator('form')).toBeVisible();
});
```
Run: `npx playwright test tests/e2e/settings.spec.ts` with `npm run dev` running in another terminal. This is a shallow smoke check (page renders, doesn't crash) — full auth-flow e2e happens in Phase 4.

- [ ] **Step 8: Code review pass (delegate to Haiku)**

Use `Agent` tool, `model: "haiku"`: review `app/api/profile/route.ts` for correctness — confirm `passwordHash` is never included in a response, confirm PATCH only writes allow-listed fields. Fix any confirmed issue.

- [ ] **Step 9: Simplify pass** — inline, re-read the two new files for redundancy.

- [ ] **Step 10: Commit, push, PR, issue update**

```bash
git add app/api/profile app/\(app\)/settings tests/integration/profile.test.ts tests/e2e/settings.spec.ts playwright.config.ts
git commit -m "feat: rider settings API + page (#1)"
git push -u origin track-a
gh pr create --base main --head track-a --title "Track A: rider settings" --body "Closes #1"
gh issue comment 1 --body "Done: GET/PATCH /api/profile implemented, settings page live, tests passing."
```

**STOP-AND-REVIEW CHECKPOINT:** report status, time elapsed, and wait for confirmation before Task 2.

---

### Task 2: Crew create/join

**Files:**
- Create: `app/api/crews/route.ts` (GET lists all crews, POST creates a new crew)
- Create: `app/api/crews/join/route.ts` (POST sets the authenticated rider's `crewId`)
- Create: `app/(app)/settings/crew-picker.tsx` (or fold into the settings page from Task 1)
- Test: `tests/integration/crews.test.ts`

**Interfaces:**
- Consumes: `db`, `crews`, `riders` from Task 1's imports; `requireAuth`.
- Produces: `GET /api/crews` → `200 [{ id, name }]`. `POST /api/crews` body `{ name }` → `201 { id, name }` (name must be unique — return `409` on conflict). `POST /api/crews/join` body `{ crewId }` → `200` with the updated rider's `crewId`.

- [ ] **Step 1: Write failing integration test**

Create `tests/integration/crews.test.ts`:
```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { GET as listCrews, POST as createCrew } from '@/app/api/crews/route';
import { POST as joinCrew } from '@/app/api/crews/join/route';
import { POST as register } from '@/app/api/auth/register/route';
import { GET as getProfile } from '@/app/api/profile/route';

let token: string;

beforeAll(async () => {
  const res = await register(new Request('http://localhost/api/auth/register', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: `crew-${Date.now()}@example.com`, password: 'hunter22', displayName: 'Crew Tester' }),
  }));
  token = (await res.json()).token;
});

function authed(url: string, init: RequestInit = {}) {
  return new Request(url, { ...init, headers: { ...init.headers, authorization: `Bearer ${token}` } });
}

describe('crews API', () => {
  it('creates a crew and lists it', async () => {
    const name = `Iron Wolves ${Date.now()}`;
    const createRes = await createCrew(authed('http://localhost/api/crews', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name }),
    }));
    expect(createRes.status).toBe(201);
    const listRes = await listCrews(authed('http://localhost/api/crews'));
    const crews = await listRes.json();
    expect(crews.some((c: { name: string }) => c.name === name)).toBe(true);
  });

  it('rejects duplicate crew names', async () => {
    const name = `Duplicate Crew ${Date.now()}`;
    await createCrew(authed('http://localhost/api/crews', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name }) }));
    const res = await createCrew(authed('http://localhost/api/crews', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name }) }));
    expect(res.status).toBe(409);
  });

  it('lets a rider join a crew', async () => {
    const name = `Joinable Crew ${Date.now()}`;
    const createRes = await createCrew(authed('http://localhost/api/crews', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name }) }));
    const crew = await createRes.json();
    const joinRes = await joinCrew(authed('http://localhost/api/crews/join', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ crewId: crew.id }) }));
    expect(joinRes.status).toBe(200);
    const profileRes = await getProfile(authed('http://localhost/api/profile'));
    const profile = await profileRes.json();
    expect(profile.crewId).toBe(crew.id);
  });
});
```

- [ ] **Step 2: Run test, confirm it fails.**

- [ ] **Step 3: Implement**

Create `app/api/crews/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { crews } from '@/lib/db/schema';
import { requireAuth, AuthError } from '@/lib/auth/require-auth';

export async function GET(req: Request) {
  try {
    requireAuth(req);
    const all = await db.query.crews.findMany();
    return NextResponse.json(all);
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 });
    throw e;
  }
}

export async function POST(req: Request) {
  try {
    requireAuth(req);
    const { name } = await req.json();
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    try {
      const [crew] = await db.insert(crews).values({ name }).returning();
      return NextResponse.json(crew, { status: 201 });
    } catch {
      return NextResponse.json({ error: 'Crew name already taken' }, { status: 409 });
    }
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 });
    throw e;
  }
}
```

Create `app/api/crews/join/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { riders } from '@/lib/db/schema';
import { requireAuth, AuthError } from '@/lib/auth/require-auth';

export async function POST(req: Request) {
  try {
    const { riderId } = requireAuth(req);
    const { crewId } = await req.json();
    if (!crewId) return NextResponse.json({ error: 'crewId is required' }, { status: 400 });
    const [updated] = await db.update(riders).set({ crewId }).where(eq(riders.id, riderId)).returning();
    return NextResponse.json({ crewId: updated.crewId });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 });
    throw e;
  }
}
```

- [ ] **Step 4: Run test, confirm it passes.**

- [ ] **Step 5: Add crew picker UI to settings page** — a dropdown of existing crews (from `GET /api/crews`) plus a "create new crew" text input + button, calling `POST /api/crews` then `POST /api/crews/join` with the returned id.

- [ ] **Step 6: Playwright smoke** — extend `tests/e2e/settings.spec.ts` with a check that the crew picker section renders (`await expect(page.locator('text=Crew')).toBeVisible();` or similar selector matching your actual markup).

- [ ] **Step 7: Code review pass (Haiku)** — review the two new route files for the same auth/validation pattern as Task 1; confirm the unique-constraint violation is caught specifically (not swallowing unrelated DB errors as a generic 409) — if the catch-all is too broad, narrow it to check the Postgres unique-violation error code (`23505`) before returning 409, otherwise rethrow.

- [ ] **Step 8: Simplify pass.**

- [ ] **Step 9: Commit, push, PR, issue update**

```bash
git add app/api/crews app/\(app\)/settings tests/integration/crews.test.ts tests/e2e/settings.spec.ts
git commit -m "feat: crew create/join API + picker UI (#2)"
git push origin track-a
gh pr create --base main --head track-a --title "Track A: crew create/join" --body "Closes #2" 2>/dev/null || gh pr comment --body "Adds crew create/join, closes #2"
gh issue comment 2 --body "Done: crew create/join implemented and tested."
```

**STOP-AND-REVIEW CHECKPOINT.**

---

### Task 3: Crew leaderboard + individual leaderboard pages

**Files:**
- Create: `app/api/leaderboard/crews/route.ts`
- Create: `app/api/leaderboard/riders/route.ts`
- Create: `app/(app)/leaderboard/page.tsx`
- Test: `tests/unit/leaderboard.test.ts` (query-building logic, if extracted) or `tests/integration/leaderboard.test.ts`

**Interfaces:**
- Consumes: `db`, `routes`, `riders`, `crews`.
- Produces: `GET /api/leaderboard/crews` → `200 [{ crewId, crewName, routeCount }]` sorted descending. `GET /api/leaderboard/riders` → `200 [{ riderId, displayName, routeCount }]` sorted descending. **Note for Track B:** this is a different, aggregate-only endpoint from Track B's turf-war-by-voivodeship query — Track B's turf-war query groups by `voivodeship` AND `crewId` together and does not call this endpoint; the two are independent, no shared code required, but keep this note here so nobody accidentally tries to reuse one for the other's purpose.

- [ ] **Step 1: Write failing integration test**

Create `tests/integration/leaderboard.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { GET as crewLeaderboard } from '@/app/api/leaderboard/crews/route';
import { GET as riderLeaderboard } from '@/app/api/leaderboard/riders/route';

describe('leaderboard API', () => {
  it('returns crew leaderboard sorted by route count descending', async () => {
    const res = await crewLeaderboard(new Request('http://localhost/api/leaderboard/crews'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    for (let i = 1; i < body.length; i++) {
      expect(body[i - 1].routeCount).toBeGreaterThanOrEqual(body[i].routeCount);
    }
  });

  it('returns rider leaderboard sorted by route count descending', async () => {
    const res = await riderLeaderboard(new Request('http://localhost/api/leaderboard/riders'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });
});
```
(These endpoints are public — no auth required, matching Rid3rMap's precedent that leaderboards are public read data.)

- [ ] **Step 2: Run test, confirm it fails.**

- [ ] **Step 3: Implement** (route/rating tables from Task 4/5 may not have rows yet — that's fine, an empty array is a valid pass)

Create `app/api/leaderboard/crews/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';

export async function GET() {
  const result = await db.execute(sql`
    SELECT c.id as "crewId", c.name as "crewName", COUNT(r.id)::int as "routeCount"
    FROM crews c
    LEFT JOIN riders ri ON ri.crew_id = c.id
    LEFT JOIN routes r ON r.owner_id = ri.id
    GROUP BY c.id, c.name
    ORDER BY "routeCount" DESC
  `);
  return NextResponse.json(result.rows);
}
```

Create `app/api/leaderboard/riders/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';

export async function GET() {
  const result = await db.execute(sql`
    SELECT ri.id as "riderId", ri.display_name as "displayName", COUNT(r.id)::int as "routeCount"
    FROM riders ri
    LEFT JOIN routes r ON r.owner_id = ri.id
    GROUP BY ri.id, ri.display_name
    ORDER BY "routeCount" DESC
  `);
  return NextResponse.json(result.rows);
}
```

- [ ] **Step 4: Run test, confirm it passes.**

- [ ] **Step 5: Build the leaderboard page** — `app/(app)/leaderboard/page.tsx` as a Server Component fetching both endpoints (use absolute URL via `process.env.NEXT_PUBLIC_BASE_URL` or relative fetch with `{ cache: 'no-store' }` against the deployed origin — for local dev, fetch directly from the DB functions instead of over HTTP to avoid self-fetch issues: import and call the same query logic, or simply `fetch('/api/leaderboard/crews')` using a relative URL only works in Client Components; for a Server Component, query `db` directly via a shared helper). To keep this simple: extract the SQL query bodies into `lib/leaderboard/queries.ts` as `getCrewLeaderboard()` and `getRiderLeaderboard()`, have both the API routes and the Server Component page call these functions directly — this avoids the server-side self-fetch problem entirely.

  Refactor: create `lib/leaderboard/queries.ts` with the two functions (the SQL from Step 3, moved here), then have both route handlers and the page import from it.

- [ ] **Step 6: Two-column layout** using `.panel` styling: crew leaderboard on the left, individual on the right (stack vertically on narrow viewports — inline a simple `@media (max-width: 680px)` rule in `app/globals.css` if needed, one rule, don't over-engineer).

- [ ] **Step 7: Playwright smoke**

Create `tests/e2e/leaderboard.spec.ts`:
```typescript
import { test, expect } from '@playwright/test';

test('leaderboard page renders both tables', async ({ page }) => {
  await page.goto('/leaderboard');
  await expect(page.locator('body')).toContainText(/leaderboard/i);
});
```

- [ ] **Step 8: Code review (Haiku)** — confirm the raw SQL is not vulnerable to injection (it isn't — no interpolated user input) and that `LEFT JOIN` is used, not `INNER JOIN` (crews/riders with zero routes must still appear with `routeCount: 0`).

- [ ] **Step 9: Simplify pass.**

- [ ] **Step 10: Commit, push, PR, issue update**

```bash
git add app/api/leaderboard lib/leaderboard app/\(app\)/leaderboard tests/integration/leaderboard.test.ts tests/e2e/leaderboard.spec.ts
git commit -m "feat: crew and individual leaderboards (#3, #4)"
git push origin track-a
gh issue comment 3 --body "Done: crew leaderboard live."
gh issue comment 4 --body "Done: individual leaderboard live."
```

**STOP-AND-REVIEW CHECKPOINT.**

---

### Task 4: Route create (coordinate entry, server-derived voivodeship)

**Files:**
- Create: `app/api/routes/route.ts` (POST creates, GET lists — GET is expanded in Task 5)
- Create: `app/(app)/routes/new/page.tsx`
- Test: `tests/integration/routes.test.ts`

**Interfaces:**
- Consumes: `requireAuth`, `db`/`routes` schema, `findVoivodeship` from `@/lib/geo/voivodeship`.
- Produces: `POST /api/routes` body `{ title, startLat, startLon, endLat, endLon, difficulty, bikeType, sceneryTags }` → `201` with the created row including server-derived `voivodeship`. Reject with `400` if `findVoivodeship` returns `null` (coordinates outside Poland) — **this is the one validation that matters most: never store a route with a null/client-supplied voivodeship.**
- Enum values (fixed, copy exactly): `difficulty`: `"easy" | "moderate" | "hard"`. `bikeType`: `"adventure" | "sport" | "cruiser" | "naked" | "touring"`. `sceneryTags`: free-text comma-separated string for this hackathon scope (e.g. `"forest,mountains"`) — no separate tags table.

- [ ] **Step 1: Write failing integration test**

Create `tests/integration/routes.test.ts`:
```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { POST as createRoute } from '@/app/api/routes/route';
import { POST as register } from '@/app/api/auth/register/route';

let token: string;

beforeAll(async () => {
  const res = await register(new Request('http://localhost/api/auth/register', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: `route-${Date.now()}@example.com`, password: 'hunter22', displayName: 'Route Tester' }),
  }));
  token = (await res.json()).token;
});

function authed(url: string, init: RequestInit = {}) {
  return new Request(url, { ...init, headers: { ...init.headers, authorization: `Bearer ${token}` } });
}

describe('routes API', () => {
  it('creates a route with server-derived voivodeship', async () => {
    const res = await createRoute(authed('http://localhost/api/routes', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: 'Tatra Loop', startLat: 50.0647, startLon: 19.9450, endLat: 49.2992, endLon: 19.9496,
        difficulty: 'moderate', bikeType: 'adventure', sceneryTags: 'mountains,forest',
      }),
    }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.voivodeship).toBe('malopolskie');
  });

  it('rejects coordinates outside Poland', async () => {
    const res = await createRoute(authed('http://localhost/api/routes', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: 'Paris Loop', startLat: 48.8566, startLon: 2.3522, endLat: 48.86, endLon: 2.36,
        difficulty: 'easy', bikeType: 'naked', sceneryTags: 'urban',
      }),
    }));
    expect(res.status).toBe(400);
  });
});
```
(If Phase 0's voivodeship data produced a different slug than `malopolskie` for Krakow, use that actual value — check `lib/geo/voivodeship.ts`'s own test file for the confirmed value.)

- [ ] **Step 2: Run test, confirm it fails.**

- [ ] **Step 3: Implement**

Create `app/api/routes/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { routes } from '@/lib/db/schema';
import { requireAuth, AuthError } from '@/lib/auth/require-auth';
import { findVoivodeship } from '@/lib/geo/voivodeship';

export async function POST(req: Request) {
  try {
    const { riderId } = requireAuth(req);
    const { title, startLat, startLon, endLat, endLon, difficulty, bikeType, sceneryTags } = await req.json();
    const voivodeship = findVoivodeship(startLat, startLon);
    if (!voivodeship) {
      return NextResponse.json({ error: 'Route start point is outside Poland' }, { status: 400 });
    }
    const [route] = await db.insert(routes).values({
      ownerId: riderId, title, startLat, startLon, endLat, endLon, difficulty, bikeType, sceneryTags, voivodeship,
    }).returning();
    return NextResponse.json(route, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 });
    throw e;
  }
}

export async function GET() {
  const all = await db.query.routes.findMany({ orderBy: (r, { desc }) => desc(r.createdAt) });
  return NextResponse.json(all);
}
```

- [ ] **Step 4: Run test, confirm it passes.**

- [ ] **Step 5: Build the route-create page** — a form with a text input for title, two pairs of number inputs for start/end lat/lon (a real map-click picker is a nice-to-have, not required given the time budget — plain number inputs satisfy the spec's "coordinate entry" requirement), a `<select>` for difficulty and bikeType, a text input for sceneryTags. POST to `/api/routes` with the stored bearer token, redirect to `/routes` on success.

- [ ] **Step 6: Playwright smoke**

Create `tests/e2e/routes-new.spec.ts`:
```typescript
import { test, expect } from '@playwright/test';

test('route creation form renders', async ({ page }) => {
  await page.goto('/routes/new');
  await expect(page.locator('form')).toBeVisible();
});
```

- [ ] **Step 7: Code review (Haiku)** — confirm `voivodeship` is never read from the request body, confirm the `400` path returns before any DB write happens.

- [ ] **Step 8: Simplify pass.**

- [ ] **Step 9: Commit, push, PR, issue update**

```bash
git add app/api/routes app/\(app\)/routes/new tests/integration/routes.test.ts tests/e2e/routes-new.spec.ts
git commit -m "feat: route creation with server-derived voivodeship (#5)"
git push origin track-a
gh issue comment 5 --body "Done: route creation live, voivodeship always server-derived."
```

**STOP-AND-REVIEW CHECKPOINT.**

---

### Task 5: Route browse + ratings

**Files:**
- Modify: `app/api/routes/route.ts` (GET already exists from Task 4 — extend with average rating)
- Create: `app/api/routes/[id]/ratings/route.ts` (POST submits/updates a rating)
- Create: `app/(app)/routes/page.tsx` (list view)
- Test: `tests/integration/ratings.test.ts`

**Interfaces:**
- Consumes: `routes`, `ratings` schema, `requireAuth`.
- Produces: `POST /api/routes/[id]/ratings` body `{ score }` (1-5) → `200` with the route's new average. Re-rating by the same rider on the same route **updates** their existing rating (upsert on the `unique(routeId, raterId)` constraint), it does not create a duplicate row.

- [ ] **Step 1: Write failing integration test**

Create `tests/integration/ratings.test.ts`:
```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { POST as createRoute } from '@/app/api/routes/route';
import { POST as rate } from '@/app/api/routes/[id]/ratings/route';
import { POST as register } from '@/app/api/auth/register/route';

let token: string;
let routeId: string;

beforeAll(async () => {
  const res = await register(new Request('http://localhost/api/auth/register', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: `rate-${Date.now()}@example.com`, password: 'hunter22', displayName: 'Rate Tester' }),
  }));
  token = (await res.json()).token;
  const routeRes = await createRoute(new Request('http://localhost/api/routes', {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ title: 'Ratable Route', startLat: 52.2297, startLon: 21.0122, endLat: 52.3, endLon: 21.1, difficulty: 'easy', bikeType: 'touring', sceneryTags: 'plains' }),
  }));
  routeId = (await routeRes.json()).id;
});

function authed(url: string, init: RequestInit = {}) {
  return new Request(url, { ...init, headers: { ...init.headers, authorization: `Bearer ${token}` } });
}

describe('ratings API', () => {
  it('submits a rating and returns the new average', async () => {
    const res = await rate(authed(`http://localhost/api/routes/${routeId}/ratings`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ score: 4 }),
    }), { params: Promise.resolve({ id: routeId }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.average).toBe(4);
  });

  it('updates the same rider\'s rating instead of duplicating', async () => {
    await rate(authed(`http://localhost/api/routes/${routeId}/ratings`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ score: 4 }),
    }), { params: Promise.resolve({ id: routeId }) });
    const res = await rate(authed(`http://localhost/api/routes/${routeId}/ratings`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ score: 2 }),
    }), { params: Promise.resolve({ id: routeId }) });
    const body = await res.json();
    expect(body.average).toBe(2);
  });
});
```
(This project follows Next.js 16's async `params` convention for dynamic routes — `{ params }: { params: Promise<{ id: string }> }`, `const { id } = await params;` — confirm this matches the Next.js version actually installed by Phase 0; if it's Next 14/15 with synchronous params instead, adjust both the test call signature and the route implementation below to match.)

- [ ] **Step 2: Run test, confirm it fails.**

- [ ] **Step 3: Implement**

Create `app/api/routes/[id]/ratings/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { eq, and, avg } from 'drizzle-orm';
import { db } from '@/lib/db';
import { ratings } from '@/lib/db/schema';
import { requireAuth, AuthError } from '@/lib/auth/require-auth';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { riderId } = requireAuth(req);
    const { id: routeId } = await params;
    const { score } = await req.json();
    if (typeof score !== 'number' || score < 1 || score > 5) {
      return NextResponse.json({ error: 'score must be 1-5' }, { status: 400 });
    }
    const existing = await db.query.ratings.findFirst({
      where: and(eq(ratings.routeId, routeId), eq(ratings.raterId, riderId)),
    });
    if (existing) {
      await db.update(ratings).set({ score }).where(eq(ratings.id, existing.id));
    } else {
      await db.insert(ratings).values({ routeId, raterId: riderId, score });
    }
    const [{ average }] = await db.select({ average: avg(ratings.score) }).from(ratings).where(eq(ratings.routeId, routeId));
    return NextResponse.json({ average: Number(average) });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 });
    throw e;
  }
}
```

- [ ] **Step 4: Run test, confirm it passes.**

- [ ] **Step 5: Extend the routes GET endpoint with average rating** — modify `app/api/routes/route.ts`'s `GET` to join/aggregate `ratings` per route (a second query per route is fine at hackathon scale; don't over-optimize with a single mega-join under time pressure).

- [ ] **Step 6: Build `app/(app)/routes/page.tsx`** — list view (Server Component, calls the same query logic as the GET route directly, same self-fetch-avoidance pattern as Task 3's leaderboard) showing title, voivodeship, difficulty, bikeType, average rating, and a 1-5 rating control (Client Component island) that POSTs to the ratings endpoint.

- [ ] **Step 7: Playwright smoke**

Create `tests/e2e/routes-list.spec.ts`:
```typescript
import { test, expect } from '@playwright/test';

test('routes list page renders', async ({ page }) => {
  await page.goto('/routes');
  await expect(page.locator('body')).toBeVisible();
});
```

- [ ] **Step 8: Code review (Haiku)** — confirm the upsert-by-unique-rater logic is correct (no duplicate rows possible), confirm `score` bounds are validated server-side not just client-side.

- [ ] **Step 9: Simplify pass.**

- [ ] **Step 10: Final commit, push, PR, issue update — and close out Track A**

```bash
git add app/api/routes app/\(app\)/routes/page.tsx tests/integration/ratings.test.ts tests/e2e/routes-list.spec.ts
git commit -m "feat: route ratings + browse list (#6)"
git push origin track-a
gh issue comment 6 --body "Done: ratings + route browse live. Track A complete."
gh pr create --base main --head track-a --title "Track A: community & content (rider settings, crews, leaderboards, routes, ratings)" --body "Closes #1, closes #2, closes #3, closes #4, closes #5, closes #6" 2>/dev/null || echo "PR already open, ensure its body lists all six closes."
```

**FINAL STOP-AND-REVIEW CHECKPOINT:** Report to the user that Track A is complete: all six issues closed, PR open against `main`, all tests passing (`npx vitest run` full suite), Playwright smoke checks green. Do not merge into `main` yourself — Phase 4 (a separate plan) handles the merge and integration review alongside Track B.
