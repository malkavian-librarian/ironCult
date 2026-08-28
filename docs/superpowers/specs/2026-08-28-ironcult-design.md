# ironCult — Design Spec

**Date:** 2026-08-28
**Status:** Approved for planning
**Repo:** https://github.com/malkavian-librarian/ironCult (created, empty)
**Project board:** https://github.com/users/malkavian-librarian/projects/1/views/1 (created, empty)
**Context:** Hackathon build, 6-hour hard time budget, target hosting Vercel. Sibling project to Rid3rMap (`C:\Users\FlyerOne\Desktop\Rid3rMap`), reused as a styling/architecture reference only — this is a from-scratch codebase, not a fork.

## 1. Product summary

ironCult is a minimalistic, Poland-only motorcycle social network. Riders register, maintain a profile, log simplified routes, rate other riders' routes, join a crew, see crew and individual leaderboards, post/browse buddy-finder requests for planned rides, create/browse local events, and — the centerpiece feature — see a live map of Poland showing riders currently out riding, events happening now, and a "turf war" layer.

**2026-08-28 decision (mid-Phase-0):** For the demo, turf-war zooms into Warsaw specifically rather than staying at whole-Poland-voivodeship granularity — Warsaw is split into its own district polygons and turf ownership for the demo is computed per-district within Warsaw. This is additive, not a replacement: `routes.voivodeship` (all 16 voivodeships) is still derived and used everywhere else (buddy finder, events, leaderboards). A new nullable `routes.district` is derived via a second point-in-polygon check against Warsaw's district boundaries, populated only for routes that fall inside Warsaw. See §5 and §6 (Task 4) for the mechanics.

Source material: two market-research docs seeded the two secondary feature sets —
- Buddy Finder (Linear HER-14): match riders by planned route/dates/style/experience/pace/language.
- Meetup & Event Discovery (Linear HER-2): location-based event discovery with distance/date filtering.

Both are deliberately narrowed from their original "swipe app" / "full ticketing platform" ambitions to fit a 6-hour build (see §3, cut decisions).

## 2. Why not just fork Rid3rMap

Rid3rMap is local-first: SQLite file DB, local-disk file storage, NextAuth cookie sessions — none of which survive Vercel's ephemeral filesystem or generalize to a future Expo mobile client. ironCult needs a backend that is production-viable for a native app shipped to app stores within weeks, so the persistence and auth layers are rebuilt from scratch even though the visual language and some UI patterns are reused by reference.

## 3. Scope and explicit cuts

Chosen scope tier: **"Balanced Whoa"** — full feature breadth, simplified depth on each piece, so the live map remains achievable in the time budget.

Explicitly cut, and why:
- **No GPX file upload/parsing.** Rid3rMap's GPX pipeline (validation, trackpoint parsing, stats derivation, file storage) is the single most expensive piece to port under strict TDD. Routes are entered as coordinates instead (see §5).
- **No swipe UI for Buddy Finder.** A filtered list of "riding in region X on date Y" posts serves the same purpose for a fraction of the UI work.
- **No true real-time transport (no websockets/Pusher).** Presence is a polled table (~10s interval) — reads as "live" in a demo without the operational complexity of a pub-sub layer.
- **No route-geometry similarity matching.** Buddy Finder matches on voivodeship + date overlap + profile fields, not on comparing two routes' paths.
- **No scoring formula for turf wars.** Ownership is a straight count (routes per district per crew within Warsaw, highest wins — see 2026-08-28 decision above), recomputed live via SQL query on read — not a maintained/cached score, not a time-decayed contest mechanic.
- **No crew management beyond create/join.** No leave, no ownership transfer, no invites — a rider picks "create new" or "join existing by name" once in settings.

Kept, deliberately, despite the time pressure (explicit user calls):
- Both individual leaderboard (upload count) and crew leaderboard (combined route count) — two ranking views, not consolidated to one.
- Simple 1–5 star route ratings with average recompute.
- Real browser Geolocation for presence (not simulated/bot data) — this is the one place where "live" needs to actually be live for the demo to land.
- Crews are a real joinable entity (not just per-rider ownership) — full CRUD-lite slice.
- Events are rider-created, not seed-only.

