import { test, expect } from '@playwright/test';

const initial = { id: 'reader', displayName: 'Test Reader', username: 'reader', email: 'reader@example.com', preferredLang: 'hi',
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-10-23T00:00:00Z', signInMethods: { google: true, password: true } };
const activity = { stats: { booksOpened: 2, bookmarks: 5, notes: 3, completedPlans: 1 }, books: [
  { scriptureId: 'book-a', editionId: 'edition-a', title: 'Ramayan', bookmarks: 3, notes: 1, percentage: 42, lastReadAt: '2026-10-23T00:00:00Z' },
  { scriptureId: 'book-b', editionId: 'edition-b', title: 'Bhagavad Gita', bookmarks: 2, notes: 2, percentage: 18, lastReadAt: '2026-10-22T00:00:00Z' },
] };
async function setup(page, options = {}) {
  const state = { user: { ...initial, ...options.user }, writes: [], failSave: false, failActivity: false, failAccount: false, ...options };
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const path = new URL(route.request().url()).pathname;
    let json = {}; let status = 200;
    if (path === '/api/auth/me') json = { user: state.guest ? null : state.user };
    else if (path === '/api/auth/profile') {
      if (route.request().method() === 'PATCH') {
        state.writes.push(route.request().postDataJSON());
        if (state.failSave) { status = 503; json = { error: 'Unable to save. Please try again.' }; }
        else { state.user = { ...state.user, ...route.request().postDataJSON() }; json = { user: state.user }; }
      } else if (state.failAccount) { status = 503; json = { error: 'Account temporarily unavailable.' }; }
      else json = { user: state.user };
    } else if (path === '/api/auth/profile/activity') {
      if (state.failActivity) { status = 503; json = { error: 'Activity temporarily unavailable.' }; }
      else json = state.empty ? { stats: { booksOpened: 0, bookmarks: 0, notes: 0, completedPlans: 0 }, books: [] } : activity;
    } else if (path === '/api/ai/library/catalog') json = { ready: true, editions: [], totalPassages: 0, indexedPassages: 0 };
    else if (path === '/api/ai/library/history') json = { answers: [] };
    await route.fulfill({ status, json });
  });
  return state;
}

for (const width of [1440, 390]) test(`profile shows real book totals and fits at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  await setup(page); await page.goto('/profile');
  await expect(page.getByRole('heading', { name: 'Your reading journal' })).toBeVisible();
  await expect(page.getByLabel('Display name')).toHaveValue('Test Reader');
  await expect(page.getByText('Google and email with password')).toBeVisible();
  await expect(page.locator('.profile-books > li')).toHaveCount(2);
  await expect(page.getByRole('link', { name: 'Open Ramayan' })).toHaveAttribute('href', '/reader/book-a/edition-a');
  await expect(page.getByRole('progressbar', { name: 'Ramayan saved position' })).toHaveAttribute('value', '42');
  await expect(page.getByRole('button', { name: 'Save changes' })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  await page.screenshot({ path: `test-results/profile-${width}.png`, fullPage: true });
});

test('save persists preferences, updates navbar, survives reload and sets new AI default', async ({ page }) => {
  const state = await setup(page); await page.goto('/profile');
  await page.getByLabel('Display name').fill('  New Reader  ');
  await page.getByLabel('Preferred language').selectOption('en');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('status')).toContainText('has been saved');
  await expect(page.locator('header').getByRole('link', { name: 'New Reader', exact: true })).toBeVisible();
  expect(state.writes[0]).toEqual({ displayName: 'New Reader', preferredLang: 'en' });
  await page.reload(); await expect(page.getByLabel('Display name')).toHaveValue('New Reader');
  await expect(page.getByLabel('Preferred language')).toHaveValue('en');
  await page.goto('/ask'); await expect(page.getByLabel('Answer language')).toHaveValue('en');
});

test('cancel restores saved values; failed save retains draft and retry works', async ({ page }) => {
  const state = await setup(page); await page.goto('/profile');
  await page.getByLabel('Display name').fill('Discard this');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByLabel('Display name')).toHaveValue('Test Reader');
  state.failSave = true;
  await page.getByLabel('Display name').fill('Keep this draft');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('alert')).toContainText('Unable to save');
  await expect(page.getByLabel('Display name')).toHaveValue('Keep this draft');
  state.failSave = false;
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('status')).toContainText('has been saved');
});

test('loading errors are recoverable and do not invent zero activity', async ({ page }) => {
  const state = await setup(page, { failAccount: true, failActivity: true }); await page.goto('/profile');
  await expect(page.getByRole('button', { name: 'Retry account' })).toBeVisible();
  await expect(page.locator('.profile-totals')).toHaveCount(0);
  state.failAccount = false;
  await page.getByRole('button', { name: 'Retry account' }).click();
  await expect(page.getByLabel('Display name')).toBeVisible();
  await page.getByLabel('Display name').fill('Unsaved name');
  state.failActivity = false;
  await page.getByRole('button', { name: 'Retry reading activity' }).click();
  await expect(page.locator('.profile-books > li')).toHaveCount(2);
  await expect(page.getByLabel('Display name')).toHaveValue('Unsaved name');
});

test('new accounts have an honest empty state and Google-only sign-in label', async ({ page }) => {
  await setup(page, { empty: true, user: { ...initial, signInMethods: { google: true, password: false } } }); await page.goto('/profile');
  await expect(page.getByRole('heading', { name: 'Your next chapter starts here.' })).toBeVisible();
  await expect(page.getByText('Google account', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Explore the library' })).toHaveAttribute('href', '/library');
});

test('guests cannot view profile', async ({ page }) => {
  await setup(page, { guest: true }); await page.goto('/profile');
  await expect(page).toHaveURL(/\/login$/);
});
