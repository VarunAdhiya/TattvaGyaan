import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const source = JSON.parse(readFileSync(new URL('../../library/editions/drafts/manusmriti-hi.json', import.meta.url), 'utf8'));
const ready = expect.configure({ timeout: 30000 });

test('live Manusmriti serves source-matched layout, chapters and final page on desktop and mobile', async ({ page, request }) => {
  test.skip(!process.env.RUN_LIVE_LIBRARY, 'Requires the local API and existing Manusmriti edition.');
  test.setTimeout(120000);
  const errors = [], pdfRequests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', req => { if (new URL(req.url()).pathname.endsWith('.pdf')) pdfRequests.push(req.url()); });
  await page.route(url => url.pathname === '/api/auth/me', route => route.fulfill({ json: { user: { id: 'smoke', username: 'reader' } } }));
  await page.route(url => ['/api/bookmarks', '/api/notes'].includes(url.pathname), route => route.fulfill({ json: { bookmarks: [], notes: [] } }));
  await page.route(url => url.pathname.startsWith('/api/reading-progress'), route => route.fulfill({ json: { progress: null } }));
  const catalogResponse = await request.get('/api/scriptures?limit=100');
  expect(catalogResponse.ok()).toBeTruthy();
  const book = (await catalogResponse.json()).scriptures.find(s => s.slug === 'manusmriti');
  expect(book).toBeTruthy();
  const edition = book.editions[0];
  expect(edition.contentStatus).toBe('draft');
  expect(edition.expectedPassages).toBe(1867);
  const response = await request.get(`/api/passages/edition/${edition.id}`);
  expect(response.ok()).toBeTruthy();
  const { sections } = await response.json();
  expect(sections).toHaveLength(14);
  const originals = new Map();
  for (const [index, section] of sections.entries()) {
    expect(section.readerBlocks.length).toBeGreaterThan(0);
    expect(section.passages.map(p => p.text)).toEqual(source.sections[index].passages.map(p => p.text));
    section.passages.forEach(p => originals.set(p.id, p.text));
  }
  async function verify() {
    const contents = page.locator('.reader-visible-page .book-page-content');
    await ready(contents.first()).toBeVisible();
    await ready.poll(() => contents.evaluateAll(nodes => nodes.every(n => n.scrollHeight <= n.clientHeight + 1 && n.scrollWidth <= n.clientWidth + 1))).toBe(true);
    for (const part of await contents.locator('.scripture-text').evaluateAll(nodes => nodes.map(n => ({
      id: n.dataset.passageId, start: Number(n.dataset.sourceStart), end: Number(n.dataset.sourceEnd), text: n.textContent,
    })))) expect(part.text).toBe(originals.get(part.id).slice(part.start, part.end));
  }
  const reader = `/reader/${book.id}/${edition.id}`;
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(reader + '?passage=' + sections[1].passages[2].id);
  await verify();
  await expect(page.locator('.reader-manusmriti')).toBeVisible();
  await expect(page.locator('.reader-visible-page .book-block-verse').first()).toBeVisible();
  await page.screenshot({ path: 'test-results/manusmriti-live-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await verify();
  await page.screenshot({ path: 'test-results/manusmriti-live-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Contents', exact: true }).click();
  await page.getByRole('button', { name: /^॥अथ द्वादशोऽध्यायः/ }).click();
  await ready(page.locator(`.reader-visible-page [data-passage-id="${sections[12].passages[0].id}"]`)).toBeVisible();
  await verify();
  const field = page.getByLabel('Page', { exact: true });
  await field.fill(await field.getAttribute('max')); await field.press('Enter');
  await ready(page.getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
  await verify();
  expect(errors).toEqual([]);
  expect(pdfRequests).toEqual([]);
});
