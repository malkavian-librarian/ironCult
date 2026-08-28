# ironCult Phase 0 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the shared repo, schema, auth, geo-helper, design tokens, and GitHub issue backlog that Track A and Track B both build on, and get an empty app deployed to Vercel — all before either track starts.

**Architecture:** Next.js App Router + TypeScript, Neon Postgres via Drizzle ORM, hand-rolled JWT/Bearer auth (no NextAuth — must be portable to a future Expo app), plain CSS design tokens (no Tailwind), MapLibre GL for the map (wired here, populated by Track B). Deployed to Vercel.

**Tech Stack:** Next.js 15+ (App Router), TypeScript, Drizzle ORM, `@neondatabase/serverless`, `jsonwebtoken`, `bcryptjs`, Vitest, `@playwright/test`, MapLibre GL JS.

## Global Constraints

- Windows 10, PowerShell only. Git binary: `C:\Users\FlyerOne\AppData\Local\GitHubDesktop\app-3.5.11\resources\app\git\cmd\git.exe` (not in PATH). Store it in a variable at the start of every session: `$git = "C:\Users\FlyerOne\AppData\Local\GitHubDesktop\app-3.5.11\resources\app\git\cmd\git.exe"`.
- Repo root: `C:\Users\FlyerOne\Desktop\ironCult`. Git already initialized, remote `origin` → `https://github.com/malkavian-librarian/ironCult.git`, branch `main`, one commit (the spec doc). **Not pushed yet** — push happens in Task 1.
- Project board (already exists, empty): `https://github.com/users/malkavian-librarian/projects/1/views/1`.
- No Tailwind. No Google Fonts. Plain CSS custom properties in `app/globals.css`, system font stacks — same constraint Rid3rMap operates under (see `C:\Users\FlyerOne\Desktop\Rid3rMap\.claude\rules\design-system.md` for the palette reference, read-only reference, do not copy files directly since ironCult is a separate app).
- Never commit `.env`, `.env.local`, `.next/`, `node_modules/`.
- 6-hour wall-clock deadline across all phases. This phase should take **at most 90 minutes**. If a task is taking longer, cut scope (e.g. skip the GitHub issue auto-filing and file them manually) rather than block Track A/B from starting.
- Every task ends with: tests passing, a commit, a push to `main` (Phase 0 is solo work, no PR needed for Phase 0 itself), and an explicit stop to report status before starting the next task.

---

### Task 1: Repo scaffold + push

**Files:**
- Create: entire Next.js scaffold (`package.json`, `app/`, `next.config.ts`, `tsconfig.json`, etc.)
- Create: `.gitignore`
- Create: `README.md`

**Interfaces:**
- Produces: a running `npm run dev` Next.js app at `C:\Users\FlyerOne\Desktop\ironCult`, pushed to `main` on GitHub.

- [ ] **Step 1: Scaffold Next.js**

```powershell
Set-Location "C:\Users\FlyerOne\Desktop\ironCult"
npx create-next-app@latest . --typescript --eslint --app --no-tailwind --no-src-dir --import-alias "@/*" --use-npm
```

When prompted about existing files (the two research docs `buddyFinder`/`meetups` and the `docs/` folder already exist), choose to continue/keep existing files if asked.

- [ ] **Step 2: Move research docs into the repo properly**

```powershell
New-Item -ItemType Directory -Force -Path "C:\Users\FlyerOne\Desktop\ironCult\docs\research" | Out-Null
Move-Item "C:\Users\FlyerOne\Desktop\ironCult\buddyFinder" "C:\Users\FlyerOne\Desktop\ironCult\docs\research\buddy-finder-market-research.md"
Move-Item "C:\Users\FlyerOne\Desktop\ironCult\meetups" "C:\Users\FlyerOne\Desktop\ironCult\docs\research\meetups-market-research.md"
```

- [ ] **Step 3: Verify dev server boots**

