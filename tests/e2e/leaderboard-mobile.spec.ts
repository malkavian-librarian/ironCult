import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['Pixel 7'] });

test('leaderboard columns stack vertically on Pixel 7 instead of sitting side by side', async ({ page }) => {
  await page.goto('/leaderboard');
  const panels = page.locator('.panel');
  await expect(panels).toHaveCount(2);
  const first = await panels.nth(0).boundingBox();
  const second = await panels.nth(1).boundingBox();
  // stacked means the second panel starts below the first, not beside it
  expect(second!.y).toBeGreaterThanOrEqual(first!.y + first!.height - 5);
});
