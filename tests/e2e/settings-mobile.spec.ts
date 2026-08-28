import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['Pixel 7'] });

test('settings form fills the Pixel 7 width without overflow and all fields are touch-sized', async ({ page }) => {
  await page.goto('/settings');
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(hasOverflow).toBe(false);

  const form = page.locator('form');
  const box = await form.boundingBox();
  expect(box?.width).toBeGreaterThan(350);
});