```powershell
npm run dev
```
Expected: server starts on `http://localhost:3000` with no errors. Stop it (Ctrl+C equivalent — kill the background process) once confirmed.

- [ ] **Step 4: Confirm `.gitignore` covers secrets and build output**

Open `.gitignore` (create-next-app generates one) and confirm it contains `.env*.local`, `.next/`, `node_modules/`. If any are missing, add them.

- [ ] **Step 5: Commit and push**

```powershell
$git = "C:\Users\FlyerOne\AppData\Local\GitHubDesktop\app-3.5.11\resources\app\git\cmd\git.exe"
Set-Location "C:\Users\FlyerOne\Desktop\ironCult"
& $git add -A
& $git status
```
Review the status output — confirm no `.env*`, `node_modules/`, or `.next/` are staged. Then:
```powershell
& $git commit -m "Scaffold Next.js app, relocate research docs"
& $git push -u origin main
```
Report: paste the `git push` output confirming the push succeeded (branch `main` now exists on GitHub).

---

### Task 2: Database schema + Neon connection

**Files:**
- Create: `lib/db/schema.ts`
- Create: `lib/db/index.ts`
- Create: `drizzle.config.ts`
- Create: `.env.local` (gitignored, not committed)
- Create: `.env.example` (committed, no real secrets)
- Test: `tests/unit/db/schema.test.ts`

**Interfaces:**
- Produces: `db` (Drizzle client) and every table export (`riders`, `crews`, `routes`, `ratings`, `buddyPosts`, `events`, `presence`) from `lib/db/schema.ts` and `lib/db/index.ts` — every later task in every track imports from here.

- [ ] **Step 1: Manual checkpoint — provision Neon Postgres**

**This step requires the user (FlyerOne).** Neon Postgres must be provisioned via the Vercel Marketplace (Storage tab in the Vercel dashboard, or `vercel:vercel-storage` skill) so a `DATABASE_URL` connection string exists. Stop here and ask the user to either:
(a) provide an existing Neon `DATABASE_URL`, or
(b) provision one now via the Vercel dashboard / `vercel:vercel-storage` skill and paste the connection string.

Do not proceed to Step 2 until a real `DATABASE_URL` is available.

- [ ] **Step 2: Install dependencies**

```powershell
Set-Location "C:\Users\FlyerOne\Desktop\ironCult"
npm install drizzle-orm @neondatabase/serverless
npm install -D drizzle-kit
```

- [ ] **Step 3: Write env files**

`.env.example` (commit this):
```
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
JWT_SECRET=replace-with-a-long-random-string
```

`.env.local` (do NOT commit — gitignored already from Task 1):
```
DATABASE_URL=<the real connection string from Step 1>
JWT_SECRET=<generate one now, e.g. via PowerShell: -join ((48..57)+(97..122)|Get-Random -Count 40|%{[char]$_})>
```

- [ ] **Step 4: Write the schema**

Create `lib/db/schema.ts`:
```typescript
import { pgTable, text, uuid, timestamp, doublePrecision, integer, unique } from 'drizzle-orm/pg-core';

export const crews = pgTable('crews', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const riders = pgTable('riders', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name').notNull(),
  bio: text('bio'),
  motorcycle: text('motorcycle'),
  style: text('style'),
  experience: text('experience'),
  pace: text('pace'),
  language: text('language'),
  crewId: uuid('crew_id').references(() => crews.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const routes = pgTable('routes', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').notNull().references(() => riders.id),
  title: text('title').notNull(),
  startLat: doublePrecision('start_lat').notNull(),
  startLon: doublePrecision('start_lon').notNull(),
  endLat: doublePrecision('end_lat').notNull(),
  endLon: doublePrecision('end_lon').notNull(),
  difficulty: text('difficulty').notNull(),
  bikeType: text('bike_type').notNull(),
  sceneryTags: text('scenery_tags').notNull(),
  voivodeship: text('voivodeship').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const ratings = pgTable('ratings', {
  id: uuid('id').primaryKey().defaultRandom(),
  routeId: uuid('route_id').notNull().references(() => routes.id),
  raterId: uuid('rater_id').notNull().references(() => riders.id),
  score: integer('score').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  uniqueRatingPerRider: unique().on(t.routeId, t.raterId),
}));

export const buddyPosts = pgTable('buddy_posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  riderId: uuid('rider_id').notNull().references(() => riders.id),
  voivodeship: text('voivodeship').notNull(),
  plannedDate: timestamp('planned_date').notNull(),
  note: text('note'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').notNull().references(() => riders.id),
  title: text('title').notNull(),
  type: text('type').notNull(),
  voivodeship: text('voivodeship').notNull(),
  lat: doublePrecision('lat').notNull(),
  lon: doublePrecision('lon').notNull(),
  startsAt: timestamp('starts_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const presence = pgTable('presence', {
  riderId: uuid('rider_id').primaryKey().references(() => riders.id),
  lat: doublePrecision('lat').notNull(),
  lon: doublePrecision('lon').notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

Create `lib/db/index.ts`:
```typescript
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

