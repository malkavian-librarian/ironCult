import { test, expect } from '@playwright/test';

test('buddy finder page renders form and list', async ({ page }) => {
  await page.goto('/buddy-finder');
  await expect(page.locator('form')).toBeVisible();
});
