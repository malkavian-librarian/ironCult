# ironCult Phase 4 — Integration & Final Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to run this plan (not subagent-driven-development — this phase is inherently sequential/integrative, a single session should own the merge decision-making, though individual review/test steps may still delegate to Haiku subagents). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge Track A and Track B into `main`, verify the whole app works end-to-end as one product, fix integration bugs, and deploy the working prototype to Vercel production before the 6-hour deadline.

**Architecture:** No new features — this phase is merge, review, test, fix, deploy only.

**Tech Stack:** Same as Phase 0/A/B: Next.js, Drizzle+Neon, Vitest, Playwright, Vercel.

## Global Constraints

- **Do not start this plan until both Track A and Track B report their final STOP-AND-REVIEW checkpoints as complete** (all their GitHub issues closed, PRs open against `main`). If only one track is done and the deadline is close, proceed with merging that one track alone and note in the final report that the other track's features are absent from the deployed prototype — a partial working prototype beats no prototype.
- Repo: `https://github.com/malkavian-librarian/ironCult`. Project board: `https://github.com/users/malkavian-librarian/projects/1/views/1`.
- Git binary (Windows, this session): `C:\Users\FlyerOne\AppData\Local\GitHubDesktop\app-3.5.11\resources\app\git\cmd\git.exe`, store as `$git` in PowerShell.
- Time budget: this phase must fit in **whatever remains of the 6-hour window** — if you're down to under 30 minutes when starting this, skip straight to Task 2's merge + Task 5's deploy, and defer the full Playwright suite (Task 3) to a quick manual click-through instead. State clearly in the final report which steps were shortened and why.
- This is the last phase — there is no "next session" to hand off remaining work to within the hackathon window. Prioritize: (1) something is deployed and loads, (2) the core demo path works (register → see the live map with at least one pin or turf-war color), (3) everything else.
- **Acceptance criteria checklist, required before every task (added 2026-08-28):** before starting any task below, create its GitHub issue (label `phase:4` — none pre-filed, unlike Phase 0/Track A/B) with an "## Acceptance Criteria" checklist (GitHub `- [ ]` task-list syntax) derived from that task's own steps/expected outcomes below. On finishing: re-verify against each criterion, check off (`- [x]`) what passed, post a completion comment with pass/fail per criterion, then close the issue. Full mechanics: `.claude/rules/github-projects.md`. Given this phase's tight time budget, keep each checklist short (3-6 items) — the point is a checkable contract, not exhaustive prose.
- Turf-war in this phase's Task 3 end-to-end test and Task 5 smoke-check is **Warsaw-district-based**, not whole-Poland-voivodeship — see the design spec's 2026-08-28 addendum and Track B's Task 5. If you see `voivodeship` where `district` is meant in this doc's remaining text, treat `district` as correct (this note was added after the rest of this plan was drafted).

---

### Task 1: Pre-merge check

- [ ] **Step 1: Fetch both branches**

```powershell
$git = "C:\Users\FlyerOne\AppData\Local\GitHubDesktop\app-3.5.11\resources\app\git\cmd\git.exe"
Set-Location "C:\Users\FlyerOne\Desktop\ironCult"
& $git fetch origin
& $git checkout main
& $git pull origin main
```

- [ ] **Step 2: Confirm both PRs exist and list their file changes**

```powershell
gh pr list --repo malkavian-librarian/ironCult
gh pr diff <track-a-pr-number> --name-only
gh pr diff <track-b-pr-number> --name-only
```
Confirm the file lists don't overlap except in expected shared read paths (neither track should have touched `lib/db/schema.ts`, `lib/auth/*`, `lib/geo/voivodeship.ts`, or each other's `app/api/*`/`app/(app)/*` directories — if they do overlap unexpectedly, read the diff before merging, don't merge blind).

---

### Task 2: Merge both tracks into main

- [ ] **Step 1: Merge Track A**

```powershell
& $git checkout main
& $git merge origin/track-a --no-ff -m "Merge Track A: community & content"
```
If there's a conflict, resolve it by reading both sides — the only files where a conflict is expected/acceptable are `app/globals.css` (both tracks may have added CSS rules; keep both) and `package.json`/`package-lock.json` (dependency lists; keep the union of both tracks' added dependencies, then run `npm install` once after all merges to regenerate a consistent lockfile).

- [ ] **Step 2: Merge Track B**

```powershell
& $git merge origin/track-b --no-ff -m "Merge Track B: live map & social"
```
Resolve conflicts the same way as Step 1.

- [ ] **Step 3: Reinstall and regenerate the lockfile once, cleanly**