Create `drizzle.config.ts`:
```typescript
import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

```powershell
npm install dotenv
```

- [ ] **Step 5: Generate and apply the migration**

```powershell
npx drizzle-kit generate
npx drizzle-kit migrate
```
Expected: a new folder under `drizzle/` with a `.sql` migration file, and `migrate` reports it applied successfully against the Neon DB.

- [ ] **Step 6: Write a smoke test confirming the schema is queryable**

Create `tests/unit/db/schema.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { db } from '@/lib/db';
import { crews } from '@/lib/db/schema';

describe('db schema', () => {
  it('can insert and read a crew', async () => {
    const [created] = await db.insert(crews).values({ name: `test-crew-${Date.now()}` }).returning();
    expect(created.id).toBeDefined();
    const found = await db.query.crews.findFirst({ where: (c, { eq }) => eq(c.id, created.id) });
    expect(found?.name).toBe(created.name);
  });
});
```

- [ ] **Step 7: Install Vitest and run the test**

```powershell
npm install -D vitest
```
Add to `package.json` scripts: `"test": "vitest run"`.
```powershell
npx vitest run tests/unit/db/schema.test.ts
```
Expected: PASS (this requires `.env.local`'s `DATABASE_URL` to be loaded — add `import 'dotenv/config';` as the first line of `vitest.config.ts`, or create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
import 'dotenv/config';

export default defineConfig({
  test: { environment: 'node' },
});
```
)

- [ ] **Step 8: Commit and push**

```powershell
$git = "C:\Users\FlyerOne\AppData\Local\GitHubDesktop\app-3.5.11\resources\app\git\cmd\git.exe"
& $git add lib/db drizzle.config.ts .env.example vitest.config.ts package.json package-lock.json drizzle tests/unit/db
& $git status
& $git commit -m "Add Drizzle schema for all tables + Neon connection"
& $git push origin main
```

---

### Task 3: JWT auth (register, login, requireAuth helper)

**Files:**
- Create: `lib/auth/password.ts`
- Create: `lib/auth/jwt.ts`
- Create: `lib/auth/require-auth.ts`
- Create: `app/api/auth/register/route.ts`
- Create: `app/api/auth/login/route.ts`
- Test: `tests/unit/auth/jwt.test.ts`
- Test: `tests/integration/auth.test.ts`

**Interfaces:**
- Consumes: `db`, `riders` from `lib/db` / `lib/db/schema` (Task 2).
- Produces:
  - `hashPassword(password: string): Promise<string>` and `verifyPassword(password: string, hash: string): Promise<boolean>` from `lib/auth/password.ts`.
  - `signToken(payload: { riderId: string }): string` and `verifyToken(token: string): { riderId: string }` from `lib/auth/jwt.ts`.
  - `requireAuth(req: Request): { riderId: string }` (throws `AuthError` on failure) from `lib/auth/require-auth.ts` — **every protected route in Track A and Track B imports this.**
  - `POST /api/auth/register` body `{ email, password, displayName }` → `201 { token, riderId }`.
  - `POST /api/auth/login` body `{ email, password }` → `200 { token, riderId }` or `401`.

