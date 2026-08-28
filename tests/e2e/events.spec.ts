import { test, expect } from '@playwright/test';

test('events page renders form and list', async ({ page }) => {
  await page.goto('/events');
  await expect(page.locator('form')).toBeVisible();
});
