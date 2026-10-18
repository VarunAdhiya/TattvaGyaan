import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const { bookReadingBlocks } = createRequire(import.meta.url)('../../backend/dist/services/bookLayoutService.js');
const source = JSON.parse(readFileSync(new URL('../../library/editions/gita-hi.json', import.meta.url), 'utf8'));
const ready = expect.configure({ timeout: 20000 });
const sections = source.sections.map(section => ({ ...section, id: section.slug,
  _count: { passages: section.passages.length },
  passages: section.passages.map(passage => ({ ...passage, id: 'verse-' + passage.reference, sectionId: section.slug })),
  readerBlocks: bookReadingBlocks(source.source, section.slug, section.passages),
}));
const originals = new Map(sections.flatMap(section => section.passages.map(passage => [passage.id, passage.text])));

async function mockBook(page, missingLayout = false) {
  const state = { saves: [], ai: [], bookmarks: [], notes: [], errors: [] };
  page.on('pageerror', error => state.errors.push(error.message));
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const path = new URL(route.request().url()).pathname;
    const method = route.request().method();
    let json = {};
    if (path === '/api/auth/me') json = { user: { id: 'fixture', username: 'reader' } };
    else if (path === '/api/scripture-editions/gita') json = { edition: {
      ...source, id: 'gita', contentStatus: 'complete', scripture: { title: 'श्रीमद्भगवद्गीता', slug: 'bhagavad-gita' },
    } };
    else if (path === '/api/passages/edition/gita') json = { sections: missingLayout
      ? sections.map(({ readerBlocks: _blocks, ...section }) => section) : sections };
    else if (path === '/api/bookmarks' || path === '/api/notes') {
      const key = path.slice(5);
      if (method === 'POST') {
        const item = { ...route.request().postDataJSON(), id: key + '-1' };
        state[key].push(item);
        json = { [key === 'notes' ? 'note' : 'bookmark']: item };
      } else json = { [key]: state[key] };
    } else if (path.startsWith('/api/reading-progress')) {
      if (method === 'POST') state.saves.push(route.request().postDataJSON());
      json = { progress: state.saves.at(-1) || null };
    } else if (path.startsWith('/api/ai/')) {
      state.ai.push(route.request().postDataJSON());
      json = { content: 'Test explanation.', conversationId: 'fixture' };
    } else return route.fulfill({ status: 404, json: { error: path } });
    await route.fulfill({ json });
  });
  return state;
}

async function verifyPages(page, textById = originals) {
  const content = page.locator('.reader-visible-page .book-page-content');
  await ready(content.first()).toBeVisible();
  await ready.poll(() => content.evaluateAll(nodes => nodes.every(node =>
    node.scrollHeight <= node.clientHeight + 1 && node.scrollWidth <= node.clientWidth + 1 &&
    node.lastElementChild.getBoundingClientRect().bottom <= node.getBoundingClientRect().bottom + 1))).toBe(true);
  for (const part of await content.locator('.scripture-text').evaluateAll(nodes => nodes.map(node => ({
    id: node.dataset.passageId, start: Number(node.dataset.sourceStart), end: Number(node.dataset.sourceEnd), text: node.textContent,
  })))) expect(part.text).toBe(textById.get(part.id).slice(part.start, part.end));
  await expect(page.locator('.book-family-tree')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize().width);
}

