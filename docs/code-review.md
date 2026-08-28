# ironCult — Comprehensive Code Review

**Date:** 2026-08-28
**Reviewers:** 5 parallel subagents (security, architecture, frontend/UX, database, test quality)
**Scope:** Full codebase on `phase5-map-demo-density-task-1` branch

---

## Severity Summary

| Severity | Count | Categories |
|----------|-------|------------|
| CRITICAL | 1 | Destructive data loss in seeder |
| HIGH | 12 | Auth, error handling, test isolation, performance, missing tests |
| MEDIUM | 25 | Privacy, validation, type safety, UX, query efficiency |
| LOW | 22 | Code quality, minor UX, test coverage gaps |

---

## CRITICAL

### C-1 — `DELETE FROM events` with no WHERE clause in seeder wipes all real events
**File:** `scripts/seed-map-demo.ts:54`
**Category:** Destructive data loss
**Found by:** Database review
**Description:** The seeder runs `await db.delete(events)` with no WHERE clause, deleting every event in the database — including events created by real riders. Rider cleanup is correctly scoped to `@demo.ironcult.local`, but the events delete is unscoped.
**Fix:** Scope the events delete to `WHERE creator_id IN (demoRiderIds)` or filter demo events by a title prefix.

---

## HIGH

### H-1 — JWT stored in localStorage (XSS-exfiltratable, 7-day lifetime)
**Files:** `components/PresenceToggle.tsx:13`, `app/(app)/settings/page.tsx:26`, `app/(app)/routes/new/page.tsx:13`, `app/(app)/buddy-finder/page.tsx:52`, `app/(app)/events/page.tsx:34`, `lib/auth/jwt.ts:4`
**Category:** Security / Auth
**Found by:** Security review
**Description:** The JWT is stored in `localStorage` with a 7-day expiry. Any XSS anywhere in the app lets an attacker read the token and impersonate the rider for up to 7 days. No httpOnly cookie, no refresh-token rotation, no revocation list.
**Fix:** Move the token to an `HttpOnly; Secure; SameSite=Strict` cookie. If localStorage must stay for the demo, add a strict CSP (`script-src 'self'`).

### H-2 — Production secrets present in `.env.local` on disk
**File:** `.env.local` (not tracked in git — confirmed untracked)
**Category:** Security / Secrets
**Found by:** Security review
**Description:** Live Neon DB credentials, `JWT_SECRET`, and a Vercel OIDC token are in `.env.local`. While correctly gitignored, anyone with access to the dev machine or backups gets full DB + signing-key access. If `JWT_SECRET` is known, an attacker can forge tokens for any riderId.
**Fix:** Rotate the Neon password and `JWT_SECRET`. Prefer platform-managed env injection (Vercel project env) over local `.env.local` with production values.

### H-3 — Duplicate email registration produces unhandled 500
**File:** `app/api/auth/register/route.ts:13`
**Category:** Error handling
**Found by:** Architecture, Security reviews
**Description:** Unlike `crews/route.ts` (which handles unique violations), the register handler has no try/catch. A duplicate email hits a Postgres unique violation and returns a raw 500, which also implicitly confirms the email is registered (user enumeration).
**Fix:** Wrap in try/catch and return 409 Conflict using the `isUniqueViolation` pattern from `crews/route.ts`.

### H-4 — Malformed JSON body in login throws unhandled 500
**File:** `app/api/auth/login/route.ts:9`
**Category:** Error handling
**Found by:** Architecture review
**Description:** `await req.json()` throws if the body isn't valid JSON. No try/catch, so this becomes a 500. Missing `email`/`password` lead to a DB query with `undefined`.
**Fix:** Wrap in try/catch; validate `email` and `password` are non-empty strings before querying.

### H-5 — N+1 query in routes GET (average rating per route)
**File:** `app/api/routes/route.ts:29-33`, `app/(app)/routes/page.tsx:14-19`
**Category:** Performance / Database
**Found by:** Architecture, Database, Test reviews
**Description:** `GET /api/routes` fetches all routes, then issues a separate `SELECT avg(score)` query per route inside `Promise.all`. With N routes this is N+1 queries. The same pattern is duplicated in the server component.
**Fix:** Use a single query with LEFT JOIN and GROUP BY: `SELECT r.*, COALESCE(avg(ra.score),0) as average FROM routes r LEFT JOIN ratings ra ON ra.route_id = r.id GROUP BY r.id`.

