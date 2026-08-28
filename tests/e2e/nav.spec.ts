import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['Pixel 7'] });

test.describe('mobile bottom nav (Pixel 7)', () => {
  test('shows exactly 5 primary tabs in the thumb zone, each a 44px+ touch target', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('[data-testid="bottom-nav"]');
    await expect(nav).toBeVisible();
    const tabs = nav.locator('a');
    await expect(tabs).toHaveCount(5);
    for (const tab of await tabs.all()) {
      const box = await tab.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
      expect(box!.y).toBeGreaterThan(915 * 0.6); // bottom ~40% of the 915px-tall viewport
    }
    // top NavBar must NOT be the visible nav on mobile
    await expect(page.locator('[data-testid="top-nav"]')).toBeHidden();
  });

  test('settings/profile is reachable via a persistent top-right icon, not the bottom bar', async ({ page }) => {
    await page.goto('/');
    const profileLink = page.locator('[data-testid="profile-link"]');
    await expect(profileLink).toBeVisible();
    await profileLink.click();
    await expect(page).toHaveURL(/\/settings/);
  });
});

test.describe('desktop top nav (≥768px)', () => {
  test.use({ viewport: { width: 1024, height: 768 }, isMobile: false, hasTouch: false });

  test('shows the top nav bar, hides the bottom tab bar', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="top-nav"]')).toBeVisible();
    await expect(page.locator('[data-testid="bottom-nav"]')).toBeHidden();
  });
});
