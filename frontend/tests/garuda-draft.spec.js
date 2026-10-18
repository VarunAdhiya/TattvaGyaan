import { test, expect } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';

// The complete edition is fetched from Supabase and measured after Hindi fonts load.
test.use({ actionTimeout: 30000 });
const ready = expect.configure({ timeout: 30000 });

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
  expect(book.editions).toHaveLength(1);
  expect(book.editions.some(e => e.contentStatus === 'scanned')).toBe(false);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`/scripture/${book.id}`);
  await page.getByRole('button', { name: 'Start Reading', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(book.editions[0].id));
  await ready(page.getByText('Draft text · Not fully proofread', { exact: true })).toBeVisible();

  const sectionIndex = source.sections.findIndex(s => s.slug === 'achara-kanda');
  const section = source.sections[sectionIndex];
  const passageIndex = section.passages.findIndex(p => p.sourcePage === 20 && p.text.includes('सृष्टि-वर्णन'));
  expect(passageIndex).toBeGreaterThanOrEqual(0);
  const readerResponse = await request.get(`/api/passages/edition/${book.editions[0].id}?bookText=true`);
  expect(readerResponse.ok()).toBeTruthy();
  const reader = await readerResponse.json();
  expect(reader.sections[sectionIndex].readerBlocks.some(b => b.chapterKey === 'pdf-20-line-23')).toBe(true);
  const originals = Object.fromEntries(reader.sections.flatMap(s => s.passages.map(p => [p.id, p.text])));
  async function verifyText() {
    const parts = await page.locator('.reader-visible-page .scripture-text').evaluateAll(nodes => nodes.map(n => ({
      id: n.dataset.passageId, start: Number(n.dataset.sourceStart), end: Number(n.dataset.sourceEnd), text: n.textContent,
    })));
    expect(parts.length).toBeGreaterThan(0);
    for (const p of parts) expect(p.text).toBe(originals[p.id].slice(p.start, p.end));
  }
  async function openTopic() {
    await page.getByRole('button', { name: 'Contents', exact: true }).click();
    await page.getByRole('button', { name: /^सृष्टि-वर्णन ·/ }).click();
    await expect(page.locator('.reader-visible-page .book-block-chapter').filter({ hasText: /^सृष्टि-वर्णन\s*$/ })).toBeVisible();
    await verifyText();
  }
  async function jump(number) {
    await page.getByLabel('Page', { exact: true }).fill(String(number));
    await page.getByRole('button', { name: 'Go', exact: true }).click();
  }
  await openTopic();
  await page.getByRole('button', { name: 'Passage tools', exact: true }).first().click();
  await expect(page.getByText('Source notes', { exact: true }).first()).toBeVisible();
  await page.keyboard.press('Escape');
  await page.screenshot({ path: 'test-results/garuda-draft-desktop.png', fullPage: true });

  await page.getByRole('button', { name: 'Contents', exact: true }).click();
  for (const kanda of source.sections.filter(s => s.slug.endsWith('-kanda'))) {
    await expect(page.getByRole('button', { name: new RegExp(kanda.title) }).last()).toBeVisible();
  }
  await page.getByRole('button', { name: /ब्रह्मकाण्ड/ }).last().click();
  await verifyText();

  await page.setViewportSize({ width: 390, height: 844 });
  await openTopic();
  await expect(page.locator('.reader-paper')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'test-results/garuda-draft-mobile.png', fullPage: true });
  const finalPage = Number(await page.getByLabel('Page', { exact: true }).getAttribute('max'));
  await jump(finalPage);
  await verifyText();
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
  expect(pdfRequests).toEqual([]);
  expect(errors).toEqual([]);
});
