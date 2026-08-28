import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['Pixel 7'] });

const routes = ['/', '/routes', '/routes/new', '/leaderboard', '/buddy-finder', '/events', '/settings'];

for (const route of routes) {
  test(`${route} has no horizontal overflow on Pixel 7`, async ({ page }) => {
    await page.goto(route);
    const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(hasOverflow).toBe(false);
  });

  test(`${route} bottom nav is present`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator('[data-testid="bottom-nav"]')).toBeVisible();
  });
}
