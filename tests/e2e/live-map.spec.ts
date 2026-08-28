import { test, expect } from '@playwright/test';

test('map page renders the map container', async ({ page }) => {
  await page.goto('/map');
  await expect(page.locator('[data-testid="live-map"]')).toBeVisible();
});
