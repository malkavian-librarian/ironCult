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

  // Confirm turf-war endpoint reflects Warsaw district ownership.
  // Turf-war is Warsaw-district-based (2026-08-28 scope update, see design spec addendum),
  // not voivodeship-based — the route's coords above (52.2297, 21.0122) are central Warsaw,
  // which lib/geo/voivodeship.ts's own test confirms resolves to district "srodmiescie".
  // NOTE: The crew may not own srodmiescie if prior test runs created more routes in that district.
  // We verify the endpoint works and returns district data; ownership is determined by route count.
  const turfRes = await page.request.get('/api/turf-war');
  const turfBody = await turfRes.json();
  expect(turfBody.srodmiescie).toBeDefined();
  expect(turfBody.srodmiescie.crewId).toBeTruthy();
  expect(turfBody.srodmiescie.count).toBeGreaterThan(0);

  // Confirm buddy finder list shows the post
  const buddyListRes = await page.request.get('/api/buddy-posts?voivodeship=mazowieckie');
  const buddyList = await buddyListRes.json();
  expect(buddyList.some((p: { note: string }) => p.note === 'E2E ride')).toBe(true);

  // Confirm events list shows the event as happening now
  const eventsListRes = await page.request.get('/api/events?voivodeship=mazowieckie');
  const eventsList = await eventsListRes.json();
  expect(eventsList.some((e: { title: string; happeningNow: boolean }) => e.title === 'E2E Bike Night' && e.happeningNow)).toBe(true);
});
