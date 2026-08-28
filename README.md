# ironCult

A minimalistic, Poland-only motorcycle social network. Riders log routes, rate each other's
routes, join crews, climb leaderboards, find ride buddies, browse events, and watch a live map of
Poland where crews fight over turf.

Built in 8 hours at **BRAVE UnAIted** (28.08.2026, Butelkownia, Warsaw) — see
[Hackathon](#hackathon) below.

## Features

- **Auth** — email/password registration and login, JWT/Bearer tokens (portable to a future
  mobile app, no cookie-based sessions).
- **Rider profiles** — display name, bio, motorcycle, riding style/experience/pace/language.
- **Crews** — create or join a crew; crew and individual leaderboards ranked by route count.
- **Routes** — log a route by coordinates (start/end lat-lon, difficulty, bike type, scenery
  tags); voivodeship is always derived server-side from the coordinates, never trusted from the
  client.
- **Ratings** — rate any route 1–5 stars; re-rating updates your existing score instead of
  duplicating it.
- **Buddy Finder** — post "riding in region X on date Y" requests, browse/filter others' posts by
  voivodeship and date.
- **Events** — create and browse local rides/meetups, filterable by voivodeship and date, with a
  live "happening now" badge.
- **Presence** — opt-in "I'm riding" toggle using real browser Geolocation, polled every ~10s.
- **Live map** — Poland-wide MapLibre map showing online riders and events in real time, plus a
  **turf-war** layer: Warsaw is split into its 18 districts, and each district is colored by
  whichever crew currently has the most logged routes there.

## Tech stack

- **Framework:** Next.js (App Router) + TypeScript, deployed on Vercel
- **Database:** Neon Postgres (Vercel Marketplace) via Drizzle ORM
- **Auth:** hand-rolled JWT/Bearer (no NextAuth) — `lib/auth/`
- **Map:** MapLibre GL JS, with a bundled Poland-voivodeship and Warsaw-district GeoJSON
  (`public/map/`) and a point-in-polygon helper (`lib/geo/voivodeship.ts`)
- **Styling:** plain CSS custom properties (`app/globals.css`) — no Tailwind, no Google Fonts
- **Testing:** Vitest (unit/integration) + Playwright (local smoke checks)
- **Process:** GitHub Issues + Projects board as the single source of truth for task state — see
  [CLAUDE.md](CLAUDE.md) and [.claude/rules/github-projects.md](.claude/rules/github-projects.md)

## Running locally

Prerequisites: Node.js 20+, a Neon (or any Postgres) `DATABASE_URL`, and a `JWT_SECRET`.

```bash
npm install
```

Create `.env.local` (see `.env.example` for the shape):

```
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
JWT_SECRET=some-long-random-string
```

Apply the schema (first run only, or after a schema change):

```bash
npx drizzle-kit migrate
```

Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app shell, auth, and every API route work
against your `DATABASE_URL` — no seed data required, register a rider and go.

**Run the tests:**

```bash
npm run test            # Vitest — unit + integration (hits the real DATABASE_URL, no mocking)
npx playwright test     # Playwright — local UI smoke checks (needs `npm run dev` running separately)
```

## Project structure

```
app/            Next.js App Router pages + API route handlers
lib/            Shared server logic: db, auth, geo helpers, domain queries
components/     Shared React components (nav, map, presence toggle, ...)
public/map/     Bundled GeoJSON boundaries (Poland voivodeships, Warsaw districts)
tests/          Vitest (unit/, integration/) and Playwright (e2e/) tests
docs/           Design spec, implementation plans, market research
```

## Hackathon

**BRAVE UnAIted** — 28.08.2026, Butelkownia, Warsaw. "Cała Polska buduje z AI for good" — an
8-hour build day (9:00–17:00, followed by results and a party) for BRAVE program alumni, organized
by BRAVE × Generatywni. Teams of 3–5 build a working prototype from idea to demo in a single day;
proceeds from the event support youth mental health, benefiting Fundacja Dajemy Dzieciom Siłę and
Fundacja Niepodzielni.

ironCult was built end-to-end during this window: Phase 0 (shared foundation: schema, auth, geo
helpers, design system, deploy) followed by two parallel tracks — Track A (community & content:
settings, crews, leaderboards, routes, ratings) and Track B (live map & social: buddy finder,
events, presence, the live map and turf-war layer) — merged and reviewed in a final integration
phase. Full process detail: [CLAUDE.md](CLAUDE.md) and
[docs/superpowers/plans/](docs/superpowers/plans/).