- [ ] **Step 1: Install auth dependencies**

```powershell
npm install jsonwebtoken bcryptjs
npm install -D @types/jsonwebtoken @types/bcryptjs
```

- [ ] **Step 2: Write failing unit test for JWT helpers**

Create `tests/unit/auth/jwt.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { signToken, verifyToken } from '@/lib/auth/jwt';

describe('jwt', () => {
  it('signs and verifies a token round-trip', () => {
    const token = signToken({ riderId: 'abc-123' });
    const payload = verifyToken(token);
    expect(payload.riderId).toBe('abc-123');
  });

  it('throws on a tampered token', () => {
    const token = signToken({ riderId: 'abc-123' });
    expect(() => verifyToken(token + 'x')).toThrow();
  });
});
```

- [ ] **Step 3: Run test, confirm it fails**

```powershell
npx vitest run tests/unit/auth/jwt.test.ts
```
Expected: FAIL — `Cannot find module '@/lib/auth/jwt'`.

- [ ] **Step 4: Implement JWT helper**

Create `lib/auth/jwt.ts`:
```typescript
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET!;
const EXPIRES_IN = '7d';

export type TokenPayload = { riderId: string };

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, SECRET) as TokenPayload;
}
```

- [ ] **Step 5: Run test, confirm it passes**

```powershell
npx vitest run tests/unit/auth/jwt.test.ts
```
Expected: PASS.

- [ ] **Step 6: Implement password helper (no test needed — thin bcrypt wrapper, exercised by the integration test below)**

Create `lib/auth/password.ts`:
```typescript
import bcrypt from 'bcryptjs';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

- [ ] **Step 7: Implement requireAuth helper**

Create `lib/auth/require-auth.ts`:
```typescript
export class AuthError extends Error {}

export function requireAuth(req: Request): { riderId: string } {
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) {
    throw new AuthError('Missing bearer token');
  }
  const token = header.slice('Bearer '.length);
  try {
    const { verifyToken } = require('./jwt') as typeof import('./jwt');
    const payload = verifyToken(token);
    return { riderId: payload.riderId };
  } catch {
    throw new AuthError('Invalid or expired token');
  }
}
```
(Use a top-level `import { verifyToken } from './jwt';` instead of the inline `require` if your TypeScript/ESM setup allows it cleanly — prefer the static import; the inline form above is only a fallback if there's a circular-import issue with `lib/db` imports in `jwt.ts`, which there isn't, so use:)
```typescript
import { verifyToken } from './jwt';

export class AuthError extends Error {}

export function requireAuth(req: Request): { riderId: string } {
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) {
    throw new AuthError('Missing bearer token');
  }
  const token = header.slice('Bearer '.length);
  try {
    return { riderId: verifyToken(token).riderId };
  } catch {
    throw new AuthError('Invalid or expired token');
  }
}
```

- [ ] **Step 8: Write failing integration test for register/login**

Create `tests/integration/auth.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { POST as register } from '@/app/api/auth/register/route';
import { POST as login } from '@/app/api/auth/login/route';

