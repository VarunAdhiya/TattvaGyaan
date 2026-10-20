import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const snapshot = JSON.parse(readFileSync(new URL('../../library/devotionals/hinduaarti-2026.json', import.meta.url), 'utf8'));
const october = snapshot.days.filter(day => day.date.startsWith('2026-10'));
const user = { id: 'reader', username: 'reader', displayName: 'Reader' };
async function signedIn(page) {
  await page.route('**/api/auth/me', route => route.fulfill({ json: { user } }));
}
async function capture(page, name) {
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `../.impeccable/review/${name}.png`, fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-19T06:00:00Z'));
  await page.route('**/api/auth/me', route => route.fulfill({ status: 401, json: { error: 'Not signed in' } }));
  await page.route('**/api/devotionals/calendar?*', route => route.fulfill({ json: { days: october } }));
});

test('guests see only account navigation and all content routes require sign-in', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const path of ['/', '/dashboard', '/library', '/chalisas', '/bhajans', '/mantras', '/calendar', '/chalisas/hanuman-chalisa']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Explore sections' })).toHaveCount(0);
    await expect(page.locator('.landing-page')).toHaveCount(0);
    for (const label of ['Library', 'Chalisas', 'Bhajans', 'Mantras', 'Calendar']) await expect(page.getByRole('link', { name: label, exact: true })).toHaveCount(0);
  }
  await capture(page, 'login-desktop');
  await page.setViewportSize({ width: 390, height: 844 });
  await capture(page, 'login-mobile');
  await page.goto('/register');
  await expect(page.getByRole('navigation', { name: 'Explore sections' })).toHaveCount(0);
  await capture(page, 'register-mobile');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await capture(page, 'register-desktop');
});

test('login opens the dashboard and logout hides content navigation', async ({ page }) => {
  await page.route('**/api/auth/login', route => route.fulfill({ json: { user } }));
  await page.route('**/api/auth/logout', route => route.fulfill({ json: { success: true } }));
  await page.goto('/login');
  await page.getByLabel('Email Address').fill('reader@example.com');
  await page.getByLabel('Password', { exact: true }).fill('test-password');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('devotion');
  await page.getByRole('button', { name: 'Log out', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('navigation', { name: 'Explore sections' })).toHaveCount(0);
});

test('signed-in home uses the supplied background, real Panchang and library destinations', async ({ page }) => {
  await signedIn(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Where wisdommeets devotion.');
  await expect(page.getByRole('region', { name: "Today's Panchang" })).toContainText('Shukla Ashtami');
  await expect(page.getByRole('region', { name: "Today's Panchang" })).toContainText('6:24 AM');
  expect(await page.locator('.landing-backdrop').evaluate(image => image.complete && image.naturalWidth === 1024)).toBe(true);
  for (const [label, path] of [['Library', '/library'], ['Chalisas', '/chalisas'], ['Bhajans', '/bhajans'], ['Mantras', '/mantras'], ['Calendar', '/calendar']]) {
    await expect(page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: label, exact: true })).toHaveAttribute('href', path);
  }
  await expect(page.getByRole('link', { name: 'Read Hanuman Chalisa' })).toHaveAttribute('href', '/chalisas/hanuman-chalisa');
  await expect(page.locator('body')).not.toContainText(/hindu\s*aarti/i);
  await capture(page, 'dashboard-desktop');
  await page.getByRole('link', { name: 'Explore the library', exact: true }).click();
  await expect(page).toHaveURL(/\/library$/);
  await page.getByRole('link', { name: /TattvaGyaan/ }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});

test('mobile and tablet home navigation fits and supports keyboard dismissal', async ({ page }) => {
  await signedIn(page);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const width of [390, 850]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/dashboard');
    await expect(page.getByRole('region', { name: "Today's Panchang" })).toContainText('Shukla Ashtami');
    await capture(page, width === 390 ? 'dashboard-mobile' : 'dashboard-tablet');
    await page.getByRole('button', { name: 'Open navigation' }).click();
    const nav = page.getByRole('navigation', { name: 'Mobile navigation' });
    await expect(nav.getByRole('link')).toHaveCount(8);
    await nav.getByRole('link', { name: 'Library', exact: true }).focus();
    await page.keyboard.press('Escape');
    await expect(nav).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Open navigation' })).toBeFocused();
    await page.getByRole('button', { name: 'Open navigation' }).click();
    await page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('link', { name: 'Mantras', exact: true }).click();
    await expect(page).toHaveURL(/\/mantras$/);
  }
  expect(errors).toEqual([]);
});

test('unavailable calendar data keeps the dashboard usable without invented timings', async ({ page }) => {
  await signedIn(page);
  await page.route('**/api/devotionals/calendar?*', route => route.fulfill({ json: { days: [] } }));
  await page.goto('/dashboard');
  await expect(page.getByRole('status')).toContainText('timings are not available');
  await expect(page.getByRole('link', { name: 'Open calendar' })).toBeVisible();
  await page.route('**/api/devotionals/calendar?*', route => route.fulfill({ status: 503, json: { error: 'Unavailable' } }));
  await page.reload();
  await expect(page.getByRole('status')).toContainText('timings could not be loaded');
  await expect(page.getByRole('link', { name: 'Explore the library', exact: true })).toBeVisible();
});
