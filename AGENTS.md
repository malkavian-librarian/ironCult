<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# ironCult — agent-agnostic project rules

This section (below the Next.js-managed block above) is ours — safe to edit, not touched by
`next dev`. It exists for any agent/tool that reads `AGENTS.md` by convention but not
`CLAUDE.md` (e.g. opencode running Track B). Claude Code sessions should still read `CLAUDE.md`
first — it's the canonical index and `@`-imports this file.

**Read before writing any code:** `CLAUDE.md` (project index, workflow rules, Gotchas) →
`docs/superpowers/specs/2026-08-28-ironcult-design.md` (architecture, data model, scope) → your
track's plan doc under `docs/superpowers/plans/` → `.claude/rules/github-projects.md` (GitHub
issue/acceptance-criteria workflow, required before every task).

Pitch-day flow and what the demo needs to actually show:
[docs/demo-prep-checklist.md](docs/demo-prep-checklist.md) — Track B's turf-war layer is the
planned centerpiece of the demo, so know what it needs (seeded route+crew data inside Warsaw)
before considering that task done.

**Non-negotiable, repo-wide:**
- Never push directly to `main` from Track A/B — work on `track-a`/`track-b`, PR into `main`,
  `Closes #<issue>` in the PR body. **Exception**: on pitch/demo day, if the user explicitly
  asks for an urgent fix to go live ("hurry", "push to prod now") and the change is small,
  already type-checked, and already verified locally, a direct push straight to `main` is an
  acceptable judgment call — happened repeatedly on 2026-08-28 for CSS-only hotfixes minutes
  before the pitch. Still run `npx tsc --noEmit` first; still don't skip verification.
- Every route handler touching rider-owned data calls `requireAuth(req)` — never trust a
  client-supplied rider/owner/crew id in a request body.
- `routes.voivodeship` and `routes.district` are always server-derived (`findVoivodeship` /
  `findWarsawDistrict` from `@/lib/geo/voivodeship`) — never accepted from the client.
- Before starting a task, its GitHub issue needs an Acceptance Criteria checklist; on
  completion, check it against the real tests and post a pass/fail comment before closing it.
  See `.claude/rules/github-projects.md`.
- No Tailwind, no Google Fonts — use the CSS custom properties in `app/globals.css` and the
  `.panel` class.
- Nav visibility is CSS-only (`@media (min-width: 768px)` in `app/globals.css`), not
  `useMediaQuery` — `AppNav` renders both `NavBar` and `BottomNav` unconditionally; don't
  reintroduce a JS toggle (causes hydration flash).
- Use `100dvh` (not bare `100vh`) for anything meant to fill the mobile screen — bare `vh`
  overshoots on Android Chrome. Safe-area tokens (`--safe-top`, `--safe-bottom`), `--touch-min`
  (44px), and `--nav-height` are the CSS custom properties the mobile layout depends on.
