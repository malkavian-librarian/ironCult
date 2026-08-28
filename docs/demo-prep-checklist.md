# ironCult — Demo Prep Checklist

BRAVE UnAIted, 28.08.2026. Built from the official Guide Book's own rules (60-second effect,
feature freeze at 15:45, pitch 16:15–17:00) applied to ironCult specifically. See
[CLAUDE.md](../CLAUDE.md) for the technical/process side.

## Where we are right now (as of ~11:37, mid "Build część I")

| Guide's clock | Status |
|---|---|
| 9:00–13:00 Build I | Track A **done** (6/6 tasks, PR #19 open, 25/25 tests green). Track B running in a separate agent. |
| 13:00–13:45 Checkpoint | **Do this now-ish**: confirm Track B's progress, decide if Phase 4 (merge) starts at checkpoint or waits for Track B to finish. |
| 14:45–15:45 Build II | Phase 4 merge + integration review happens here if both tracks are closed by then. |
| **15:45 Feature Freeze** | Hard stop per the guide: deploy, correct data, test in a fresh browser + phone. No new features after this. |
| 16:15–17:00 Pitch | 60-second script, two vocal run-throughs, recorded screen capture as fallback. |

## The guide's rules that matter most for us

- **One effect, 60 seconds.** Don't try to show all 8 features. Pick the single moment that makes
  someone say "oh, I want that" and build the whole pitch around it.
- **Decision, not discussion**, after each checkpoint: does it work / was there an "oh nice"
  moment / what can be cut. If the answer is unclear at 14:00, cut scope — don't debate it.
- **Freeze at 15:45.** Whatever isn't demo-ready by then doesn't exist for pitch purposes.
- **Recording as Plan B.** Right after freeze, screen-record a full pass through the demo path.
  If Wi-Fi or Vercel hiccups on stage, play the recording instead of narrating a crash.
- **Real data, not Lorem ipsum.** 6–8 realistic Polish examples beat a live but empty database.

## Demo flow — pick one before 14:45 (don't decide live on stage)

### Option A — "Warsaw Turf War" (recommended: matches the guide's "one wow moment" rule best)

The turf-war map is ironCult's most visually distinctive feature and needs zero narration to
land — the guide explicitly rewards exactly this kind of moment.

1. Open `/map` already loaded (don't demo the page load).
2. Toggle **"I'm riding"** live on stage — a pin appears on Warsaw within ~10s (the poll
   interval). This is the "watch it happen live" beat.
3. Cut to a pre-created route + crew whose district is already colored on the map — point at the
   filled Warsaw district and say one sentence: "crews compete for turf by logging routes; this
   district currently belongs to [crew]."
4. Close on the buddy finder or events list for 5 seconds max — "and riders can also find company
   or events nearby" — do not open a form, do not type anything live.

Total: comfortably under 60 seconds for the core beat (steps 1–3); step 4 is padding, cut it first
if you're running long. **Rehearse steps 1–3 alone until they're under 45 seconds.**

### Option B — "Full user journey" (safer narrative, more feature coverage, higher risk of running long)

Register → set profile/crew → log a route → rate a route → post a buddy request → create an event
→ show the live map. Complete, but the guide's own warning applies directly: trying to narrate 7
features in 60 seconds reads as "asystent AI do wszystkiego" (a jack-of-all-trades demo), which is
exactly what the guide says jury remembers *least*. Use this only if Option A's map doesn't render
reliably in testing.

### Option C — Recorded fallback (always prepare this regardless of A or B)

Screen-record whichever option you choose, right after 15:45 freeze, on the actual deployed
production URL (not localhost). Keep the recording ready to play if the live network fails during
pitch — per the guide, this is not optional, it's a named "circuit breaker."

## Pre-demo checklist

### Data seeding (do this before 15:45, not during pitch)

- [ ] At least one rider registered with a memorable display name (not `test@example.com`)
- [ ] At least one crew created, with that rider joined to it
- [ ] At least one route logged **inside Warsaw** (e.g. Śródmieście: `startLat: 52.2297,
      startLon: 21.0122`) so `routes.district` is populated and the turf-war layer has something
      to color — an empty turf-war map is a dead demo moment
- [ ] At least 2–3 more routes/crews if you want to show more than one colored district
- [ ] One buddy-finder post and one event with `voivodeship: mazowieckie` (visible without
      needing to change filters on stage)
- [ ] Ratings on at least one route (so "average rating" isn't blank)

### Technical

- [ ] Production URL loads cleanly in an incognito/fresh browser tab (no stale localStorage token
      confusing the presence toggle)
- [ ] Production URL loads on a phone browser too — presence toggle needs real Geolocation, test
      it on the actual device you'll use on stage, not just laptop dev tools
- [ ] `DATABASE_URL` and `JWT_SECRET` are confirmed set on **Production** (already true as of
      Phase 0 — re-confirm nothing changed: `npx vercel env ls`)
- [ ] Hotspot/phone data on standby as network Plan B (per the guide — "300 osób" will strain
      venue Wi-Fi)
- [ ] Laptop charger packed; if presenting from a different laptop than dev, confirm it's logged
      into nothing sensitive and has the production URL bookmarked

### Pitch script (write this down, don't improvise on stage)

- [ ] One sentence: who is this for, and why do they want it (the guide's own pre-idea
      checklist question — answer it now for the pitch, not just the idea)
- [ ] The exact 3-screen path you'll click through, memorized in order
- [ ] Two full vocal run-throughs before 17:00, out loud, timed
- [ ] A decided answer for "what's next" if the jury asks — the guide notes jury talks to
      mentors/teams directly, be ready for a follow-up question, not just the scripted 60 seconds

### Team

- [ ] Decide who drives the laptop/click-through and who talks — don't improvise this live
- [ ] Confirm Track B's PR is either merged (ideal) or its own standalone deploy is ready as
      fallback, so "is it actually live" isn't ambiguous 10 minutes before pitch
