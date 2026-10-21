import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const snapshot = JSON.parse(readFileSync(new URL('../../library/devotionals/hinduaarti-2026.json', import.meta.url), 'utf8'));

test('collection errors can be retried without losing the selected section', async ({ page }) => {
  await page.route('**/api/auth/me', route => route.fulfill({ json: { user: { id: 'reader', username: 'reader' } } }));
  let available = false;
  await page.route('**/api/devotionals?*', route => {
    return route.fulfill(!available
      ? { status: 503, json: { error: 'Temporarily unavailable' } }
      : { json: { texts: [], total: 0, page: 1, pages: 0, deities: [] } });
  });
  await page.goto('/chalisas');
  await expect(page.getByRole('alert')).toContainText('Temporarily unavailable');
  available = true;
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('heading', { name: 'No prayers found' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Chalisas' })).toHaveAttribute('aria-current', 'page');
});

test.describe('imported devotional sections', () => {
  // Live database responses can exceed the default 5-second assertion window.
  const liveExpect = expect.configure({ timeout: 15000 });
  test.setTimeout(60000);
  test.skip(!process.env.RUN_LIVE_DEVOTIONALS, 'Requires the local API and imported devotional snapshot.');
  test.beforeEach(async ({ page }) => {
    // Collections and devotional readers are available after sign-in.
    await page.route('**/api/auth/me', route => route.fulfill({ json: { user: { id: 'reader', username: 'reader' } } }));
  });
  test.afterEach(async ({ page }) => {
    await liveExpect(page.locator('body')).not.toContainText(/hindu\s*aarti/i);
    await liveExpect(page.locator('a[href*="hinduaarti.com"]')).toHaveCount(0);
  });

  test('all three collections support pagination, Hindi search, filtering, and navigation', async ({ page }) => {
    for (const [category, count] of [['Chalisas', 50], ['Bhajans', 50], ['Mantras', 54]]) {
      await page.goto(`/${category.toLowerCase()}`);
      await liveExpect(page.getByRole('heading', { name: category, exact: true })).toBeVisible();
      await liveExpect(page.locator('.dev-filters')).toContainText(`${count} ${category.toLowerCase()}`);
      await liveExpect(page.locator('.dev-card')).toHaveCount(24);
      await page.getByRole('button', { name: 'Next', exact: true }).click();
      await liveExpect(page).toHaveURL(/page=2/);
      await liveExpect(page.locator('.dev-pagination')).toContainText('Page 2 of 3');
    }
    await page.goto('/chalisas');
    await page.getByRole('textbox', { name: 'Search chalisas' }).fill('हनुमान');
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await liveExpect(page.getByRole('heading', { name: 'Hanuman Chalisa', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Clear filters' }).click();
    const deity = snapshot.texts.find(text => text.slug === 'shiv-chalisa').deity;
    await page.getByRole('combobox', { name: 'Deity', exact: true }).selectOption(deity);
    await liveExpect(page.locator('.dev-card-deity').first()).toHaveText(deity);
    await liveExpect(page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Library', exact: true })).toHaveAttribute('href', '/library');
    await page.screenshot({ path: 'test-results/devotional-collection.png', fullPage: true });
  });

  test('prayer reader preserves source verses, switches script, and adjusts reading controls', async ({ page }) => {
    const source = snapshot.texts.find(text => text.slug === 'hanuman-chalisa');
    await page.goto('/chalisas/hanuman-chalisa');
    const reader = page.locator('.dev-prayer-text');
    await liveExpect(reader).toHaveAttribute('lang', 'hi');
    const paragraphs = await reader.locator('p').allTextContents();
    expect(paragraphs.join('\n\n')).toBe(source.hindi);
    await page.getByRole('button', { name: 'Transliteration', exact: true }).click();
    await liveExpect(reader).toHaveAttribute('lang', 'hi-Latn');
    expect((await reader.locator('p').allTextContents()).join('\n\n')).toBe(source.transliteration);
    await page.getByRole('button', { name: 'Increase text size' }).click();
    await liveExpect(reader).toHaveCSS('font-size', '24px');
    await page.getByRole('button', { name: 'Reading mode', exact: true }).click();
    await liveExpect(page.locator('.dev-related')).toHaveCount(0);
    await page.getByRole('button', { name: 'Reading mode', exact: true }).click();
    await liveExpect(page.locator('.dev-related')).toBeVisible();
    await liveExpect(page.getByRole('link', { name: 'View original source' })).toHaveCount(0);
    await page.screenshot({ path: 'test-results/devotional-reader.png', fullPage: true });
    await page.goto('/bhajans/hey-ram-hey-ram');
    await liveExpect(page.getByRole('heading', { name: 'Lyrics unavailable' })).toBeVisible();
    await liveExpect(page.locator('.dev-prayer-text')).toHaveCount(0);
  });

  test('calendar selects days, respects coverage bounds, and handles unavailable years', async ({ page }) => {
    await page.goto('/calendar?year=2026&month=10&day=2026-10-20');
    await liveExpect(page.locator('.dev-calendar-day')).toHaveCount(31);
    await liveExpect(page.getByRole('complementary', { name: 'Selected day Panchang' })).toContainText('20 October 2026');
    await liveExpect(page.locator('.dev-selected-festival')).toContainText('Dussehra');
    await page.locator('.dev-calendar-day').filter({ has: page.locator('.dev-day-number', { hasText: /^21$/ }) }).click();
    await liveExpect(page).toHaveURL(/day=2026-10-21/);
    await liveExpect(page.getByRole('complementary', { name: 'Selected day Panchang' })).toContainText('21 October 2026');
    await page.screenshot({ path: 'test-results/devotional-calendar.png', fullPage: true });
    await page.goto('/calendar?year=2026&month=1');
    await liveExpect(page.getByRole('button', { name: 'Previous month' })).toBeDisabled();
    await page.goto('/calendar?year=2026&month=12');
    await liveExpect(page.getByRole('button', { name: 'Next month' })).toBeDisabled();
    await page.goto('/calendar?year=2027&month=1');
    await liveExpect(page.getByRole('heading', { name: 'No calendar data for this month' })).toBeVisible();
    await page.getByRole('button', { name: 'Open available calendar' }).click();
    await liveExpect(page.locator('.dev-calendar-day')).toHaveCount(31);
    await page.goto('/calendar?year=2026&month=0');
    await liveExpect(page.getByRole('alert')).toContainText('Choose a valid month and year.');
  });

  test('mobile sections and calendar fit the viewport without runtime errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of ['/mantras', '/mantras/gayatri-mantra', '/calendar?year=2026&month=10']) {
      await page.goto(path);
      await liveExpect(page.locator('.dev-card, .dev-prayer-text, .dev-calendar-day').first()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.getByRole('button', { name: 'Open navigation' }).click();
      const calendarLink = page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('link', { name: 'Calendar', exact: true });
      const bounds = await calendarLink.boundingBox();
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
      await calendarLink.focus();
      await page.keyboard.press('Escape');
      await page.screenshot({ path: `test-results/devotional-mobile-${path.split('/')[1].split('?')[0]}.png`, fullPage: true });
    }
    expect(errors).toEqual([]);
  });
});
