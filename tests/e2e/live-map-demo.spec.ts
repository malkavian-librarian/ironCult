import { expect, test } from '@playwright/test';

test('map event and biker markers open detail cards', async ({ page }) => {
  await page.route('**/api/events', (route) => route.fulfill({
    json: [{
      id: 'event-hackathon',
      title: 'IronCult Hackathon Checkpoint',
      type: 'hackathon',
      lat: 52.22769,
      lon: 21.00481,
      happeningNow: true,
      district: 'Srodmiescie',
      districtColor: 'hsl(286, 80%, 58%)',
      checkedInCount: 7,
    }],
  }));
  await page.route('**/api/presence', (route) => route.fulfill({
    json: [{
      riderId: 'flyerone-demo',
      displayName: 'FlyerOne',
      lat: 52.22795,
      lon: 21.00495,
      crewId: 'iron-cult',
      crewName: 'Iron Cult',
      motorcycle: 'Triumph Bonneville T120',
      rank: 'Founder',
      clubName: 'Iron Cult',
      avatarUrl: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22/%3E',
      markerColor: 'hsl(5, 92%, 54%)',
      isCurrentDemoUser: true,
    }],
  }));
  await page.route('**/api/turf-war', (route) => route.fulfill({ json: {} }));

  await page.goto('/');
  await expect(page.locator('[data-testid="live-map"]')).toHaveAttribute('data-map-loaded', 'true', { timeout: 15000 });

  await page.locator('[data-event-id="event-hackathon"]').dispatchEvent('click');
  await expect(page.locator('[data-testid="event-card"]')).toContainText('IronCult Hackathon Checkpoint', { timeout: 10000 });
  await expect(page.locator('[data-testid="event-card"]')).toContainText('7 riders');

  const flyer = page.locator('[data-rider-id="flyerone-demo"]');
  await expect(flyer).toHaveAttribute('data-current-demo-user', 'true');
  await flyer.dispatchEvent('click');
  await expect(page.locator('[data-testid="rider-card"]')).toContainText('FlyerOne', { timeout: 10000 });
  await expect(page.locator('[data-testid="rider-card"]')).toContainText('Founder');
  await expect(page.locator('[data-testid="rider-card"]')).toContainText('Iron Cult');
  await expect(page.locator('[data-testid="rider-card"]')).toContainText('Triumph Bonneville T120');
});

test('production seeded map shows demo density', async ({ page }) => {
  test.skip(!process.env.DEMO_SEEDED, 'Set DEMO_SEEDED=true after running seed:map-demo');
  await page.goto('/');
  await expect(page.locator('[data-testid="live-map"]')).toHaveAttribute('data-basemap-loaded', 'true', { timeout: 20000 });
  await expect(page.locator('[data-testid="live-map"]')).toHaveAttribute('data-turf-loaded', 'true', { timeout: 20000 });
  const eventCount = await page.locator('[data-event-id]').count();
  expect(eventCount).toBeGreaterThanOrEqual(5);
  const riderCount = await page.locator('[data-rider-id]').count();
  expect(riderCount).toBeGreaterThanOrEqual(31);
});
