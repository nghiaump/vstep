import { test, expect, type Page } from '@playwright/test';

// Runs only in the 'mobile' project (iPhone 15 Pro, 393×852).

const ROUTES = [
  '', 'reading', 'reading/types', 'writing', 'speaking', 'speaking/vlu-135',
  'bai-mau', 'bai-mau/khung', 'bai-mau/vlu-135', 'history', 'settings',
  'reading/vlu-135/practice', 'writing/vlu-135/task1', 'speaking/vlu-135/test',
];

const px = (page: Page, sel: string, prop: string) =>
  page.locator(sel).first().evaluate((el, p) => parseFloat(getComputedStyle(el).getPropertyValue(p)), prop);

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
});

test('no page scrolls sideways at 393pt', async ({ page }) => {
  for (const r of ROUTES) {
    await page.goto('/#/' + r);
    await page.waitForLoadState('networkidle');
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(sw, `#/${r} scrollWidth`).toBeLessThanOrEqual(393);
  }
});

test('bottom tab bar replaces the top links and navigates', async ({ page }) => {
  await page.goto('/#/');
  const tabs = page.getByRole('navigation', { name: 'Điều hướng chính' });
  await expect(tabs).toHaveCount(1); // one layout only, never both
  const box = await tabs.boundingBox();
  expect(box!.y + box!.height).toBeGreaterThan(800); // pinned to the bottom
  await tabs.getByRole('link', { name: 'Bài mẫu' }).click();
  await expect(page).toHaveURL(/#\/bai-mau$/);
  await expect(page.getByRole('heading', { name: 'Bài mẫu', level: 1 })).toBeVisible();
});

test('model answer reads small and dense; secondary steps fold away', async ({ page }) => {
  await page.goto('/#/bai-mau/vlu-135');
  const answer = '#w1 [class*="answer"]';
  expect(await px(page, answer, 'font-size')).toBe(13.5);
  expect(await px(page, answer, 'font-weight')).toBe(400);
  expect(await px(page, answer, 'line-height')).toBeLessThanOrEqual(13.5 * 1.5);

  const outline = page.locator('#w1 details').filter({ hasText: 'Khung dàn ý' });
  await expect(outline).not.toHaveAttribute('open');
  await outline.locator('summary').click();
  await expect(outline).toHaveAttribute('open');
  await expect(outline.locator('ol li').first()).toBeVisible(); // stacked list, not a 3-column table
  await expect(outline.locator('table')).toHaveCount(0);

  await expect(page.getByRole('button', { name: /In \/ lưu PDF/ })).toHaveCount(0);
});

test('reading size setting scales the model answer', async ({ page }) => {
  await page.goto('/#/settings');
  await page.getByRole('group', { name: 'Cỡ chữ bài đọc' }).getByRole('button', { name: 'Lớn' }).click();
  await page.goto('/#/bai-mau/vlu-135');
  expect(await px(page, '#w1 [class*="answer"]', 'font-size')).toBe(15);

  await page.reload(); // inline script in index.html applies it before React mounts
  expect(await page.evaluate(() => document.documentElement.dataset.read)).toBe('l');

  await page.goto('/#/settings');
  await page.getByRole('group', { name: 'Cỡ chữ bài đọc' }).getByRole('button', { name: 'Nhỏ' }).click();
  await page.goto('/#/bai-mau/vlu-135');
  expect(await px(page, '#w1 [class*="answer"]', 'font-size')).toBe(12.5);
});
