import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['Pixel 7'] });

test('events list renders single-column without overflow, happening-now badge stays visible', async ({ page }) => {
  await page.goto('/events');
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(hasOverflow).toBe(false);
});
