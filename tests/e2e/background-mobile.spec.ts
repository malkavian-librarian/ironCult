import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['Pixel 7'] });

test('body uses the mobile-optimized background image with a high-opacity dark scrim, no overflow added', async ({ page }) => {
  await page.goto('/routes'); // a page with empty body space around its .panel cards, unlike the full-bleed map homepage
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundImage);
  expect(bg).toContain('bonneville-engine-bg-mobile.jpg');
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(hasOverflow).toBe(false);
});

test.describe('desktop', () => {
  test.use({ viewport: { width: 1024, height: 768 }, isMobile: false, hasTouch: false });
  test('body uses the larger background variant at desktop width', async ({ page }) => {
    await page.goto('/routes');
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundImage);
    expect(bg).toContain('bonneville-engine-bg.jpg');
    expect(bg).not.toContain('mobile.jpg');
  });
});
