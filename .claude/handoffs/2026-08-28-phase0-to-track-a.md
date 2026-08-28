# Handoff: Phase 0 complete → Track A starting

**Date:** 2026-08-28
**From:** Phase 0 foundation session (this session)
**To:** Track A session (community & content) — separate session/agent, works on branch `track-a`
**Also relevant to:** Track B session (separate agent, parallel, branch `track-b`) — read this too,
most of it applies to both tracks.

## Read first, in this order

1. `CLAUDE.md` — project index, workflow rules, Gotchas (now substantially expanded, re-read even
   if you've seen an earlier version).
2. `docs/superpowers/specs/2026-08-28-ironcult-design.md` — architecture, data model. **Has a
   2026-08-28 addendum near the top and in §3/§5 — read it, it changes the data model** (see below).
3. `docs/superpowers/plans/2026-08-28-track-a-community-content.md` — your plan. Has been edited
   since it was first written (see "What changed in the plan doc" below) — the version in the repo
   right now is current, don't work from memory of an earlier read.
4. `.claude/rules/github-projects.md` — GitHub issue/acceptance-criteria workflow, required before
   every task.

## State of the repo right now

- `main` is pushed through commit `f62cc95`. Working tree clean.
- Next.js app scaffolded, schema live on Neon, JWT auth working, both geo helpers (voivodeship +
  Warsaw district) working, design tokens + nav live, deployed to
  **https://ironcult.vercel.app** (production, confirmed 200 OK).
- Env vars: `DATABASE_URL` set on Production/Preview/Development (Neon Marketplace
  auto-injected). `JWT_SECRET` set on Production/Development — **NOT on Preview** (hit a
  `vercel env add ... preview --yes` CLI confirmation quirk; if Track A needs a preview deploy,
  add it manually first: `npx vercel env add JWT_SECRET preview`).
- All 6 Phase 0 GitHub issues (#1–#6) closed. Project board:
  https://github.com/users/malkavian-librarian/projects/1/views/1

## Your issues: #7–#12

Pre-filed with `track:A` label, on the board (Backlog column), **each already has an Acceptance
Criteria checklist** (added after Phase 0's initial filing — see `.claude/rules/github-projects.md`
for the ongoing requirement to keep using this pattern for any task not already covered):

| Issue | Task |
|---|---|
| #7 | Rider settings (profile fields + crew picker) |
| #8 | Crew create/join |
| #9 | Crew leaderboard page |
| #10 | Individual leaderboard page |
| #11 | Route create (coordinate entry, server-derived voivodeship **+ district**) |
| #12 | Route browse + ratings |

**The plan doc's own `gh issue comment <n>`/`Closes #<n>` snippets already use these numbers** —
they were originally drafted assuming #1–#6 (before Phase 0 claimed those for its own tasks) and
were corrected in-place. If you're reading an older cached copy of the plan, don't trust numbers
below 7 for your track's issues.

## Scope change you need to know about: Warsaw-district turf-war

Mid-Phase-0, the user redirected: turf-war for the demo zooms into **Warsaw districts**, not
whole-Poland voivodeships. This is **additive** to the schema, not a replacement:

- `routes.voivodeship` — unchanged, still derived for all of Poland, still used everywhere else
  (buddy finder, events, leaderboards). Nothing about this changed for Track A except one thing:
- `routes.district` — **new, nullable** column. Your Task 4 (route create, issue #11) must derive
  it via `findWarsawDistrict(startLat, startLon)` from `@/lib/geo/voivodeship`, alongside the
  existing `findVoivodeship()` call. It's `null` for any route outside Warsaw — that's correct,
  not a bug, don't treat a null district as a validation failure the way a null voivodeship is.
  The plan doc's Task 4 section and its acceptance criteria (#11) already reflect this — just
  don't skip it because the surrounding prose talks mostly about voivodeship.
- `lib/geo/voivodeship.ts` exports both `findVoivodeship` and `findWarsawDistrict` already —
  nothing to build here, just call both.
- This does not otherwise affect your track. Track B (turf-war API/map layer) owns the
  consequences of this change on their end.

## What's genuinely new since the plan docs were first written

1. **Acceptance-criteria-first workflow is now required for every task** (added after Phase 0's
   initial issue filing, per explicit user instruction). Your issues already have checklists; the
   requirement going forward is: verify against each checklist item individually when you finish a
   task (run the actual test/command it names), check off what passed, post a completion comment
   with pass/fail per criterion, *then* close the issue. Don't just close with "done."
2. Issue numbering fix (see table above) — plan doc originally said #1–#6, now says #7–#12.
3. `routes.district` addition (see above).

## Known gaps / not done

- Preview env var (`JWT_SECRET`) — see above, only matters if you need a preview deploy.
- Nothing else known-broken. `npx vitest run` passes fully as of `f62cc95`.

## Track B

Running as a separate agent in parallel, on branch `track-b`, issues #13–#18. Per the design's own
constraint: **never touch Track B's files** (`app/api/buddy-posts/*`, `app/api/events/*`,
`app/api/presence/*`, `app/api/turf-war/*`, `app/(app)/buddy-finder/*`, `app/(app)/events/*`,
`app/(app)/map/*`, `components/LiveMap.tsx`, `components/PresenceToggle.tsx`, `lib/events/*`,
`lib/presence/*`, `lib/turf-war/*`). You may read `routes`/`crews` via SQL if needed but never
edit those files. Expected shared-touch conflict points on merge (Phase 4's job, not yours):
`app/globals.css` (both tracks may add CSS rules — keep both) and `package.json`/lockfile
(dependency unions).

## Phase 4

Not started. Waits for both Track A and Track B to report their final STOP-AND-REVIEW checkpoints
(all issues closed, PRs open against `main`).
