# CLAUDE.md — ironCult

@AGENTS.md

## Project context

ironCult is a minimalistic, Poland-only motorcycle social network (Next.js App Router +
TypeScript, Neon Postgres/Drizzle, hand-rolled JWT auth, MapLibre GL). Riders log routes, rate
each other's routes, join crews, see leaderboards, post buddy-finder requests, browse events, and
see a live map of Poland with rider presence, events, and a "turf war" crew-ownership layer —
scoped to Warsaw districts for the demo (see Gotchas). Built in a single **8-hour** day (9:00–17:00)
at BRAVE UnAIted, 28.08.2026, Warsaw; Vercel-hosted at https://ironcult.vercel.app. User-facing
overview: [README.md](README.md). Pitch-day logistics: [docs/demo-prep-checklist.md](docs/demo-prep-checklist.md).

**Note:** the plan docs under `docs/superpowers/plans/` still say "6-hour" in a few places —
that's stale, inherited from an early draft before the actual Guide Book was read; the real
budget is 8 hours per the official schedule. Not worth a mass find-replace mid-hackathon; just
don't trust the "6-hour" number if you see it there.

### Quick start

```powershell
npm install
npx drizzle-kit migrate   # first run only, or after a schema change
npm run dev                # http://localhost:3000
npx vitest run              # unit + integration (hits real DATABASE_URL, no mocking)
npx playwright test         # local UI smoke checks (needs `npm run dev` running separately)
```

- Full design rationale, scope cuts, data model, and phase/track breakdown:
  [docs/superpowers/specs/2026-08-28-ironcult-design.md](docs/superpowers/specs/2026-08-28-ironcult-design.md)
- Phase/track implementation plans: [docs/superpowers/plans/](docs/superpowers/plans/)
  (`phase0-foundation.md`, `track-a-community-content.md`, `track-b-live-map-social.md`,
  `phase4-integration-review.md`, `2026-08-28-mobile-first-redesign.md`)
- Repo: https://github.com/malkavian-librarian/ironCult · Project board:
  https://github.com/users/malkavian-librarian/projects/1/views/1

### Directory map

```
app/            Next.js App Router pages + API route handlers
lib/            Shared server logic: db, auth, geo helpers (lib/geo/voivodeship.ts), domain queries
components/     Shared React components (NavBar, BottomNav, AppNav, LiveMap, PresenceToggle, ...)
public/map/     Bundled GeoJSON boundaries (poland-voivodeships.json, warsaw-districts.json)
tests/          Vitest (unit/, integration/) and Playwright (e2e/) tests
docs/           Design spec, implementation plans, demo-prep checklist, market research
.claude/rules/  Auto-loaded workflow rules (GitHub issues/acceptance-criteria/board)
```

---

## Keep this file lean

This file is an index, not a narrative. Point at `docs/superpowers/specs/` and
`docs/superpowers/plans/` instead of inlining architecture or task detail. One or two lines per
fact. Prune stale entries before merges/deploys rather than letting them accumulate.

---

## Session workflow

Start every session by reading: `CLAUDE.md` → the relevant plan under
`docs/superpowers/plans/` → `.claude/memory/` (if present).

- Every task ends with tests passing, a commit, and a push — see
  [.claude/rules/github-projects.md](.claude/rules/github-projects.md). We push often and fast;
  don't batch multiple tasks' worth of changes into one commit/PR.
- Each task maps to a GitHub issue on the project board (labels `phase:0`, `track:A`, `track:B`,
  `phase:4`, `phase:5`). Update/close the issue as part of finishing the task, not as a separate pass later —
  this is what makes handover between sessions/agents cheap. See
  [.claude/rules/github-projects.md](.claude/rules/github-projects.md).
