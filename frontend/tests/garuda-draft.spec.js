import { test, expect } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';

const draftFile = new URL('../../library/editions/drafts/garuda-purana-hi.json', import.meta.url);
const source = existsSync(draftFile) ? JSON.parse(readFileSync(draftFile, 'utf8')) : null;

test('live Garuda draft renders database text, kanda navigation and final page on desktop and mobile', async ({ page, request }) => {
  test.skip(!process.env.RUN_LIVE_LIBRARY, 'Requires the imported Garuda draft and API on port 3001.');
  test.setTimeout(120000);
  expect(source).toBeTruthy();
  const errors = [], pdfRequests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', req => { if (new URL(req.url()).pathname.endsWith('.pdf')) pdfRequests.push(req.url()); });
  // Public scripture requests are live; private state is isolated from users.
  await page.route(url => url.pathname === '/api/auth/me', route => route.fulfill({ json: { user: { id: 'smoke', username: 'reader' } } }));
  await page.route(url => ['/api/bookmarks', '/api/notes'].includes(url.pathname), route => route.fulfill({ json: { bookmarks: [], notes: [] } }));
  await page.route(url => url.pathname.startsWith('/api/reading-progress'), route => route.fulfill({ json: { progress: null } }));
  let book;
  for (let number = 1; !book; number++) {
    const response = await request.get(`/api/scriptures?page=${number}&limit=100`);
    expect(response.ok()).toBeTruthy();
    const catalog = await response.json();
    book = catalog.scriptures.find(item => item.slug === 'garuda-purana');
    if (number >= catalog.pagination.totalPages) break;
  }
  expect(book).toBeTruthy();
  expect(book.editions[0].contentStatus).toBe('draft');
  expect(book.editions[0].expectedPassages).toBe(source.expectedPassages);
  expect(book.editions.some(e => e.contentStatus === 'scanned')).toBe(true);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`/scripture/${book.id}`);
  await page.getByRole('button', { name: 'Start Reading', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(book.editions[0].id));
  await expect(page.getByText('Draft text · Not fully proofread', { exact: true })).toBeVisible();

  const sectionIndex = source.sections.findIndex(s => s.slug === 'achara-kanda');
  const section = source.sections[sectionIndex];
  const passageIndex = section.passages.findIndex(p => p.sourcePage === 20 && p.text.includes('सृष्टि-वर्णन'));
  expect(passageIndex).toBeGreaterThanOrEqual(0);
  const targetPage = 3 + source.sections.slice(0, sectionIndex).reduce((sum, s) => sum + Math.ceil(s.passages.length / 2), 0) + Math.floor(passageIndex / 2);
  async function jump(number) {
    await page.getByLabel('Page', { exact: true }).fill(String(number));
    await page.getByRole('button', { name: 'Go', exact: true }).click();
  }
  await jump(targetPage);
  await expect(page.locator('.reader-paper .scripture-text').filter({ hasText: section.passages[passageIndex].text })).toHaveText(section.passages[passageIndex].text);
  await expect(page.getByText('Source notes', { exact: true }).first()).toBeVisible();
  await page.screenshot({ path: 'test-results/garuda-draft-desktop.png', fullPage: true });

  await page.getByRole('button', { name: 'Contents', exact: true }).click();
  for (const kanda of source.sections.filter(s => s.slug.endsWith('-kanda'))) {
    await expect(page.getByRole('button', { name: new RegExp(kanda.title) }).last()).toBeVisible();
  }
  await page.getByRole('button', { name: /ब्रह्मकाण्ड/ }).last().click();
  const brahma = source.sections.find(s => s.slug === 'brahma-kanda');
  await expect(page.locator('.reader-paper .scripture-text').filter({ hasText: brahma.passages[0].text })).toHaveText(brahma.passages[0].text);

  await page.setViewportSize({ width: 390, height: 844 });
  await jump(targetPage);
  await expect(page.locator('.reader-paper')).toHaveCount(1);
  await expect(page.locator('.reader-paper .scripture-text').filter({ hasText: section.passages[passageIndex].text })).toHaveText(section.passages[passageIndex].text);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'test-results/garuda-draft-mobile.png', fullPage: true });
  const finalPage = 2 + source.sections.reduce((sum, s) => sum + Math.ceil(s.passages.length / 2), 0);
  await jump(finalPage);
  await expect(page.locator('.reader-paper .scripture-text').last()).toHaveText(source.sections.at(-1).passages.at(-1).text);
  expect(pdfRequests).toEqual([]);
  expect(errors).toEqual([]);
});
