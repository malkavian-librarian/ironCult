# CLAUDE.md — ironCult

@AGENTS.md

## Project context

ironCult is a minimalistic, Poland-only motorcycle social network (Next.js App Router +
TypeScript, Neon Postgres/Drizzle, hand-rolled JWT auth, MapLibre GL). Riders log routes, rate
each other's routes, join crews, see leaderboards, post buddy-finder requests, browse events, and
see a live map of Poland with rider presence, events, and a "turf war" crew-ownership layer per
voivodeship. Built under a 6-hour hackathon time budget; Vercel-hosted.

- Run: `npm run dev` · Test: `npx vitest run` · Deploy: Vercel (via `vercel:vercel-cli` /
  `vercel:deploy` skill)
- Full design rationale, scope cuts, data model, and phase/track breakdown:
  [docs/superpowers/specs/2026-08-28-ironcult-design.md](docs/superpowers/specs/2026-08-28-ironcult-design.md)
- Phase/track implementation plans: [docs/superpowers/plans/](docs/superpowers/plans/)
  (`phase0-foundation.md`, `track-a-community-content.md`, `track-b-live-map-social.md`,
  `phase4-integration-review.md`)
- Repo: https://github.com/malkavian-librarian/ironCult · Project board:
  https://github.com/users/malkavian-librarian/projects/1/views/1

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
  `phase:4`). Update/close the issue as part of finishing the task, not as a separate pass later —
  this is what makes handover between sessions/agents cheap. See
  [.claude/rules/github-projects.md](.claude/rules/github-projects.md).

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
  stacks, matching Rid3rMap's precedent.
- **Auth is hand-rolled JWT/Bearer, not NextAuth** — deliberate, so it's portable to a future Expo
  mobile client. Don't "fix" this by reintroducing NextAuth.
- **`buddyFinder` and `meetups` at repo root are market-research docs**, not app files — see
  Phase 0 Task 1 for relocating them to `docs/research/` if not already done.
- **Track A and Track B never touch each other's application code** — they share only the Phase 0
  schema (`lib/db/schema.ts`). Turf-war is a read-only query against Track A's tables from Track B.
- **`voivodeship` on `routes` is always derived server-side** from lat/lon via point-in-polygon —
  never accept it as client input.