```powershell
Remove-Item node_modules -Recurse -Force -ErrorAction SilentlyContinue
npm install
```

- [ ] **Step 4: Run the full test suite**

```powershell
npm run typecheck
npx vitest run
```
Expected: all tests from both tracks pass together. If a test fails only when both tracks' code coexists (e.g. a route collision, a shared table row left in a bad state by test ordering), that's a real integration bug — fix it now, don't skip it.

- [ ] **Step 5: Manually boot the dev server and click through nav**

```powershell
npm run dev
```
Visit every route in the nav bar (`/settings`, `/crews` or wherever the crew picker lives, `/leaderboard`, `/routes`, `/routes/new`, `/buddy-finder`, `/events`, `/map`) and confirm each renders without a crash. Note any that fail.

- [ ] **Step 6: Push the merged main**

```powershell
& $git push origin main
```

---

### Task 3: End-to-end Playwright smoke suite

**Files:**
- Create: `tests/e2e/full-flow.spec.ts`

- [ ] **Step 1: Write the end-to-end flow test**

Create `tests/e2e/full-flow.spec.ts`:
```typescript
import { test, expect } from '@playwright/test';

test('full ironCult flow: register, crew, route, buddy post, event, live map', async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;

  // Register — adjust selectors to match the actual register page markup once built;
  // if there is no dedicated /register page (auth may only be exercised via API in this
  // hackathon scope), call the API directly via page.request instead:
  const registerRes = await page.request.post('/api/auth/register', {
    data: { email, password: 'hunter22', displayName: 'E2E Rider' },
  });
  expect(registerRes.ok()).toBe(true);
  const { token } = await registerRes.json();

  // Store the token the same way the app's Client Components read it
  await page.addInitScript((t) => { window.localStorage.setItem('ironcult_token', t); }, token);

  // Create a crew
  const crewRes = await page.request.post('/api/crews', {
    headers: { authorization: `Bearer ${token}` },
    data: { name: `E2E Crew ${Date.now()}` },
  });
  expect(crewRes.ok()).toBe(true);
  const crew = await crewRes.json();
  const joinRes = await page.request.post('/api/crews/join', {
    headers: { authorization: `Bearer ${token}` },
    data: { crewId: crew.id },
  });
  expect(joinRes.ok()).toBe(true);

  // Create a route
  const routeRes = await page.request.post('/api/routes', {
    headers: { authorization: `Bearer ${token}` },
    data: { title: 'E2E Route', startLat: 52.2297, startLon: 21.0122, endLat: 52.3, endLon: 21.1, difficulty: 'easy', bikeType: 'touring', sceneryTags: 'plains' },
  });
  expect(routeRes.ok()).toBe(true);

  // Rate the route
  const route = await routeRes.json();
  const rateRes = await page.request.post(`/api/routes/${route.id}/ratings`, {
    headers: { authorization: `Bearer ${token}` },
    data: { score: 5 },
  });
  expect(rateRes.ok()).toBe(true);

  // Post a buddy request
  const buddyRes = await page.request.post('/api/buddy-posts', {
    headers: { authorization: `Bearer ${token}` },
    data: { voivodeship: 'mazowieckie', plannedDate: '2026-09-20', note: 'E2E ride' },
  });
  expect(buddyRes.ok()).toBe(true);

  // Create an event
  const eventRes = await page.request.post('/api/events', {
    headers: { authorization: `Bearer ${token}` },
    data: { title: 'E2E Bike Night', type: 'bikenight', voivodeship: 'mazowieckie', lat: 52.23, lon: 21.01, startsAt: new Date().toISOString() },
  });
  expect(eventRes.ok()).toBe(true);

  // Ping presence
  const presenceRes = await page.request.post('/api/presence', {
    headers: { authorization: `Bearer ${token}` },
    data: { lat: 52.23, lon: 21.01 },
  });
  expect(presenceRes.ok()).toBe(true);

  // Load the live map and confirm it renders with data present
  await page.goto('/map');
  await expect(page.locator('[data-testid="live-map"]')).toBeVisible();

  // Confirm turf-war endpoint reflects the crew's new route.
  // Turf-war is Warsaw-district-based (2026-08-28 scope update, see design spec addendum),
  // not voivodeship-based — the route's coords above (52.2297, 21.0122) are central Warsaw,
  // which lib/geo/voivodeship.ts's own test confirms resolves to district "srodmiescie".
  const turfRes = await page.request.get('/api/turf-war');
  const turfBody = await turfRes.json();
  expect(turfBody.srodmiescie).toBeDefined();
  expect(turfBody.srodmiescie.crewId).toBe(crew.id);

  // Confirm buddy finder list shows the post
  const buddyListRes = await page.request.get('/api/buddy-posts?voivodeship=mazowieckie');
  const buddyList = await buddyListRes.json();
  expect(buddyList.some((p: { note: string }) => p.note === 'E2E ride')).toBe(true);

  // Confirm events list shows the event as happening now
  const eventsListRes = await page.request.get('/api/events?voivodeship=mazowieckie');
  const eventsList = await eventsListRes.json();
  expect(eventsList.some((e: { title: string; happeningNow: boolean }) => e.title === 'E2E Bike Night' && e.happeningNow)).toBe(true);
});
```