## 4. Backend architecture

- **Next.js App Router + TypeScript**, deployed on Vercel.
- **Database:** Neon Postgres (Vercel Marketplace integration), Drizzle ORM — same ORM as Rid3rMap for convention familiarity, entirely new schema/migrations.
- **File storage:** none needed. Routes are coordinate-based; no upload pipeline exists in this scope.
- **Auth:** hand-rolled JWT/Bearer, not NextAuth.
  - `POST /api/auth/register`, `POST /api/auth/login` issue a signed JWT (short-lived access token; refresh is out of scope for the hackathon — a long-enough expiry, e.g. 7 days, is acceptable).
  - Client (web app for the hackathon; Expo app later) stores the token and sends `Authorization: Bearer <token>` on every authenticated call.
  - A shared `requireAuth(req)` helper in `lib/auth/` decodes/verifies the token and returns the rider id, used by every protected route handler — this is the one piece every other route handler in both tracks depends on, so it ships in Phase 0.
- **API shape:** every `/api/*` route is a plain JSON Route Handler — directly reusable by Expo later with no web-specific assumptions (no reliance on cookies, no Server Component-only data fetching for anything a mobile client would need).

## 5. Data model

Defined once, in full, in Phase 0. Both tracks build against this fixed schema — this is what lets Track A and Track B proceed without file/table collisions.

```
riders
  id, email (unique), passwordHash, displayName,
  style, experience, pace, language,   -- free-text or small enums, riders' own words
  crewId (nullable FK -> crews.id),
  createdAt

crews
  id, name (unique), createdAt

routes
  id, ownerId (FK -> riders.id), title,
  startLat, startLon, endLat, endLon,
  difficulty, bikeType, sceneryTags,    -- reuse Rid3rMap's enum literal sets
  voivodeship,                          -- derived server-side from startLat/startLon
                                         -- via point-in-polygon at create time; never client-supplied
  district,                             -- nullable; derived server-side via a second point-in-polygon
                                         -- check against Warsaw's district boundaries; set only when
                                         -- the route falls inside Warsaw, null everywhere else in Poland
  createdAt

ratings
  id, routeId (FK), raterId (FK -> riders.id), score (1-5),
  unique(routeId, raterId)

buddy_posts
  id, riderId (FK), voivodeship, plannedDate, note, createdAt

events
  id, creatorId (FK), title,
  type (rally | trackday | bikenight | swapmeet),
  voivodeship, lat, lon, startsAt, createdAt

presence
  riderId (PK, FK -> riders.id), lat, lon, updatedAt
  -- one row per rider, upserted on each ping; a row with
  -- updatedAt older than ~2 minutes is treated as offline (filtered at query time, no cron needed)
```

Poland voivodeship boundaries: a bundled GeoJSON (16 features, `admin-1` level) is added under `public/map/` in Phase 0, used both for (a) server-side point-in-polygon to derive `routes.voivodeship` and (b) client-side map outline/coloring for the turf-war layer.

## 6. Feature tracks

