import { test, expect } from '@playwright/test';

// Optional read-only smoke against the configured API/database. Only auth and
// private annotations are fixtures; catalog, search, edition and passages are real.
test('live Hindi catalog opens attributed text and jumps to page 50', async ({ page, request }) => {
  test.skip(!process.env.RUN_LIVE_LIBRARY, 'Set RUN_LIVE_LIBRARY=1 with the API running on port 3001.');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.route(url => url.pathname === '/api/auth/me', route => route.fulfill({ json: { user: { id: 'smoke', username: 'reader' } } }));
  await page.route(url => ['/api/bookmarks', '/api/notes'].includes(url.pathname), route => route.fulfill({ json: { bookmarks: [], notes: [] } }));
  await page.route(url => url.pathname.startsWith('/api/reading-progress'), route => route.fulfill({ json: { progress: null } }));
  const response = await request.get('http://localhost:3001/api/scriptures?search=Bhagwadgeeta');
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  expect(data.scriptures).toHaveLength(1);
  const book = data.scriptures[0];
  const edition = book.editions.find(item => item.contentStatus === 'complete');
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: book.title, exact: true })).toBeVisible();
  await page.getByRole('searchbox', { name: 'Search books' }).fill('Bhagwadgeeta');
  await expect(page.getByRole('link', { name: 'View Details' })).toHaveCount(1);
  await page.getByRole('link', { name: 'View Details' }).click();
  await page.getByRole('button', { name: 'Start Reading' }).click();
  await expect(page).toHaveURL(new RegExp(edition.id));
  await expect(page.locator('.scripture-text').first()).toBeVisible();
  await page.getByLabel('Page', { exact: true }).fill('50');
  await page.getByRole('button', { name: 'Go', exact: true }).click();
  await expect(page.getByRole('article', { name: 'Page 50', exact: true }).locator('.scripture-text').first()).toBeVisible();
  await page.screenshot({ path: 'test-results/hindi-reader-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.reader-paper')).toHaveCount(1);
  await expect(page.locator('.scripture-text').first()).toBeVisible();
  await page.screenshot({ path: 'test-results/hindi-reader-mobile.png', fullPage: true });
});
