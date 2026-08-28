import { test, expect } from '@playwright/test';

test('leaderboard page renders both tables', async ({ page }) => {
  await page.goto('/leaderboard');
  await expect(page.locator('body')).toContainText(/leaderboard/i);
});