**Phase 0 — Foundation** (this Claude Code session, executed immediately after spec approval, before any track starts):
repo scaffold; full schema + migrations; JWT auth (register/login/`requireAuth` helper); voivodeship GeoJSON + point-in-polygon helper; base design tokens/CSS (Poland-only monochrome look, referencing Rid3rMap's `app/globals.css` token set); app shell/nav; Vercel project linked with an initial empty deployment; every Track A/B task filed as a GitHub issue on the existing project board.

**Track A — "Community & Content"** (separate Claude Code session, own plan document):
rider settings (profile fields + crew picker), crew create/join, crew leaderboard page, individual leaderboard page, route create/browse, ratings.

**Track B — "Live Map & Social"** (opencode / GLM 5.2 session, own plan document):
buddy finder (create post, filtered list by voivodeship+date), events (create, browse/filter by voivodeship+date, "happening now" badge), presence ("I'm riding" geolocation toggle + polling), and the live map page — assembles presence pins + event pins + turf-war voivodeship coloring. Turf-war is a read-only SQL query (`GROUP BY voivodeship, crewId ORDER BY count DESC`) against Track A's `routes`/`crews` tables — Track B never touches Track A's application code, only the shared schema from Phase 0.

**Phase 4 — Integration & Final Review** (a fourth plan document, executed after both tracks report their GitHub issues closed):
merge both track branches into `main`; one code-review pass over the full merged diff; end-to-end Playwright smoke suite exercising both tracks together (register → create/join crew → create route → rate a route → post a buddy request → create an event → toggle presence → confirm the live map renders presence pins, event pins, and turf-war coloring correctly); fix any integration bugs surfaced; deploy to Vercel production.

## 7. Process (applied per task, inside every track plan)

Strict TDD per task: write a failing test → implement → confirm tests pass → code-review pass → simplify pass → local Playwright smoke test (UI-facing slices only) → commit → push to a feature branch/PR linked to its GitHub issue → **explicit stop-and-review checkpoint** before starting the next task.

Cost control: mechanical/cheap steps — writing individual unit tests from a given spec, boilerplate CRUD scaffolding, running a code-review pass, running the Playwright smoke check — are delegated to Haiku subagents (`Agent` tool, `model: haiku`). The orchestrating session in each track handles schema-adjacent decisions, integration judgment calls, and anything ambiguous enough that a cheap model would guess wrong.

GitHub issues (filed in Phase 0, onto the existing project board) are tagged `phase:0`, `track:A`, `track:B`, or `phase:4` and map 1:1 to tasks in each plan document, so progress on the board reflects plan progress without extra bookkeeping.

## 8. Testing strategy

- **Unit tests:** pure logic — point-in-polygon voivodeship derivation, JWT sign/verify helper, buddy-finder date/region matching, turf-war "winner" query logic, "happening now" time-window calculation.
- **Integration tests:** real API route handlers against a genuine Neon (or local Postgres/test DB) instance — no mocking the app's own DB, matching Rid3rMap's existing convention. Auth is exercised for real (issue a token, send it, confirm `requireAuth` accepts/rejects correctly) rather than mocked, since token-based auth is simple enough not to need Rid3rMap's `getServerSession`-mock exception.
- **Playwright smoke tests:** local, manually invoked per task for UI-facing slices; a full end-to-end smoke suite runs once in Phase 4 across the merged app.
- **No committed e2e CI pipeline** is in scope for the hackathon — matches Rid3rMap's existing precedent of manual Playwright verification without a committed suite, given the time budget.

## 9. Open items resolved during brainstorming (for traceability)

| Question | Decision |
|---|---|
| Overall scope tier | B — Balanced Whoa |
| Backend | Neon Postgres + Vercel Blob (later dropped, no files needed) + hand-rolled JWT |
| Process vs. scope tension | Cut feature depth, keep full TDD/review/Playwright/subagent process |
| Route entry | Simplified coordinate entry, no GPX parsing |
| Presence data source | Real browser Geolocation, opt-in toggle |
| Turf-war ownership basis | Route count per voivodeship, recomputed on read |
| Turf-war unit | Per crew (not per individual rider) |
| Buddy Finder matching basis | Voivodeship + date + profile fields (no route-geometry comparison) |
| Crew scope | Create/join only, plus a crew leaderboard page |
| Events scope | Rider-created, not seed-only |
| Leaderboards | Both individual and crew leaderboards kept |
| Ratings | Kept (simple 1–5 stars + average) |
| Execution model | Phase 0 foundation (this session) → Track A (Claude) + Track B (opencode/GLM) in parallel, own plan docs each → Phase 4 integration/review (fourth plan doc) |
