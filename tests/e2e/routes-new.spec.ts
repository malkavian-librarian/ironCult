import { test, expect } from '@playwright/test';

test('route creation form renders', async ({ page }) => {
  await page.goto('/routes/new');
  await expect(page.locator('form')).toBeVisible();
});
