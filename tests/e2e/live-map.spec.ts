import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['Pixel 7'] });

test('homepage renders a full-viewport map with the presence toggle in the thumb zone', async ({ page }) => {
  await page.goto('/');
  const map = page.locator('[data-testid="live-map"]');
  await expect(map).toBeVisible();
  const mapBox = await map.boundingBox();
  expect(mapBox?.height).toBeGreaterThan(800); // Pixel 7 viewport height is 915; map should fill nearly all of it

  const toggle = page.locator('[data-testid="presence-toggle"]');
  await expect(toggle).toBeVisible();
  const toggleBox = await toggle.boundingBox();
  expect(toggleBox?.height).toBeGreaterThanOrEqual(44);
  expect(toggleBox!.y).toBeGreaterThan(915 / 2); // toggle sits in the bottom half of the screen (thumb zone)
});

test('/map redirects to the homepage', async ({ page }) => {
  await page.goto('/map');
  await expect(page).toHaveURL(/\/$/);
});

test('homepage loads a real Warsaw vector basemap', async ({ page }) => {
  await page.route('**/api/presence', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/events', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/turf-war', (route) => route.fulfill({ json: {} }));
  await page.goto('/');
  const map = page.locator('[data-testid="live-map"]');
  await expect(map).toHaveAttribute('data-map-loaded', 'true', { timeout: 15000 });
  await expect(map).toHaveAttribute('data-basemap-loaded', 'true', { timeout: 15000 });

  const hasSafeAreaSizing = await page.evaluate(() => {
    const rules = [...document.styleSheets]
      .flatMap((sheet) => {
        try {
          return [...sheet.cssRules].map((rule) => rule.cssText);
        } catch {
          return [];
        }
      })
      .filter((text) => text.includes('.live-map-shell'))
      .join('\n');
    return rules.includes('--safe-top') && rules.includes('--safe-bottom');
  });
  expect(hasSafeAreaSizing).toBe(true);
});

test('desktop homepage map fits below the top nav', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.route('**/api/presence', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/events', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/turf-war', (route) => route.fulfill({ json: {} }));

  await page.goto('/');
  await expect(page.locator('[data-testid="live-map"]')).toHaveAttribute('data-map-loaded', 'true', { timeout: 15000 });

  const metrics = await page.evaluate(() => {
    const nav = document.querySelector('[data-testid="top-nav"]')?.getBoundingClientRect();
    const map = document.querySelector('[data-testid="live-map"]')?.getBoundingClientRect();
    return {
      viewportHeight: window.innerHeight,
      documentHeight: document.documentElement.scrollHeight,
      navHeight: nav?.height ?? 0,
      mapHeight: map?.height ?? 0,
    };
  });

  expect(metrics.documentHeight).toBeLessThanOrEqual(metrics.viewportHeight + 1);
  expect(metrics.navHeight + metrics.mapHeight).toBeLessThanOrEqual(metrics.viewportHeight + 1);
});

test('presence markers pulse and use distinct crew colors', async ({ page }) => {
  await page.route('**/api/presence', (route) => route.fulfill({
    json: [
      { riderId: 'rider-1', displayName: 'Alpha', lat: 52.231, lon: 21.01, crewId: 'crew-alpha', crewName: 'Alpha Crew' },
      { riderId: 'rider-2', displayName: 'Bravo', lat: 52.235, lon: 21.02, crewId: 'crew-bravo', crewName: 'Bravo Crew' },
      { riderId: 'rider-3', displayName: 'Solo', lat: 52.239, lon: 21.03, crewId: null, crewName: null },
    ],
  }));
  await page.route('**/api/events', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/turf-war', (route) => route.fulfill({ json: {} }));

  await page.goto('/');
  const dots = page.locator('.presence-dot');
  await expect(dots).toHaveCount(3, { timeout: 15000 });

  const styles = await dots.evaluateAll((elements) => elements.map((el) => {
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return { backgroundColor: style.backgroundColor, animationName: style.animationName, x: rect.x, y: rect.y };
  }));
  expect(styles[0].backgroundColor).not.toBe(styles[1].backgroundColor);
  expect(styles[0].animationName).not.toBe('none');
  expect(styles[2].backgroundColor).toBe('rgb(148, 148, 148)');
  expect(styles.every((style) => style.x > 40 && style.y > 40)).toBe(true);
});
