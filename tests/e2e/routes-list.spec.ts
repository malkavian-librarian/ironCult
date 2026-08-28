import { test, expect } from '@playwright/test';

test('routes list page renders', async ({ page }) => {
  await page.goto('/routes');
  await expect(page.locator('body')).toBeVisible();
});
