# GitHub Issues & Projects workflow

GitHub Issues + the repo's Project board (v2) are the **single source of truth** for task state —
not a local TODO list, not a plan checkbox alone. The reason: sessions/agents change (Claude Code,
opencode/GLM, a human), and the board is the only state that survives a handover without re-reading
this whole conversation. Every task in a plan doc under `docs/superpowers/plans/` maps 1:1 to a
GitHub issue.

Repo: https://github.com/malkavian-librarian/ironCult
Project board: https://github.com/users/malkavian-librarian/projects/1/views/1

`gh` CLI is available and authenticated on this machine — use it directly, no need to open the
browser.

## Push often and fast

- Commit and push at the end of **every** task, not batched across tasks. A task is "done" only
  once its commit is pushed to `main` (Phase 0) or to its feature branch/PR (Track A/B, Phase 4).
- Small, single-purpose commits/PRs over large ones — keep diffs reviewable (~400 lines / ~6 files
  as a soft ceiling, per the plan-decomposition convention). If a task is trending larger, split it
  before starting, not after.
- Never let uncommitted or unpushed work sit across a stop-and-review checkpoint — the checkpoint
  is exactly the moment to push, since it's the moment another session might pick up next.

## Issues

- One issue per plan task, filed with the task's title from the plan doc. Labels: `phase:0`,
  `track:A`, `track:B`, `phase:4` (per the design spec's tagging scheme) — this is what lets the
  board reflect plan progress without extra bookkeeping.
- Reference the issue number in the commit message (`#12`) and, for Track A/B/Phase 4 work that
  goes through a PR, use a closing keyword (`Closes #12`, `Fixes #12`) in the PR description so
  merging auto-closes it.
- Keep the issue body itself thin — link to the plan doc section rather than duplicating task
  detail. The issue's job is status + discussion, not spec.
- When a task's scope changes mid-work (cut, expanded, blocked), update the issue immediately —
  don't let the board drift from reality. A stale board is worse than no board for handover.

## Project board

- Move the issue's board status (Todo → In Progress → Done, or whatever columns the board uses)
  at the same time you touch the issue — not as a separate end-of-session sweep. Use
  `gh project item-edit` / `gh issue edit --add-project` or the board UI; either is fine, but do it
  now, not later.
- Phase 0 files every Track A/B task as an issue on the existing board *before* either track
  starts, so both tracks work from the board rather than re-deriving tasks from the plan doc.
- Phase 4 (integration) only starts once both tracks report their GitHub issues closed — the
  issues, not a verbal/chat confirmation, are the gate.

## Common `gh` commands

```powershell
# Create an issue from a plan task
gh issue create --title "Task N: <title>" --body "See docs/superpowers/plans/<file>.md#task-n" `
  --label "phase:0"

# List open issues for a track
gh issue list --label "track:A" --state open

# Close an issue when a task's commit lands
gh issue close 12 --comment "Done in <commit-sha>"

# Add an existing issue to the project board (project number 1, user malkavian-librarian)
gh project item-add 1 --owner malkavian-librarian --url https://github.com/malkavian-librarian/ironCult/issues/12

# Open a PR that auto-closes its issue on merge
gh pr create --title "Track A: crew leaderboard" --body "Closes #12" --base main
```

## Why this shape (sources)

- Small, single-purpose PRs review better and merge faster than large ones — over ~400 changed
  lines, review quality drops sharply. ([James Ross Jr., GitHub Best Practices](https://www.jamesrossjr.com/blog/github-best-practices))
- Pick one source of truth for task tracking (GitHub Issues here) rather than splitting state
  across Issues and an external tracker — the sync overhead is real and it's exactly what breaks
  handover. ([r/community discussion on issue/PR practices](https://github.com/orgs/community/discussions/163134))
- GitHub Projects v2 supports built-in and `gh`-scriptable automation (auto-add on issue
  create/label, `--json` output for scripting) — prefer wiring status changes through `gh` over
  manual board edits when doing several at once.
  ([Thomas Thornton, Using GitHub CLI with GitHub Actions for GitHub Project automation](https://thomasthornton.cloud/using-github-cli-with-github-actions-for-github-project-automation/))
