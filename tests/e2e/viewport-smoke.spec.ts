import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['Pixel 7'] });

test('homepage renders without horizontal overflow on Pixel 7', async ({ page }) => {
  await page.goto('/');
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(hasOverflow).toBe(false);
});
