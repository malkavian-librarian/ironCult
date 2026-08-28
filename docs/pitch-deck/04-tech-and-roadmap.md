# Technology, shortcuts, and what comes next

## What we built with

- **Next.js 16** App Router + TypeScript, deployed on Vercel
- **Neon Postgres** (serverless) via Drizzle ORM
- **MapLibre GL JS** with a local PMTiles vector basemap for Warsaw
- **Hand-rolled JWT auth** (no NextAuth — deliberately portable to mobile)
- **Plain CSS** custom properties, no Tailwind, no Google Fonts
- **Playwright** (Pixel 7 + desktop) + **Vitest** — 70+ e2e tests, 57 unit/integration tests
- Built mobile-first for a **Google Pixel 7** (412×915 viewport)

## Hackathon shortcuts (honest)

- **Warsaw-only turf war** — 18 districts, not all 16 voivodeships. The architecture supports scaling up, but the demo scope is the city.
- **Seeded fake riders** — 31 demo riders across 7 crews with fake presence pings, so the map looks alive. Real riders can register and ride too.
- **Polled presence** (10s interval) — not websockets. Reads as "live" for a demo without the ops complexity.
- **Coordinate-based routes** — no GPX upload/parsing. Start/end lat-lon, not full track geometry.
- **No real-time notifications** — no push, no email. That's a post-hackathon feature.

## What's next: Expo + Play Store

This web app is the backend + reference client. The real product is a **React Native / Expo app** that hits the same API:

- The auth layer is JWT/Bearer, not cookies — portable to mobile by design
- Every API route is a plain JSON handler — no web-specific assumptions
- **Target: Play Store and App Store** within weeks of hackathon
- The live map, presence toggle, and turf war are the core loop that makes riders open the app daily — not just when they're planning a ride
