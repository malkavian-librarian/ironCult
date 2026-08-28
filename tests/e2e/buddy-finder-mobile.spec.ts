import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['Pixel 7'] });

test('buddy finder posts render single-column without overflow', async ({ page }) => {
  await page.goto('/buddy-finder');
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(hasOverflow).toBe(false);
});
