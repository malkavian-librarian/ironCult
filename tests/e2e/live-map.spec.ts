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