function jsonRequest(body: unknown) {
  return new Request('http://localhost/api/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('auth API', () => {
  const email = `rider-${Date.now()}@example.com`;

  it('registers a new rider and returns a token', async () => {
    const res = await register(jsonRequest({ email, password: 'hunter22', displayName: 'Test Rider' }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.token).toBeDefined();
    expect(body.riderId).toBeDefined();
  });

  it('logs in with correct credentials', async () => {
    const res = await login(jsonRequest({ email, password: 'hunter22' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.token).toBeDefined();
  });

  it('rejects login with wrong password', async () => {
    const res = await login(jsonRequest({ email, password: 'wrong-password' }));
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 9: Run test, confirm it fails**

```powershell
npx vitest run tests/integration/auth.test.ts
```
Expected: FAIL — route modules don't exist.

- [ ] **Step 10: Implement the register route**

Create `app/api/auth/register/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { riders } from '@/lib/db/schema';
import { hashPassword } from '@/lib/auth/password';
import { signToken } from '@/lib/auth/jwt';

export async function POST(req: Request) {
  const { email, password, displayName } = await req.json();
  if (!email || !password || !displayName) {
    return NextResponse.json({ error: 'email, password, displayName are required' }, { status: 400 });
  }
  const passwordHash = await hashPassword(password);
  const [rider] = await db.insert(riders).values({ email, passwordHash, displayName }).returning();
  const token = signToken({ riderId: rider.id });
  return NextResponse.json({ token, riderId: rider.id }, { status: 201 });
}
```

- [ ] **Step 11: Implement the login route**

Create `app/api/auth/login/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { riders } from '@/lib/db/schema';
import { verifyPassword } from '@/lib/auth/password';
import { signToken } from '@/lib/auth/jwt';

export async function POST(req: Request) {
  const { email, password } = await req.json();
  const rider = await db.query.riders.findFirst({ where: eq(riders.email, email) });
  if (!rider || !(await verifyPassword(password, rider.passwordHash))) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }
  const token = signToken({ riderId: rider.id });
  return NextResponse.json({ token, riderId: rider.id }, { status: 200 });
}
```

- [ ] **Step 12: Run tests, confirm they pass**

```powershell
npx vitest run tests/integration/auth.test.ts tests/unit/auth/jwt.test.ts
```
Expected: all PASS.

- [ ] **Step 13: Code review pass (delegate to Haiku)**

Use the `Agent` tool with `model: "haiku"`: prompt it to review `lib/auth/*.ts` and `app/api/auth/*/route.ts` for correctness issues only (not style) — specifically: does `requireAuth` reject a missing/malformed header correctly, does `register` avoid leaking whether an email already exists in a way that helps enumeration (acceptable to skip for hackathon, but flag it), does `login` compare passwords via `bcrypt.compare` (not a raw `===`). Fix anything CONFIRMED, ignore stylistic nits given the time budget.

- [ ] **Step 14: Simplify pass**

Re-read the four files just written; remove any dead code or redundant checks. Given the small size, this should take under 2 minutes — do it inline rather than delegating.

- [ ] **Step 15: Commit and push**

```powershell
$git = "C:\Users\FlyerOne\AppData\Local\GitHubDesktop\app-3.5.11\resources\app\git\cmd\git.exe"
& $git add lib/auth app/api/auth tests/unit/auth tests/integration/auth.test.ts package.json package-lock.json
& $git commit -m "Add JWT auth: register, login, requireAuth helper"
& $git push origin main
```

**STOP-AND-REVIEW CHECKPOINT:** report that auth is live and tested, and confirm before moving to Task 4.

---

### Task 4: Poland voivodeship boundaries + point-in-polygon helper

**Files:**
- Create: `public/map/poland-voivodeships.json`
- Create: `lib/geo/voivodeship.ts`
- Test: `tests/unit/geo/voivodeship.test.ts`

**Interfaces:**
- Produces: `findVoivodeship(lat: number, lon: number): string | null` from `lib/geo/voivodeship.ts` — Track A's route-create endpoint and Track B's turf-war query both depend on this returning consistent voivodeship name strings (e.g. `"mazowieckie"`, lowercase, matching the `voivodeship` column values written everywhere else).
- Produces: `public/map/poland-voivodeships.json` — a GeoJSON `FeatureCollection` of Poland's 16 voivodeships, each feature's `properties.name` holding the lowercase slug (e.g. `"mazowieckie"`) — Track B's live-map turf-war layer renders this file directly as a MapLibre source.

- [ ] **Step 1: Download the boundary data**

```powershell
Set-Location "C:\Users\FlyerOne\Desktop\ironCult"
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/ppatrzyk/polska-geojson/master/wojewodztwa/wojewodztwa-max.geojson" -OutFile "public/map/poland-voivodeships-raw.json"
```
If that URL is unreachable, search for "Poland voivodeship boundaries GeoJSON" and use any open-license source with 16 features and Polish voivodeship names — the exact source doesn't matter, only that it has 16 polygon/multipolygon features covering Poland's voivodeships.

- [ ] **Step 2: Normalize property names to a lowercase `name` field**

Write a one-off Node script `scripts/normalize-voivodeships.mjs`:
```javascript
import { readFileSync, writeFileSync } from 'fs';

const raw = JSON.parse(readFileSync('public/map/poland-voivodeships-raw.json', 'utf-8'));

const NAME_KEYS = ['nazwa', 'name', 'NAME_1', 'JPT_NAZWA_'];

function findName(props) {
  for (const key of NAME_KEYS) {
    if (props[key]) return props[key];
  }
  throw new Error(`No name property found among keys: ${Object.keys(props).join(', ')}`);
}

const normalized = {
  type: 'FeatureCollection',
  features: raw.features.map((f) => ({
    type: 'Feature',
    properties: { name: findName(f.properties).toLowerCase() },
    geometry: f.geometry,
  })),
};

if (normalized.features.length !== 16) {
  throw new Error(`Expected 16 voivodeships, got ${normalized.features.length}`);
}

writeFileSync('public/map/poland-voivodeships.json', JSON.stringify(normalized));
console.log('Wrote', normalized.features.length, 'voivodeships:', normalized.features.map(f => f.properties.name).join(', '));
```

```powershell
node scripts/normalize-voivodeships.mjs
Remove-Item "public/map/poland-voivodeships-raw.json"
```
Expected output: 16 names printed, including recognizable ones like `mazowieckie`, `malopolskie`, `slaskie`. Note: if the source uses Polish diacritics (e.g. `małopolskie`), also strip diacritics in the script (`.replace(/[łŁ]/g,'l').replace(/[óÓ]/g,'o')` etc. for the specific characters that appear) so `voivodeship` values stay plain ASCII and match what Track A/B write into the DB — add this normalization to the script now if any printed name contains a non-ASCII character.

- [ ] **Step 3: Write failing test for point-in-polygon**

Create `tests/unit/geo/voivodeship.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { findVoivodeship } from '@/lib/geo/voivodeship';

describe('findVoivodeship', () => {
  it('finds Mazowieckie for Warsaw coordinates', () => {
    expect(findVoivodeship(52.2297, 21.0122)).toBe('mazowieckie');
  });

  it('finds Malopolskie for Krakow coordinates', () => {
    expect(findVoivodeship(50.0647, 19.9450)).toBe('malopolskie');
  });

  it('returns null for coordinates outside Poland', () => {
    expect(findVoivodeship(48.8566, 2.3522)).toBeNull(); // Paris
  });
});
```
If Step 2's normalization produced a different slug than `mazowieckie`/`malopolskie` (e.g. it kept a diacritic), update the test's expected strings to match the actual printed output from Step 2 — the test must match real data, not the other way around.

- [ ] **Step 4: Run test, confirm it fails**

```powershell
npx vitest run tests/unit/geo/voivodeship.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 5: Implement the helper**

Create `lib/geo/voivodeship.ts`:
```typescript
import { readFileSync } from 'fs';
import path from 'path';

type Ring = [number, number][];
type Feature = { properties: { name: string }; geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown } };

let cachedData: { features: Feature[] } | null = null;

function loadData(): { features: Feature[] } {
  if (cachedData) return cachedData;
  const filePath = path.join(process.cwd(), 'public', 'map', 'poland-voivodeships.json');
  cachedData = JSON.parse(readFileSync(filePath, 'utf-8'));
  return cachedData!;
}

function pointInRing(lon: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect = (yi > lat) !== (yj > lat) &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function findVoivodeship(lat: number, lon: number): string | null {
  const data = loadData();
  for (const feature of data.features) {
    const { type, coordinates } = feature.geometry;
    const polygons = (type === 'Polygon' ? [coordinates] : coordinates) as number[][][][] | number[][][];
    const polygonList = type === 'Polygon' ? [coordinates as number[][][]] : (coordinates as number[][][][]);
    for (const polygon of polygonList) {
      const outerRing = polygon[0] as unknown as Ring;
      if (pointInRing(lon, lat, outerRing)) {
        return feature.properties.name;
      }
    }
  }
  return null;
}
```

- [ ] **Step 6: Run test, confirm it passes**

```powershell
npx vitest run tests/unit/geo/voivodeship.test.ts
```
Expected: PASS. If it fails on the real coordinates due to a subtly different boundary source, adjust the test coordinates to a point you can confirm is well inside the expected region (e.g. move a fraction of a degree) rather than abandoning the check.

- [ ] **Step 7: Simplify pass** — re-read `voivodeship.ts`, confirm no unused types remain from iteration.

- [ ] **Step 8: Commit and push**

```powershell
$git = "C:\Users\FlyerOne\AppData\Local\GitHubDesktop\app-3.5.11\resources\app\git\cmd\git.exe"
& $git add public/map/poland-voivodeships.json lib/geo scripts/normalize-voivodeships.mjs tests/unit/geo
& $git commit -m "Add Poland voivodeship boundaries and point-in-polygon helper"
& $git push origin main
```

---

### Task 5: Design tokens + app shell/nav

**Files:**
- Modify: `app/globals.css`
- Create: `components/NavBar.tsx`
- Modify: `app/layout.tsx`

**Interfaces:**
- Produces: CSS custom properties (`--asphalt`, `--signal`, `--paper`, etc. — see below) available globally; `<NavBar />` component both tracks' pages render inside.

- [ ] **Step 1: Write design tokens**

Replace the contents of `app/globals.css` with (adapted from Rid3rMap's palette, referenced read-only, not copied verbatim since this is a new codebase):
```css
:root {
  --asphalt: #10100f;
  --tar: #181714;
  --concrete: #d7d2c7;
  --paper: #f3efe6;
  --mist: #aeb7b5;
  --signal: #e24b35;
  --signal-strong: #ff5c3d;
  --visor: #f2c94c;
  --line: rgba(243, 239, 230, 0.16);
  --panel: rgba(24, 23, 20, 0.88);
  --shadow: 0 18px 50px rgba(0, 0, 0, 0.28);
  --font-display: Arial, Helvetica, sans-serif;
  --font-data: "Cascadia Mono", "Consolas", monospace;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--asphalt);
  color: var(--paper);
  font-family: var(--font-display);
}

a { color: inherit; }

button {
  min-height: 42px;
  border-radius: 8px;
  font-weight: 800;
  border: 1px solid var(--line);
  background: var(--signal);
  color: var(--paper);
  cursor: pointer;
}

button:hover { background: var(--signal-strong); }

:focus-visible {
  outline: 3px solid var(--visor);
  outline-offset: 3px;
}

.panel {
  border: 1px solid var(--line);
  background: var(--panel);
  box-shadow: var(--shadow);
  border-radius: 8px;
  padding: 1rem;
}
```

- [ ] **Step 2: Write the nav bar**

Create `components/NavBar.tsx`:
```typescript
import Link from 'next/link';

export function NavBar() {
  return (
    <nav style={{ display: 'flex', gap: '1rem', padding: '1rem', borderBottom: '1px solid var(--line)' }}>
      <Link href="/">ironCult</Link>
      <Link href="/routes">Routes</Link>
      <Link href="/crews">Crews</Link>
      <Link href="/leaderboard">Leaderboard</Link>
      <Link href="/buddy-finder">Buddy Finder</Link>
      <Link href="/events">Events</Link>
      <Link href="/map">Live Map</Link>
    </nav>
  );
}
```

- [ ] **Step 3: Wire nav into the root layout**

Modify `app/layout.tsx` to render `<NavBar />` above `{children}` inside `<body>`. Keep the existing `RootLayout` function signature and metadata export from the create-next-app scaffold; only add the import and the `<NavBar />` element.

- [ ] **Step 4: Manual verification**

```powershell
npm run dev
```
Open `http://localhost:3000` in a browser (or use `mcp__claude-in-chrome__navigate` if available) and confirm: dark background, nav links visible, no console errors. This is a visual check, no automated test — matches Rid3rMap's precedent that page composition is manually verified.

- [ ] **Step 5: Commit and push**

```powershell
$git = "C:\Users\FlyerOne\AppData\Local\GitHubDesktop\app-3.5.11\resources\app\git\cmd\git.exe"
& $git add app/globals.css app/layout.tsx components/NavBar.tsx
& $git commit -m "Add design tokens and app shell nav"
& $git push origin main
```

---

### Task 6: Vercel deployment + GitHub issue backlog

**Files:** none (infra/process task).

- [ ] **Step 1: Link and deploy to Vercel**

Use the `vercel:deploy` skill, or manually:
```powershell
npx vercel link
npx vercel env add DATABASE_URL
npx vercel env add JWT_SECRET
npx vercel --prod
```
When prompted for env values, paste the same values from `.env.local`. Confirm the deployment URL loads and shows the nav bar (the register/login API routes will 500 without a rider hitting them yet — that's expected, only the page shell needs to render).

- [ ] **Step 2: Check GitHub CLI availability**

```powershell
gh --version
gh auth status
```
If `gh` is not installed or not authenticated, stop and ask the user to run `gh auth login` interactively (this cannot be done non-interactively), or to say "file the issues manually" — in which case skip to Step 4 and just write the issue list into `docs/superpowers/plans/2026-08-28-issue-backlog.md` for the user to paste in by hand.

- [ ] **Step 3: File Track A and Track B issues onto the existing project board**

For each task below, run (repeat for all 12):
```powershell
gh issue create --repo malkavian-librarian/ironCult --title "<title>" --body "<body>" --label "<label>"
```
Track A issues (label `track:A`):
1. "Rider settings: profile fields + crew picker" — body: "Implements Task 1 of Track A plan (docs/superpowers/plans/2026-08-28-track-a-community-content.md)."
2. "Crew create/join" — body references Track A Task 2.
3. "Crew leaderboard page" — Track A Task 3.
4. "Individual leaderboard page" — Track A Task 3 (same task, split if desired, or keep as one issue covering both leaderboards).
5. "Route create (coordinate entry, server-derived voivodeship)" — Track A Task 4.
6. "Route browse + ratings" — Track A Task 5.

Track B issues (label `track:B`):
7. "Buddy finder: create post + filtered list" — Track B Task 1.
8. "Events: create + browse/filter + happening-now badge" — Track B Task 2.
9. "Presence: geolocation toggle + polling endpoints" — Track B Task 3.
10. "Live map: presence pins" — Track B Task 4.
11. "Live map: event pins" — Track B Task 4.
12. "Live map: turf-war voivodeship layer" — Track B Task 5.

After filing, add each issue to the project board:
```powershell
gh project item-add 1 --owner malkavian-librarian --url <issue-url>
```
(Get each `<issue-url>` from the `gh issue create` output.)

- [ ] **Step 4: Report**

Report: Vercel deployment URL, confirmation that env vars are set, and either the list of filed GitHub issue URLs or the fallback backlog file path if `gh` wasn't available.

**STOP-AND-REVIEW CHECKPOINT:** Phase 0 is complete. Report to the user: repo pushed, schema live on Neon, auth working, voivodeship helper tested, app shell deployed to Vercel, issues filed. Confirm before Track A and Track B sessions are started (in parallel, in separate sessions, each picking up its own plan document).
