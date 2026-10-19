import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const snapshot = JSON.parse(readFileSync(new URL('../../library/devotionals/hinduaarti-2026.json', import.meta.url), 'utf8'));
const october = snapshot.days.filter(day => day.date.startsWith('2026-10'));

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-19T06:00:00Z'));
  await page.route('**/api/auth/me', route => route.fulfill({ status: 401, json: { error: 'Not signed in' } }));
  await page.route('**/api/devotionals/calendar?*', route => route.fulfill({ json: { days: october } }));
});

test('public homepage shows the supplied background, working destinations and real Panchang', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Where wisdommeets devotion.');
  await expect(page.getByRole('region', { name: "Today's Panchang" })).toContainText('Shukla Ashtami');
  await expect(page.getByRole('region', { name: "Today's Panchang" })).toContainText('6:24 AM');
  expect(await page.locator('.landing-backdrop').evaluate(image => image.complete && image.naturalWidth === 1024)).toBe(true);
  for (const [label, path] of [['Library', '/dashboard'], ['Chalisas', '/chalisas'], ['Bhajans', '/bhajans'], ['Mantras', '/mantras'], ['Calendar', '/calendar']]) {
    await expect(page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: label, exact: true })).toHaveAttribute('href', path);
  }
  await expect(page.getByRole('link', { name: 'Read Hanuman Chalisa' })).toHaveAttribute('href', '/chalisas/hanuman-chalisa');
  await expect(page.getByRole('link', { name: 'Begin with the Gayatri Mantra' })).toHaveAttribute('href', '/mantras/gayatri-mantra');
  await expect(page.locator('body')).not.toContainText(/hindu\s*aarti/i);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: '../.impeccable/review/desktop.png' });
  await page.screenshot({ path: '../.impeccable/review/desktop-full.png', fullPage: true });
  await page.getByRole('link', { name: 'Explore the library', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test('mobile homepage fits, exposes all destinations and supports keyboard dismissal', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('region', { name: "Today's Panchang" })).toContainText('Shukla Ashtami');
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '../.impeccable/review/mobile.png' });
  await page.screenshot({ path: '../.impeccable/review/mobile-full.png', fullPage: true });
  await page.getByRole('button', { name: 'Open navigation' }).click();
  const nav = page.getByRole('navigation', { name: 'Mobile navigation' });
  await expect(nav.getByRole('link')).toHaveCount(6);
  await nav.getByRole('link', { name: 'Library', exact: true }).focus();
  await page.keyboard.press('Escape');
  await expect(nav).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Open navigation' })).toBeFocused();
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('link', { name: 'Mantras', exact: true }).click();
  await expect(page).toHaveURL(/\/mantras$/);
  await page.getByRole('link', { name: /TattvaGyaan/ }).click();
  await expect(page).toHaveURL(/\/$/);
  expect(errors).toEqual([]);
});

test('unavailable calendar data does not hide the homepage or invent timings', async ({ page }) => {
  await page.route('**/api/devotionals/calendar?*', route => route.fulfill({ json: { days: [] } }));
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('Today’s timings are not available.');
  await expect(page.getByRole('link', { name: 'Open calendar' })).toBeVisible();
  await page.route('**/api/devotionals/calendar?*', route => route.fulfill({ status: 503, json: { error: 'Unavailable' } }));
  await page.reload();
  await expect(page.getByRole('status')).toHaveText('Today’s timings could not be loaded.');
  await expect(page.getByRole('link', { name: 'Explore the library', exact: true })).toBeVisible();
});

test('signed-in users can visit home and enter their existing library', async ({ page }) => {
  await page.route('**/api/auth/me', route => route.fulfill({ json: { user: { id: 'reader', username: 'reader', displayName: 'Reader' } } }));
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'My library', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'My library', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByRole('link', { name: /TattvaGyaan/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('devotion');
});
