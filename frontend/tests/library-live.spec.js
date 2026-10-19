import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const policy = JSON.parse(readFileSync(new URL('../../backend/data/reader-editions.json', import.meta.url), 'utf8'));
const retired = ['863ca30b-5065-4537-8500-a5927563e380', 'e4813744-6350-4b06-b407-1b371d7f57ec',
  '11f8556a-ed47-499d-99a1-5541003e284f', '14c3ba1a-79ee-43de-84cf-21832d3ff6db',
  '2c386bf4-27d6-47de-bf90-53c5f1c9aaee', '159a4415-511b-470e-8f6a-701da52ef87a',
  'cee389c4-419f-4fd6-bf35-ffb2a11aebb6', 'd3058547-a340-42d8-89a3-cc01d3870d4e', '91de66ce-7456-4a69-8454-bf68fcccb79c'];

async function privateFixtures(page) {
  await page.route(url => url.pathname === '/api/auth/me', route => route.fulfill({ json: { user: { id: 'smoke', username: 'reader' } } }));
  await page.route(url => ['/api/bookmarks', '/api/notes'].includes(url.pathname), route => route.fulfill({ json: { bookmarks: [], notes: [] } }));
  await page.route(url => url.pathname.startsWith('/api/reading-progress'), route => route.fulfill({ json: { progress: null } }));
}

test('live catalog contains six single text editions and retired content cannot be opened', async ({ page, request }) => {
  test.skip(!process.env.RUN_LIVE_LIBRARY, 'Requires the local API and configured database.');
  test.setTimeout(120000);
  await privateFixtures(page);
  const response = await request.get('/api/scriptures?limit=100');
  expect(response.ok()).toBeTruthy();
  const { scriptures } = await response.json();
  expect(scriptures).toHaveLength(6);
  for (const entry of policy) {
    const book = scriptures.find(item => item.slug === entry.scriptureSlug);
    expect(book.editions).toHaveLength(1);
    expect(book.editions[0].source).toBe(entry.source);
    expect(book.editions[0].contentStatus).toBe(entry.contentStatus);
    const edition = await request.get('/api/scripture-editions/' + book.editions[0].id);
    expect(edition.ok()).toBeTruthy();
  }
  for (const query of ['Rigved', 'Vedas', 'Ramcharitmanas', 'रामचरितमानस']) {
    const result = await request.get('/api/scriptures?search=' + encodeURIComponent(query));
    expect((await result.json()).scriptures).toHaveLength(0);
  }
  for (const id of retired) {
    expect((await request.get('/api/scripture-editions/' + id)).status()).toBe(404);
    expect((await request.get('/api/passages/edition/' + id)).status()).toBe(404);
  }
  await page.goto('/library');
  await expect(page.getByRole('link', { name: 'View Details' })).toHaveCount(6);
  await expect(page.getByRole('heading', { name: 'वेद', exact: true })).toHaveCount(0);
  await page.screenshot({ path: 'test-results/single-edition-library.png', fullPage: true });
  for (const book of scriptures) {
    await page.goto('/scripture/' + book.id);
    await expect(page.getByRole('heading', { name: 'Read this book' })).toBeVisible();
    await expect(page.getByText(book.editions[0].title, { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Editions', exact: true })).toHaveCount(0);
    await expect(page.locator('a[href$=".pdf"]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Create Reading Plan', exact: true })).toBeEnabled();
  }
});

test('live single-edition details open retained readers on desktop and mobile without PDF requests', async ({ page, request }) => {
  test.skip(!process.env.RUN_LIVE_LIBRARY, 'Requires the local API and configured database.');
  test.setTimeout(120000);
  await privateFixtures(page);
  const errors = [], pdfs = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (/\.pdf(?:\?|$)/i.test(request.url())) pdfs.push(request.url()); });
  const { scriptures } = await (await request.get('/api/scriptures?limit=100')).json();
  for (const [slug, width] of [['bhagavad-gita', 1440], ['shiva-purana', 390]]) {
    const book = scriptures.find(item => item.slug === slug);
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/scripture/' + book.id);
    await page.getByRole('button', { name: 'Start Reading', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(book.editions[0].id));
    const field = page.getByLabel('Page', { exact: true });
    await expect(field).toBeVisible({ timeout: 30000 });
    // Contents can span multiple leaves as the viewport and fonts change.
    await field.fill('2'); await field.press('Enter');
    await page.locator('.reader-visible-page .reader-contents-row').first().click();
    await expect(page.locator('.reader-visible-page .scripture-text').first()).toBeVisible({ timeout: 30000 });
    await expect(page.locator('canvas, iframe, a[href$=".pdf"]')).toHaveCount(0);
    await page.screenshot({ path: `test-results/single-edition-${slug}.png`, fullPage: true });
  }
  expect(errors).toEqual([]);
  expect(pdfs).toEqual([]);
});
