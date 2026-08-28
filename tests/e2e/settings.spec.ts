import { test, expect } from '@playwright/test';

test('settings page loads and shows the form', async ({ page }) => {
  await page.goto('/settings');
  await expect(page.locator('form')).toBeVisible();
});

test('settings page shows the crew picker section', async ({ page }) => {
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Crew' })).toBeVisible();
});