test('Gita shares the book stand, chapter navigation and themes while preserving verse text and attribution', async ({ page }) => {
  test.setTimeout(90000);
  const state = await mockBook(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/reader/bhagavad-gita/gita?passage=verse-3.15');
  await verifyPages(page);
  await expect(page.locator('.reader-typeset .mahabharata-title h1')).toHaveText('श्रीमद्भगवद्गीता');
  await expect(page.locator('.reader-visible-page .book-passage-reference').filter({ hasText: /^3\.15 $/ })).toBeVisible();
  await expect(page.getByText('Draft text · Not fully proofread', { exact: true })).toHaveCount(0);
  await page.screenshot({ path: 'test-results/gita-desktop.png', fullPage: true });
  const count = Number(await page.getByLabel('Page', { exact: true }).getAttribute('max'));
  for (let i = 0; i < 5; i += 1) await page.getByRole('button', { name: 'Increase font size' }).click();
  await verifyPages(page);
  expect(Number(await page.getByLabel('Page', { exact: true }).getAttribute('max'))).toBeGreaterThan(count);
  for (const width of [900, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await verifyPages(page);
  }
  await page.screenshot({ path: 'test-results/gita-mobile-large-text.png', fullPage: true });
  for (let i = 0; i < 5; i += 1) await page.getByRole('button', { name: 'Decrease font size' }).click();
  for (const theme of ['dark', 'sepia', 'light']) {
    await page.getByLabel('Reading theme').selectOption(theme);
    await verifyPages(page);
  }
  await page.getByRole('button', { name: 'Contents', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: /अध्याय 18:/ }).click();
  await ready(page.locator('.reader-visible-page [data-passage-id="verse-18.1"]')).toBeVisible();
  await verifyPages(page);
  const field = page.getByLabel('Page', { exact: true });
  await field.fill(await field.getAttribute('max')); await field.press('Enter');
  await verifyPages(page);
  await expect(page.locator('.reader-visible-page [data-passage-id="verse-18.78"]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
  await field.fill('1'); await field.press('Enter');
  await expect(page.getByRole('link', { name: 'Source and attribution' })).toHaveAttribute('href', source.source);
  expect(state.errors).toEqual([]);
});

test('Gita selection, notes, bookmarks, summaries and saved reading position retain original verse IDs', async ({ page }) => {
  test.setTimeout(60000);
  const state = await mockBook(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/reader/bhagavad-gita/gita?passage=verse-1.1');
  await verifyPages(page);
  const text = page.locator('.reader-visible-page [data-passage-id="verse-1.1"]');
  await text.evaluate(element => {
    const range = document.createRange(); range.selectNodeContents(element);
    const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
    element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  });
  await page.getByRole('button', { name: 'Ask AI about selected text' }).click();
  await expect(page.getByText('Test explanation.')).toBeVisible();
  expect(state.ai.at(-1).selectedText).toBe(originals.get('verse-1.1'));
  expect(state.ai.at(-1).passageId).toBe('verse-1.1');
  await page.reload();
  await ready(page.getByRole('button', { name: 'Passage tools', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Passage tools', exact: true }).click();
  await page.getByRole('button', { name: 'Bookmark verse' }).click();
  await expect(page.getByRole('button', { name: 'Remove bookmark' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Add or edit note' }).click();
  await page.getByLabel('Note text').fill('Gita reading note');
  await page.getByRole('button', { name: 'Save note' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(state.bookmarks[0].passageId).toBe('verse-1.1');
  expect(state.notes[0].passageId).toBe('verse-1.1');
  await page.getByRole('button', { name: 'Contents', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: /अध्याय 3:/ }).click();
  await verifyPages(page);
  await expect.poll(() => state.saves.at(-1)?.passageId).toBe('verse-3.1');
  await page.goto('/reader/bhagavad-gita/gita');
  await ready(page.locator('.reader-visible-page [data-passage-id="verse-3.1"]')).toBeVisible();
  await page.screenshot({ path: 'test-results/gita-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Summarize Section', exact: true }).click();
  await expect(page.getByText('Test explanation.')).toBeVisible();
  expect(state.ai.at(-1).sectionId).toBe('chapter-3');
  expect(state.ai.at(-1).passageId).toBeUndefined();
  expect(state.errors).toEqual([]);
});

test('Gita refuses missing verse layout instead of using Mahabharat family-tree heuristics', async ({ page }) => {
  await mockBook(page, true);
  await page.goto('/reader/bhagavad-gita/gita');
  await expect(page.getByRole('alert')).toHaveText('The reading layout for this edition is unavailable. Please try again shortly.');
  await expect(page.locator('.reader-typeset')).toHaveCount(0);
});

test('live Gita API serves all 700 original verses and displays chapter 3 on desktop and mobile', async ({ page, request }) => {
  test.skip(!process.env.RUN_LIVE_LIBRARY, 'Requires the local API and existing Gita edition.');
  test.setTimeout(120000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route(url => url.pathname === '/api/auth/me', route => route.fulfill({ json: { user: { id: 'smoke', username: 'reader' } } }));
  await page.route(url => ['/api/bookmarks', '/api/notes'].includes(url.pathname), route => route.fulfill({ json: { bookmarks: [], notes: [] } }));
  await page.route(url => url.pathname.startsWith('/api/reading-progress'), route => route.fulfill({ json: { progress: null } }));
  const catalogResponse = await request.get('/api/scriptures?limit=100');
  expect(catalogResponse.ok()).toBeTruthy();
  const book = (await catalogResponse.json()).scriptures.find(item => item.slug === 'bhagavad-gita');
  const edition = book.editions[0];
  expect(edition.source).toBe(source.source);
  expect(edition.contentStatus).toBe('complete');
  const response = await request.get(`/api/passages/edition/${edition.id}`);
  expect(response.ok()).toBeTruthy();
  const { sections: liveSections } = await response.json();
  expect(liveSections).toHaveLength(18);
  const liveOriginals = new Map();
  for (const [index, section] of liveSections.entries()) {
    expect(section.passages.map(({ reference, text }) => ({ reference, text }))).toEqual(
      source.sections[index].passages.map(({ reference, text }) => ({ reference, text })));
    expect(section.readerBlocks).toEqual(sections[index].readerBlocks);
    section.passages.forEach(passage => liveOriginals.set(passage.id, passage.text));
  }
  expect(liveOriginals.size).toBe(700);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`/reader/${book.id}/${edition.id}?passage=${liveSections[2].passages[14].id}`);
  await verifyPages(page, liveOriginals);
  await page.screenshot({ path: 'test-results/gita-live-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await verifyPages(page, liveOriginals);
  await page.screenshot({ path: 'test-results/gita-live-mobile.png', fullPage: true });
  expect(errors).toEqual([]);
});
