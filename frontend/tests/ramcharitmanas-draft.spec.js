import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const source = JSON.parse(readFileSync(new URL('../../library/editions/drafts/ramcharitmanas-hi.json', import.meta.url), 'utf8'));

test('live Ramcharitmanas loads database text, all kandas, and final passages without fetching a PDF', async ({ page, request }) => {
  test.skip(!process.env.RUN_LIVE_LIBRARY, 'Requires the configured API on port 3001 and the imported draft.');
  test.setTimeout(120000);
  const errors = [];
  const pdfRequests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', req => { if (new URL(req.url()).pathname.endsWith('.pdf')) pdfRequests.push(req.url()); });
  // Keep public catalog/passage requests live; avoid private-user writes.
  await page.route(url => url.pathname === '/api/auth/me', route => route.fulfill({ json: { user: { id: 'smoke', username: 'reader' } } }));
  await page.route(url => ['/api/bookmarks', '/api/notes'].includes(url.pathname), route => route.fulfill({ json: { bookmarks: [], notes: [] } }));
  await page.route(url => url.pathname.startsWith('/api/reading-progress'), route => route.fulfill({ json: { progress: null } }));

  const response = await request.get('/api/scriptures?search=Ramayana');
  expect(response.ok()).toBeTruthy();
  const book = (await response.json()).scriptures.find(b => b.slug === 'ramayana');
  expect(book.editions[0].contentStatus).toBe('draft');
  expect(book.editions[0].expectedPassages).toBe(source.expectedPassages);
  expect(book.editions.some(e => e.contentStatus === 'scanned')).toBe(true);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`/scripture/${book.id}`);
  await page.getByRole('button', { name: 'Start Reading', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(book.editions[0].id));
  await expect(page.getByText('Draft text · Not fully proofread', { exact: true })).toBeVisible();

  const sectionIndex = source.sections.findIndex(s => s.slug === 'bala-kanda');
  const section = source.sections[sectionIndex];
  const passageIndex = section.passages.findIndex(p => p.text.includes('वर्णानामर्थसंघानां'));
  expect(passageIndex).toBeGreaterThanOrEqual(0);
  const firstKandaPage = 3 + source.sections.slice(0, sectionIndex).reduce((sum, s) => sum + Math.ceil(s.passages.length / 2), 0);
  const targetPage = firstKandaPage + Math.floor(passageIndex / 2);
  await page.getByLabel('Page', { exact: true }).fill(String(targetPage));
  await page.getByRole('button', { name: 'Go', exact: true }).click();
  await expect(page.locator('.reader-paper .scripture-text').filter({ hasText: 'वर्णानामर्थसंघानां' })).toHaveText(section.passages[passageIndex].text);
  await expect(page.getByText('Source notes', { exact: true }).first()).toBeVisible();
  await page.screenshot({ path: 'test-results/ramcharitmanas-draft-desktop.png', fullPage: true });

  await page.getByRole('button', { name: 'Contents', exact: true }).click();
  for (const kanda of source.sections.filter(s => s.slug.endsWith('-kanda'))) {
    await expect(page.getByRole('button', { name: new RegExp(kanda.title) }).last()).toBeVisible();
  }
  await page.getByRole('button', { name: /सुन्दरकाण्ड/ }).last().click();
  const sundara = source.sections.find(s => s.slug === 'sundara-kanda');
  await expect(page.locator('.reader-paper .scripture-text').filter({ hasText: sundara.passages[0].text })).toHaveText(sundara.passages[0].text);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByLabel('Page', { exact: true }).fill(String(targetPage));
  await page.getByRole('button', { name: 'Go', exact: true }).click();
  await expect(page.locator('.reader-paper')).toHaveCount(1);
  await expect(page.locator('.reader-paper .scripture-text').filter({ hasText: 'वर्णानामर्थसंघानां' })).toHaveText(section.passages[passageIndex].text);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'test-results/ramcharitmanas-draft-mobile.png', fullPage: true });

  const finalPage = 2 + source.sections.reduce((sum, s) => sum + Math.ceil(s.passages.length / 2), 0);
  const last = source.sections.at(-1).passages.at(-1);
  await page.getByLabel('Page', { exact: true }).fill(String(finalPage));
  await page.getByRole('button', { name: 'Go', exact: true }).click();
  await expect(page.locator('.reader-paper .scripture-text').last()).toHaveText(last.text);
  expect(pdfRequests).toEqual([]);
  expect(errors).toEqual([]);
});