### H-6 — Missing indexes on frequently-queried columns
**File:** `lib/db/schema.ts` (confirmed: `indexes: {}` across all snapshots)
**Category:** Performance / Database
**Found by:** Database review
**Description:** No indexes on `routes.voivodeship`, `routes.district`, `events.voivodeship`, or `presence.updatedAt`. Every events filter, turf-war GROUP BY, and presence query degrades to a full table scan as data grows.
**Fix:** Add Drizzle indexes on these columns and generate/apply a migration.

### H-7 — Integration tests never clean up — permanently pollute the shared dev DB
**Files:** All `tests/integration/*.test.ts`
**Category:** Test isolation (GH #55)
**Found by:** Database, Test reviews
**Description:** None of the integration tests have `afterAll`/`afterEach` cleanup. Every test inserts real riders/crews/routes/events/presence into the shared Neon dev DB and leaves them. This has already broken the live demo (229+ test riders, 100+ test crews polluting leaderboards/events).
**Fix:** Add `afterAll` cleanup to each test, use a dedicated test database, or run tests inside a transaction that rolls back.

### H-8 — Rider marker touch targets are 9×9px (way below 44px floor)
**File:** `app/globals.css:180-190` (`.presence-dot` with `min-width:0; min-height:0`)
**Category:** Mobile UX / Accessibility
**Found by:** Frontend review
**Description:** Real rider markers are 9×9px — the global `button { min-height: var(--touch-min) }` (44px) is explicitly defeated. Nearly impossible to tap on a 412px screen. `.presence-dot-self` is only 18×18px.
**Fix:** Give the marker a 44×44 transparent hit box while keeping the visible 9px dot centered (e.g. via `::before`).

### H-9 — No input validation on lat/lon before DB write or point-in-polygon
**Files:** `app/api/presence/route.ts:12`, `app/api/events/route.ts:17`, `app/api/routes/route.ts:11`
**Category:** Input validation
**Found by:** Security, Database reviews
**Description:** `lat`/`lon` are only checked for `!= null`. `NaN`, `Infinity`, or out-of-range values are written to `doublePrecision` columns and passed to `findWarsawDistrict`/`countNearbyRiders` without validation.
**Fix:** Validate `typeof lat === 'number' && isFinite(lat) && lat >= -90 && lat <= 90` (and `-180..180` for lon).

### H-10 — `GET /api/routes` has no integration test
**File:** `app/api/routes/route.ts:27-36` (untested)
**Category:** Test coverage gap
**Found by:** Test review
**Description:** The list handler's `averageRating` computation and N+1 pattern are untested. A regression (NaN average, broken join) would not be caught.
**Fix:** Add a test that creates a route, rates it, lists routes, and asserts a numeric `averageRating`.

### H-11 — LiveMap `escapeHtml` / popup HTML generation untested (XSS-critical)
**File:** `components/LiveMap.tsx:62-126`
**Category:** Missing tests / Security
**Found by:** Test review
**Description:** `riderPopupHtml` and `eventPopupHtml` build HTML strings via `escapeHtml` and pass them to `Popup.setHTML` — an XSS sink. `escapeHtml` is not exported and has zero direct coverage. A regression that skips escaping would allow script injection via a `displayName` like `<img src=x onerror=alert(1)>`.
**Fix:** Export `escapeHtml` to `lib/` and add a unit test asserting all XSS payloads are neutralized.

### H-12 — No component unit tests at all (no testing-library installed)
**Files:** All `components/*.tsx` — `PresenceToggle`, `BottomNav`, `AppNav`, `LiveMap`, etc.
**Category:** Missing tests
**Found by:** Test review
**Description:** There are zero component-level tests; the only coverage is via e2e. `BottomNav`'s active-route logic, `PresenceToggle`'s interval lifecycle, and `LiveMap`'s turf-war coloring are all untested in isolation.
**Fix:** Add `@testing-library/react` + `jsdom` environment; write unit tests for `BottomNav` active-state logic, `PresenceToggle` lifecycle, and `LiveMap` coloring.

---

## MEDIUM

### M-1 — Unauthenticated presence endpoint exposes real-time rider locations + identities
**File:** `app/api/presence/route.ts:27` (`GET`)
**Found by:** Security review
**Description:** `GET /api/presence` requires no auth and returns `displayName`, live `lat`/`lon`, `motorcycle`, and `rank` for every online rider. Email is not leaked (verified), but live location tracking of named individuals by an anonymous caller is a privacy issue.
**Fix:** Require `requireAuth(req)` on `GET`, or only return aggregated/anonymous pins for unauthenticated callers.

### M-2 — Events endpoint accepts `voivodeship` from the client (violates repo rule)
**File:** `app/api/events/route.ts:17-22`
**Found by:** Security review
**Description:** `routes.voivodeship` must be server-derived per AGENTS.md, but the events handler trusts the client-supplied `voivodeship` string, enabling spoofing.
**Fix:** Derive `voivodeship = findVoivodeship(lat, lon)` server-side, ignoring the client value.

### M-3 — No rate limiting on auth endpoints (brute-force / credential stuffing)
**Files:** `app/api/auth/login/route.ts`, `app/api/auth/register/route.ts`
**Found by:** Security review
**Description:** No middleware, no rate-limit code. Login can be hammered indefinitely.
**Fix:** Add IP-based throttling (10 login attempts/min/IP).

### M-4 — Registration has no password policy or email format validation
**File:** `app/api/auth/register/route.ts:8-13`
**Found by:** Security review
**Description:** A 1-character password is accepted. Email is not validated as an email format.
**Fix:** Require `password.length >= 8`, validate email with a regex.

### M-5 — Race condition in ratings upsert (read-then-write)
**File:** `app/api/routes/[id]/ratings/route.ts:15-22`
**Found by:** Database review
**Description:** `findFirst` → conditional `insert` is not atomic. Concurrent identical requests can both pass the check and both insert, violating the unique constraint — the second throws an unhandled 500.
**Fix:** Use `db.insert(ratings).values(...).onConflictDoUpdate(...)` to make it atomic, mirroring the presence upsert.

### M-6 — Events/presence GET loads ALL rows then filters in JS (no DB-level time window)
**Files:** `app/api/events/route.ts:45-53`, `app/api/presence/route.ts:28-50`
**Found by:** Database review
**Description:** Both routes fetch the entire presence table with no WHERE clause, then filter online status in JavaScript. As the table grows this returns unbounded rows.
**Fix:** Push the time-window filter into SQL: `WHERE updated_at > now() - interval '4 hours'`.

### M-7 — Online window is 4 hours, not 60 seconds
**File:** `lib/presence/online-window.ts:5`
**Found by:** Database review
**Description:** The constant is `4 * 60 * 60 * 1000` (4 hours) — intentional for the demo (seeded riders don't re-ping), but real riders who close the app stay "online" for 4 hours.
**Fix:** Make the window configurable via env (short for prod, long for demo), or set seeded riders' `updatedAt` to a far-future timestamp and keep the real window at 90s.

### M-8 — Events endpoint accepts client-supplied `voivodeship` (duplicate of M-2)
*See M-2 above.*

### M-9 — Markers destroyed and recreated every 10s (flicker)
**File:** `components/LiveMap.tsx:247-270`
**Found by:** Architecture review
**Description:** The markers `useEffect` runs on every `presenceRows` update (every 10s poll), removing ALL markers and re-adding them. Causes visible flicker.
**Fix:** Diff presence/event rows by ID and only add/remove changed markers using a `Map<string, MapLibreMarker>`.

### M-10 — Popups don't auto-close when another marker is clicked
**File:** `components/LiveMap.tsx:255-269`
**Found by:** Frontend review
**Description:** No shared "active popup" ref. Clicking marker B doesn't close marker A's popup — multiple popups stack and clutter the 412px viewport.
**Fix:** Track the open popup in a ref; close the previous popup before opening a new one.

### M-11 — Event markers are 40×40px (under 44px touch floor)
**File:** `app/globals.css:247-254`
**Found by:** Frontend review
**Description:** `.event-marker` is 40×40px, just under the `--touch-min` (44px) floor.
**Fix:** Bump to 44×44px (inner shape stays 26px).

### M-12 — Popup close button has distorted aspect ratio
**File:** `app/globals.css:300-307`
**Found by:** Frontend review
**Description:** `.maplibregl-popup-close-button` sets `width:32px; height:32px` but the global `button { min-height: var(--touch-min) }` (44px) still applies, rendering 32px wide × 44px tall.
**Fix:** Set `min-height:32px` explicitly (or raise to 44×44).

### M-13 — No security headers / CSP configured
**File:** `next.config.ts` (empty config), no `middleware.ts`
**Found by:** Security review
**Description:** Missing `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`. Given localStorage JWT and inline SVG data-URI avatars, a CSP would shrink the XSS surface.
**Fix:** Add `headers()` in `next.config.ts` with `script-src 'self'` and standard hardening headers.

### M-14 — Unsafe `as` casts on raw SQL results
**Files:** `app/api/turf-war/route.ts:16`, `app/api/events/route.ts:64,67`, `lib/leaderboard/queries.ts:13,47`
**Found by:** Architecture review
**Description:** `db.execute(sql\`...\`)` returns untyped rows. Manual `as` casts hide column mismatches if SQL changes.
**Fix:** Use Drizzle's `db.select()` builder with typed columns, or validate shapes at runtime.

### M-15 — Stale ref bug in React Strict Mode (dev)
**File:** `components/LiveMap.tsx:270`
**Found by:** Architecture review
**Description:** In Strict Mode (dev), the map init effect double-invokes. Markers are removed during cleanup but never re-added to the second map because `mapLoaded` doesn't re-trigger.
**Fix:** Add a state counter that increments on map reinitialization and include it in the markers effect deps.

### M-16 — Cascading deletes missing on owner-referencing FKs
**File:** `lib/db/schema.ts:26, 42-43, 52, 61`
**Found by:** Database review
**Description:** `routes.owner_id`, `ratings.rater_id`, `buddy_posts.rider_id`, `events.creator_id`, `presence.rider_id` all use `ON DELETE no action`. Deleting a rider is blocked unless children are manually deleted in order.
**Fix:** Add `onDelete: 'cascade'` to `presence` and `ratings` at minimum.

### M-17 — Duplicated `VOIVODESHIPS` constant
**Files:** `app/(app)/buddy-finder/page.tsx:6-10`, `app/(app)/events/page.tsx:6-10`
**Found by:** Architecture review
**Description:** Same 16-element array defined identically in two files.
**Fix:** Extract to `lib/geo/voivodeships.ts`.

### M-18 — Cross-test assertion contamination
**Files:** `tests/integration/events.test.ts:35`, `tests/e2e/full-flow.spec.ts:79-81`
**Found by:** Test review
**Description:** `events.test.ts` asserts `body.some(e => e.happeningNow)` which passes if *any* prior-run event is happening now. `full-flow.spec.ts` asserts turf-war ownership that depends entirely on accumulated route data from previous runs.
**Fix:** Assert on the specific resource just created (match by unique `id`/`title` containing `Date.now()`).

### M-19 — Crew creation has no ownership model; unlimited crews per rider
**File:** `app/api/crews/route.ts:26-35`
**Found by:** Security review
**Description:** No `ownerId` column, no cap on crew creation. Any rider can create arbitrarily many crews.
**Fix:** Add an `ownerId` reference and cap crews per rider.

### M-20 — `crews/join` returns 500 for non-existent crew (no 404)
**File:** `app/api/crews/join/route.ts:12`
**Found by:** Architecture, Security reviews
**Description:** FK constraint rejects unknown `crewId` with a raw 500 instead of a friendly 404.
**Fix:** `findFirst` the crew first → 404 if absent.

### M-21 — Bottom nav (z-index 30) can cover map popups
**File:** `app/globals.css:369-380`
**Found by:** Frontend review
**Description:** MapLibre popups render inside the map container's stacking context and can be covered by the bottom nav when a popup anchors near the screen bottom on a 412px device.
**Fix:** Raise popup z-index to 40, or enable MapLibre's auto-pan.

### M-22 — Keyboard tab-order flooded by hundreds of map marker buttons
**File:** `components/LiveMap.tsx:255-269`
**Found by:** Frontend review
**Description:** All markers are `<button>` with default `tabIndex 0`. With 500+ presence dots, keyboard users must tab through an enormous chain.
**Fix:** Set `tabIndex={-1}` on presence dots (programmatic focus only); keep event markers focusable.

### M-23 — `Date.now()` test-data uniqueness can collide in parallel runs
**Files:** All integration tests using `${Date.now()}` for uniqueness
**Found by:** Database, Test reviews
**Description:** Millisecond resolution can collide in parallel test files, causing a spurious 500/409.
**Fix:** Use `crypto.randomUUID()` for test-data uniqueness.

### M-24 — Events GET deletes demo presence data that other tests depend on
**File:** `tests/integration/events-map-details.test.ts:43-52`
**Found by:** Database review
**Description:** This test wipes `@demo.ironcult.local` presence in `beforeAll`, destroying seeded demo data other tests may depend on.
**Fix:** Delete only the specific rider IDs created in this test's `beforeAll`.

### M-25 — E2E production test depends entirely on external state
**File:** `tests/e2e/live-map-demo.spec.ts:51-60`
**Found by:** Test review
**Description:** The `DEMO_SEEDED` test asserts event/rider counts against the real API with no mocks. If the seeder wasn't run, it silently skips. If seeded data drifts, it fails with no in-test remediation.
**Fix:** Drive the seed from a `globalSetup` step so the test is self-contained.

---

## LOW

| # | File(s) | Finding | Category |
|---|---------|---------|----------|
| L-1 | `lib/auth/decode-rider-id.ts` | Decodes JWT without signature verification (cosmetic only, not an auth bypass) | Security |
| L-2 | `app/api/routes/route.ts:11` | No enum/range validation for `difficulty`, `bikeType`, `sceneryTags` | Validation |
| L-3 | Multiple routes | `throw e` leaks error details in development mode | Error handling |
| L-4 | `next.config.ts` | Default `create-next-app` metadata (`title: "Create Next App"`) | Code quality |
| L-5 | `lib/db/schema.ts` | No Drizzle relations defined (forces raw SQL joins) | ORM |
| L-6 | `lib/db/index.ts:5`, `lib/auth/jwt.ts:3` | Non-null assertions on env vars (`!`) — silent failures if missing | Type safety |
| L-7 | `components/LiveMap.tsx:298` | Double cast `as unknown as TurfWarData` bypasses type checking | Type safety |
| L-8 | `components/PresenceToggle.tsx:8-18` | `ping` stale closure in `useEffect` — fragile, currently safe | React patterns |
| L-9 | `app/globals.css:30-37` | Scrim opacity 0.94 makes background image nearly invisible | Visual |
| L-10 | `app/globals.css:364-366` | Bottom nav overlays bottom 64px of map (markers untappable there) | Layout |
| L-11 | `components/LiveMap.tsx:314` | Popup `maxWidth: '320px'` in JS doesn't match CSS `.map-card` 280px | Consistency |
| L-12 | `lib/geo/voivodeship.ts:32-36` | Inner rings (polygon holes) ignored in point-in-polygon test | Geometric accuracy |
| L-13 | `lib/turf-war/ownership.ts:7-10` | Tie-break is alphabetical by crew name (deterministic but arbitrary) | Determinism |
| L-14 | `scripts/seed-map-demo.ts:121` | Demo rider email has redundant district slug | Data hygiene |
| L-15 | `app/api/crews/join/route.ts:12` | `updated` may be undefined if rider deleted between auth and update | Error handling |
| L-16 | `tests/unit/map/checkins.test.ts` | Radius boundary (exactly 220m) not tested; empty arrays untested | Test coverage |
| L-17 | `lib/demo/rider-card.ts:25` | `riderRank` special-case branches untested | Test coverage |
| L-18 | `tests/unit/turf-war/ownership.test.ts` | `pickOwner([])` empty input not tested | Test coverage |
| L-19 | `tests/unit/presence/online-window.test.ts` | Exact 4h boundary not tested | Test coverage |
| L-20 | `tests/unit/crew-color.test.ts` | Hue-spread not quantitatively tested (only one pair) | Test coverage |
| L-21 | `playwright.config.ts:26-31` | `reuseExistingServer: true` can bind to wrong app on port 3100 | Config |
| L-22 | Multiple e2e specs | Mobile specs re-declare `test.use(devices['Pixel 7'])`, running twice | Config |

---

## Confirmed Safe (No Issues)

| Area | Finding |
|------|---------|
| **SQL injection** | All `db.execute(sql\`...\`)` calls use Drizzle tagged-template parameterization. Safe. |
| **XSS in LiveMap popups** | `escapeHtml` correctly escapes `& < > " '` and is applied to all user content. No `dangerouslySetInnerHTML`. Safe. |
| **IDOR on mutations** | Every write uses `riderId` from `requireAuth(req)`, never from request body. No edit/delete endpoints exist. Safe. |
| **`.env.local` git tracking** | Correctly gitignored; `git ls-files` confirms untracked; no commit history. Safe (disk exposure is H-2). |
| **JWT algorithm** | `jsonwebtoken` v9 defaults to HS256; no `alg:none` bypass. Safe. |
| **Password hashing** | bcrypt cost 10. Acceptable. |

---

## Top 5 Priorities

1. **C-1**: Fix the unscoped `DELETE FROM events` in the seeder before anyone runs it against production
2. **H-7**: Fix test data isolation (GH #55) — tests are breaking the live demo
3. **H-1**: Move JWT to httpOnly cookie (biggest single security risk multiplier)
4. **H-5 + H-6**: Fix the N+1 rating query and add missing indexes
5. **H-8**: Fix the 9px rider marker touch target (unusable on mobile)