- **Before starting any task, its GitHub issue must have an Acceptance Criteria checklist**
  (GitHub task-list syntax, derived from that task's own Interfaces/test spec in the plan doc —
  not generic). On completion, check off each criterion that actually passed and post a
  pass/fail comment before closing the issue. Full mechanics in
  [.claude/rules/github-projects.md](.claude/rules/github-projects.md#acceptance-criteria-required-before-every-subtask).

---

## Shipping in smaller increments

Decompose work into vertical slices (schema → API → UI → test for one feature), not horizontal
layers. Track A and Track B are separate sessions/branches by design — never let one touch the
other's application code; they only share the Phase 0 schema.

Per task: write a failing test → implement → confirm tests pass → code-review pass → simplify
pass → local Playwright smoke test (UI-facing slices) → commit → push → update/close the linked
GitHub issue → stop-and-review checkpoint before starting the next task.

Cost control: delegate mechanical/cheap steps (writing tests from a given spec, boilerplate CRUD,
a code-review pass, a Playwright smoke check) to Haiku subagents. Keep schema-adjacent decisions,
integration judgment calls, and anything ambiguous on the orchestrating session/top-tier model.

---

## Review

- Per-task review when each task's implementation is done. A final whole-branch review over the
  full merged diff happens once in Phase 4, after both tracks report their GitHub issues closed.
- Receiving review feedback is technical, not social: verify each finding against the code before
  implementing it.
- Evidence before assertions — never claim "done"/"passing" without having run the command and
  read the output in this session.

---

## Task-end commentary (always)

End every task with: what was done & why, anything deferred, which branch the changes sit on and
whether it's merged, whether review ran and findings were fixed, and whether it's pushed/deployed
(name the revision) — or explicitly not. State negatives plainly.

---

## Merge & deploy checklist

**Before** merging to `main` and/or deploying:
- Run `git status` before `add`/push/deploy — confirm no `.env*`, `node_modules/`, or `.next/`
  staged.
- Confirm the plan's task-level checkbox and its linked GitHub issue are both updated.
- Run the `security-review` skill before every push (per global instructions).

**After**:
- Update the GitHub issue (close it, or comment with status) and the project board column.
- Note anything deferred as a new/updated GitHub issue rather than a local-only note — the board,
  not a local file, is the durable handover surface for this repo.

---

## Working with sibling / reference repos

`C:\Users\FlyerOne\Desktop\Rid3rMap` is **reference only** — read-only, styling/architecture
reference. ironCult is a from-scratch codebase, not a fork; never copy files directly from it or
write to it.

---

## Model preferences

| Task | Model |
|------|-------|
| Schema-adjacent decisions, integration judgment, final reviews | Top tier |
| Default implementation, plan writing | Mid tier |
| Boilerplate tests/CRUD, mechanical code-review/smoke passes | Haiku |

---

## Rules (auto-loaded)

@.claude/rules/github-projects.md

---

## Gotchas

- **`git` is not in PATH.** Always use
  `C:\Users\FlyerOne\AppData\Local\GitHubDesktop\app-3.5.11\resources\app\git\cmd\git.exe`
  (store in `$git` at session start) — a bare `git` call fails immediately.
- **PowerShell only, no Bash** on this machine — `&&`/`||` aren't valid in PowerShell 5.1; use
  `;` or `if ($?) { ... }`.
- **No Tailwind, no Google Fonts** — plain CSS custom properties in `app/globals.css`, system font
  stacks, matching Rid3rMap's precedent. `create-next-app` scaffolds Geist Google Fonts by
  default in `app/layout.tsx` — this was stripped in Phase 0 Task 5; don't let it come back via a
  future scaffold/regen.
- **Auth is hand-rolled JWT/Bearer, not NextAuth** — deliberate, so it's portable to a future Expo
  mobile client. Don't "fix" this by reintroducing NextAuth.
- **Repo directory name `ironCult` has a capital letter** — both `npx create-next-app@latest .`
  and `npx vercel link` refuse to derive a project/package name from it ("names can no longer
  contain capital letters" / same for Vercel). Fix: scaffold into a lowercase temp dir and move
  files in (already done for the Next.js app), or pass an explicit name flag (`vercel link
  --project ironcult`). If you ever re-scaffold or re-link, expect this to bite again.
- **`drizzle-kit` and `vitest` do NOT auto-load `.env.local`** — only Next.js itself does. Both
  `drizzle.config.ts` and `vitest.config.ts` explicitly `config({ path: '.env.local' })` (via
  `dotenv`) rather than the plan's original `import 'dotenv/config'` (which only loads `.env`,
  and we don't have one). If a future config file needs `DATABASE_URL`/`JWT_SECRET` outside
  Next.js request handling, it needs the same explicit `.env.local` load or it'll silently see
  `undefined`.
- **Vitest doesn't resolve the `@/*` tsconfig path alias on its own** — `vitest.config.ts` has an
  explicit `resolve.alias` mapping `@` to the repo root. Without it, every `@/lib/...` import in a
  test fails with "Cannot find package" even though the same import works fine under `next build`.
- **`DATABASE_URL` (and its siblings) are auto-injected into Vercel Production/Preview/Development**
  by the Neon Marketplace integration (`vercel integration add neon`) — don't manually
  `vercel env add DATABASE_URL`, it's already there. `JWT_SECRET` is not auto-injected (it's
  app-specific) and must be added manually.
- **`vercel env add <VAR> preview --value <v> --yes` still prompts for a git branch** on this
  CLI version even with `--yes` piped `y` — it wants either a specific `--yes`-accepted branch
  arg or hits the same `action_required` JSON response regardless. Production and Development
  work fine with `--yes`; Preview needs manual follow-up (dashboard or a working CLI invocation)
  — don't assume Preview env vars are set just because Production/Development are.
- **`gh project item-add`/`item-edit` need the `project` OAuth scope**, which the default `gh
  auth login` token often lacks (`repo`/`workflow`/`read:org` only). Symptom: "your
  authentication token is missing required scopes [read:project]". Fix: `gh auth refresh -s
  project,read:project` (device-flow, needs the user to visit github.com/login/device and enter
  a code — can't be done non-interactively).
- **`buddyFinder` and `meetups` were relocated to `docs/research/`** as
  `buddy-finder-market-research.md` / `meetups-market-research.md` in Phase 0 Task 1 — if you see
  bare `buddyFinder`/`meetups` files at repo root again, something re-created them; they aren't
  app files.
- **AGENTS.md's `<!-- BEGIN:nextjs-agent-rules -->...<!-- END:nextjs-agent-rules -->` block is
  rewritten by `next dev` itself** — safe to edit AGENTS.md outside that block (that's where our
  own agent-facing conventions live), but don't hand-edit inside it, it'll just get overwritten.
- **Drizzle wraps a Postgres error as `{ message: "Failed query: ...", cause: NeonDbError }`** —
  the real Postgres error code (e.g. `23505` unique-violation) is on `err.cause.code`, not
  `err.code` on the error you catch. Checking `err.code` directly silently never matches and
  falls through to a 500 instead of the intended 409/etc. Walk `.cause` (see
  `isUniqueViolation()` in `app/api/crews/route.ts` for the pattern) when narrowing a catch to a
  specific Postgres error code.
- **`npx vitest run` (no path arg) picks up Playwright's `tests/e2e/*.spec.ts` files by default**
  and fails on all of them ("Playwright Test did not expect test() to be called here") —
  `tests/e2e/*.spec.ts` matches vitest's default `*.spec.ts` include glob even though those files
  use `@playwright/test`'s `test`, not vitest's. Fixed via `test.exclude: ['node_modules/**',
  'tests/e2e/**']` in `vitest.config.ts`. If a fresh `vitest run` (full suite, no path) reports
  failures only in `tests/e2e/*`, this is almost certainly it, not a real regression — check the
  actual vitest-run test count against what's expected before assuming something broke.
- **Track A and Track B never touch each other's application code** — they share only the Phase 0
  schema (`lib/db/schema.ts`). Turf-war is a read-only query against Track A's tables from Track B.
- **`voivodeship` on `routes` is always derived server-side** from lat/lon via point-in-polygon —
  never accept it as client input.
- **Turf-war scope changed mid-Phase-0 (2026-08-28): Warsaw districts, not whole-Poland
  voivodeships.** `routes.district` (nullable) is derived server-side via `findWarsawDistrict()`
  from `@/lib/geo/voivodeship`, populated only when a route falls inside Warsaw. `voivodeship`
  is unchanged and still used everywhere else (buddy finder, events, leaderboards). Track B's
  turf-war query must `GROUP BY district WHERE district IS NOT NULL`, not by voivodeship — see
  the design spec's 2026-08-28 addendum and issue #18 before touching `app/api/turf-war/*`.
- **`public/map/` has two boundary files, not one**: `poland-voivodeships.json` (16 features, all
  of Poland, base map + `findVoivodeship`) and `warsaw-districts.json` (18 features, Warsaw only,
  turf-war + `findWarsawDistrict`) — both produced by `lib/geo/voivodeship.ts`. Don't conflate
  them; the turf-war fill layer renders the Warsaw file, the base map/voivodeship derivation uses
  the Poland file.
- **`npx vitest run` does NOT typecheck — `next build` does, and a type error in a test file
  fails the Vercel deploy, not `npm run test`.** Symptom: `vitest run` is green locally, but the
  Vercel build log shows `Running TypeScript ... error TS2554: Expected 0 arguments, but got 1`
  (or similar) and `Error: Command "npm run build" exited with 1` — this happened for real:
  `tests/integration/leaderboard.test.ts` called `crewLeaderboard(new Request(...))` against a
  `GET()` handler that takes zero params; vitest ignored the extra arg (JS is lenient at
  runtime), but `next build`'s `tsc` pass caught the type mismatch and blocked every deploy from
  that branch. **Before pushing, run `npx tsc --noEmit` (or `npm run build` for the full check)
  in addition to `npx vitest run`** — vitest passing is not sufficient evidence the build will
  succeed.
- **Nav visibility is CSS-only, not `useMediaQuery`.** `components/AppNav.tsx` renders both
  `NavBar` (top, ≥768px) and `BottomNav`+`ProfileLink` (bottom tabs, <768px) unconditionally —
  `app/globals.css`'s `@media (min-width: 768px)` block is the only thing that decides which is
  visible. Don't reintroduce a JS-measured toggle; it reintroduces the hydration-flash bug this
  pattern was chosen to avoid.
- **The live map is the homepage (`/`), not a `/map` subpage.** The original Track B plan drafted
  a separate `/map` route; the mobile-first pass folded it into `app/page.tsx` directly so the map
  loads on first paint. `app/(app)/map/page.tsx` is a redirect stub, not the real map — if you see a
  reference to `/map` as a route, it's stale; fix the reference, don't recreate the route.
- **`100dvh`, never bare `100vh`, for anything meant to fill the mobile screen.** Bare `vh` on
  Android Chrome is measured against the viewport with the address bar collapsed, which overshoots
  the visible area on load and clips content — this bit `components/LiveMap.tsx` during the mobile
  redesign. `--safe-top`/`--safe-bottom`/`--touch-min`/`--breakpoint-tablet`/`--nav-height` are the
  five CSS custom properties that pattern depends on; don't duplicate them under new names.
- **MapLibre marker hit-areas (16–18px) are below the 44px touch-target floor** the rest of the app
  meets — a known, deliberately accepted gap from the mobile redesign (Task 3), not an oversight.
  Don't "fix" it by silently shrinking the visual marker size to hide the mismatch; if it's ever
  actually fixed, it needs a padded invisible hit-area, not a smaller marker.
- **`phase:5` is the GitHub label for cross-track mobile-redesign work** — it isn't `track:A` or
  `track:B` because it touches both tracks' pages after both were otherwise complete, the same way
  `phase:4` already covers cross-track integration. Reuse `phase:5` for any future work in this same
  "touches everything, both tracks are done" shape rather than inventing another label.
- **Two agent sessions in the same working directory (`C:\Users\FlyerOne\Desktop\ironCult`) share
  one git checkout** — there is no per-session isolation. Concretely hit during Phase 4 (2026-08-28):
  a GLM session doing the mobile-first redesign had `mobile-redesign` checked out, and a Claude
  Code commit meant for `main` landed on `mobile-redesign` instead, silently, because `git commit`
  just commits to whatever branch is currently checked out in the shared tree. Recovered via `git
  worktree add <tmp> main` + `git cherry-pick` + push, then `git reset --hard origin/<branch>` to
  strip the stray commit back off the other session's branch (safe only because it hadn't been
  pushed yet — check `git log <branch> vs origin/<branch>` before resetting). **Before committing,
  run `git status`/`git rev-parse --abbrev-ref HEAD` and confirm you're actually on the branch you
  think you're on** — don't assume the shared directory is still on the branch you last left it on.
  For any work not meant for the currently-checked-out branch, use a `git worktree` instead of
  switching branches in the shared tree.