- [ ] **Step 2: Run it against the local dev server**

```powershell
npm run dev
```
(in a separate terminal)
```powershell
npx playwright test tests/e2e/full-flow.spec.ts
```
Expected: PASS. If any assertion fails, that's a real integration bug between the two tracks (e.g. a voivodeship or district slug mismatch between what Track A's point-in-polygon helpers produce and what Track B's buddy-finder/events forms hardcoded as filter options, or the turf-war layer expects) — fix it now. **Slug consistency is the single most likely integration bug** given both tracks independently hardcode or derive voivodeship/district strings; if `turfBody.srodmiescie` is undefined, check whether `findVoivodeship(52.2297, 21.0122)` and `findWarsawDistrict(52.2297, 21.0122)` actually return `"mazowieckie"` / `"srodmiescie"` (see `lib/geo/voivodeship.ts`'s own test) versus what this test assumes — align on whatever the real values are.

- [ ] **Step 3: Commit**

```powershell
& $git add tests/e2e/full-flow.spec.ts
& $git commit -m "test: end-to-end smoke flow across both tracks"
& $git push origin main
```

---

### Task 4: Code review pass over the full merged diff

- [ ] **Step 1: Run a code review comparing main against its state before this session's merges**

Use the `/code-review` skill (or the `Agent` tool with a general-purpose or Haiku subagent for a first pass, escalating anything uncertain to yourself) over the combined diff of both tracks — look specifically for: auth bypasses (any route missing `requireAuth` that should have it), any client-supplied field that should be server-derived but isn't (voivodeship, riderId/ownerId, crewId in contexts where it should come from the token not the body), SQL built by string concatenation instead of parameterized queries, and any leaked `passwordHash` in an API response.

- [ ] **Step 2: Fix any CONFIRMED findings**

Apply fixes directly, re-run the relevant tests, commit each fix with a message like `fix: <issue> (post-merge review)`.

- [ ] **Step 3: Push**

```powershell
& $git push origin main
```

---

### Task 5: Deploy to Vercel production

- [ ] **Step 1: Confirm env vars are set on the Vercel project** (from Phase 0's Task 6 — `DATABASE_URL`, `JWT_SECRET`)

```powershell
npx vercel env ls
```
If either is missing, add it: `npx vercel env add DATABASE_URL production` (paste the value when prompted).

- [ ] **Step 2: Deploy**

```powershell
npx vercel --prod
```

- [ ] **Step 3: Smoke-check the production URL**

Visit the deployment URL and repeat Task 2 Step 5's nav click-through against production instead of localhost. Specifically confirm: register/login works, the live map loads (MapLibre renders in production, not just dev — this matters because Rid3rMap's history shows dev-only MapLibre bugs are a real risk class, see Track B's Task 4 note referencing `map-and-terrain.md`), and creating a route/event/buddy-post persists (reload the page, confirm the data is still there — this confirms Neon is actually being written to in production, not just working locally).

- [ ] **Step 4: Report the production URL**

---

### Task 6: Close out the project board

- [ ] **Step 1: Confirm all 12 Track A/B issues are closed** (`gh issue list --repo malkavian-librarian/ironCult --state open` should return none of them, or note any still open and why).

- [ ] **Step 2: Post a final status update to the project board**

```powershell
gh issue comment <any-tracking-issue-or-create-one> --repo malkavian-librarian/ironCult --body "ironCult prototype deployed: <production-url>. All Track A and Track B features merged and verified end-to-end."
```
If no single tracking issue exists to comment on, create one: `gh issue create --repo malkavian-librarian/ironCult --title "Hackathon prototype: final status" --body "<same message>"`, then close it immediately since the work it tracks is done.

- [ ] **Step 3: Final report to the user**

Summarize: production URL, which features are live and verified, anything cut or shortened due to time (per the Global Constraints note), any known bugs deferred, and total wall-clock time spent across all four phases.
