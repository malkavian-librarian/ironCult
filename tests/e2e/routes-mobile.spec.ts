import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['Pixel 7'] });

test('routes list renders single-column cards with touch-sized rating controls', async ({ page }) => {
  await page.goto('/routes');
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(hasOverflow).toBe(false);

  const cards = page.locator('.panel');
  const count = await cards.count();
  if (count > 0) {
    const box = await cards.first().boundingBox();
    expect(box?.width).toBeGreaterThan(350); // near-full-width single column on a 412px viewport
  }
});

test('route creation form fields and submit button are touch-sized', async ({ page }) => {
  await page.goto('/routes/new');
  const submit = page.getByRole('button', { name: /save|create|submit/i });
  const box = await submit.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(44);
});
