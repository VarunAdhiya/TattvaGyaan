import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const source = JSON.parse(readFileSync(new URL('../../library/editions/drafts/bal-mahabharat-katha-hi.json', import.meta.url), 'utf8'));
const sections = source.sections.map((section, index) => ({
  ...section, id: 'section-' + index, _count: { passages: section.passages.length },
  passages: section.passages.map((passage, offset) => ({ ...passage, id: 'passage-' + index + '-' + offset, sectionId: 'section-' + index })),
}));
const originals = Object.fromEntries(sections.flatMap(section => section.passages.map(passage => [passage.id, passage.text])));

async function mockBook(page, legacy = false) {
  const edition = { ...source, id: 'book', contentStatus: 'draft', scripture: { title: 'महाभारत', slug: 'mahabharata' } };
  const state = { saves: [], ai: [], bookmarks: [], notes: [], errors: [], requests: [] };
  page.on('pageerror', error => state.errors.push(error.message));
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const method = route.request().method();
    let json = {};
    if (path === '/api/auth/me') json = { user: { id: 'fixture', username: 'reader' } };
    else if (path === '/api/scripture-editions/book') json = { edition };
    else if (path === '/api/passages/edition/book') json = { sections: legacy ? sections.map(({ passages: _passages, ...section }) => section) : sections };
    else if (path.startsWith('/api/passages/section/')) {
      const index = Number(path.split('-').at(-1));
      const limit = Number(url.searchParams.get('limit'));
      state.requests.push(limit);
      const offset = (Number(url.searchParams.get('page')) - 1) * limit;
      json = { passages: sections[index].passages.slice(offset, offset + limit) };
    } else if (path === '/api/bookmarks') {
      if (method === 'POST') {
        const bookmark = { ...route.request().postDataJSON(), id: 'bookmark-1' };
        state.bookmarks.push(bookmark);
        json = { bookmark };
      } else json = { bookmarks: state.bookmarks };
    } else if (path === '/api/notes') {
      if (method === 'POST') {
        const note = { ...route.request().postDataJSON(), id: 'note-1' };
        state.notes.push(note);
        json = { note };
      } else json = { notes: state.notes };
    } else if (path.startsWith('/api/reading-progress')) {
      if (method === 'POST') state.saves.push(route.request().postDataJSON());
      json = { progress: state.saves.at(-1) || null };
    } else if (path.startsWith('/api/ai/')) {
      state.ai.push(route.request().postDataJSON());
      json = { content: 'Test explanation.', conversationId: 'conversation' };
    } else return route.fulfill({ status: 404, json: { error: path } });
    await route.fulfill({ json });
  });
  return state;
}

async function checkPages(page) {
  const content = page.locator('.reader-visible-page .book-page-content');
  await expect(content.first()).toBeVisible();
  await expect.poll(async () => content.evaluateAll(nodes => nodes.every(node =>
    node.scrollHeight <= node.clientHeight + 1 && node.scrollWidth <= node.clientWidth + 1 &&
    node.lastElementChild.getBoundingClientRect().bottom <= node.getBoundingClientRect().bottom + 1))).toBe(true);
  const parts = await content.locator('.scripture-text').evaluateAll(nodes => nodes.map(node => ({
    id: node.dataset.passageId, start: Number(node.dataset.sourceStart), end: Number(node.dataset.sourceEnd), text: node.textContent,
  })));
  for (const part of parts) expect(part.text).toBe(originals[part.id].slice(part.start, part.end));
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize().width);
}

test('content fills consistent pages with intact source text and aligned footers', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const state = await mockBook(page);
  await page.goto('/reader/mahabharata/book?page=4');
  await checkPages(page);
  for (const text of await page.locator('.reader-visible-page .book-page-content').allTextContents()) expect(text.length).toBeGreaterThan(250);
  const footers = await page.locator('.reader-visible-page .reader-page-number').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().top));
  expect(Math.abs(footers[0] - footers[1])).toBeLessThan(1);
  await page.screenshot({ path: 'test-results/mahabharata-book-desktop.png', fullPage: true });
  await expect.poll(() => state.saves.at(-1)?.pageIndex).toBe(3);
  expect(state.requests).toEqual([]);
  expect(state.errors).toEqual([]);
});

test('isolated chapter 3 labels form one complete family tree with working deep links', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const state = await mockBook(page);
  await page.goto('/reader/mahabharata/book?passage=passage-2-18');
  const tree = page.locator('.reader-visible-page .book-family-tree');
  await expect(tree).toBeVisible();
  await expect(tree.locator('.book-tree-label')).toHaveCount(12);
  await expect(tree.locator('[data-passage-id="passage-2-18"]')).toHaveText('(अंबिका से)');
  await checkPages(page);
  await page.screenshot({ path: 'test-results/mahabharata-family-tree-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(tree).toBeVisible();
  await checkPages(page);
  await page.screenshot({ path: 'test-results/mahabharata-family-tree-mobile.png', fullPage: true });
  await expect.poll(() => state.saves.at(-1)?.passageId).toBe('passage-2-18');
  expect(state.errors).toEqual([]);
});

test('font and viewport changes repaginate without clipping and resume the saved passage', async ({ page }) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  const state = await mockBook(page);
  await page.goto('/reader/mahabharata/book?page=4');
  await checkPages(page);
  const count = Number(await page.getByLabel('Page', { exact: true }).getAttribute('max'));
  for (let index = 0; index < 5; index += 1) await page.getByRole('button', { name: 'Increase font size' }).click();
  await checkPages(page);
  expect(Number(await page.getByLabel('Page', { exact: true }).getAttribute('max'))).toBeGreaterThan(count);
  for (const width of [900, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await checkPages(page);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await checkPages(page);
  await page.screenshot({ path: 'test-results/mahabharata-book-mobile-large-text.png', fullPage: true });
  for (const theme of ['sepia', 'dark', 'light']) {
    await page.getByLabel('Reading theme').selectOption(theme);
    await checkPages(page);
  }
  for (let index = 0; index < 5; index += 1) await page.getByRole('button', { name: 'Decrease font size' }).click();
  await checkPages(page);
  await page.screenshot({ path: 'test-results/mahabharata-book-mobile.png', fullPage: true });
  const current = Number(await page.getByLabel('Page', { exact: true }).inputValue()) - 1;
  await expect.poll(() => state.saves.at(-1)?.pageIndex).toBe(current);
  const saved = state.saves.at(-1).passageId;
  await page.goto('/reader/mahabharata/book');
  await expect(page.locator('.reader-visible-page [data-passage-id="' + saved + '"]').first()).toBeVisible();
  expect(state.errors).toEqual([]);
});

test('selection, AI, notes, bookmarks and chapter navigation keep original passage identities', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const state = await mockBook(page);
  await page.goto('/reader/mahabharata/book?page=3');
  const text = page.locator('.reader-visible-page [data-passage-id="passage-0-0"]');
  await expect(text).toBeVisible();
  const original = originals['passage-0-0'];
  const end = original.indexOf('\n', original.indexOf('\n') + 1);
  await text.evaluate((element, endOffset) => {
    const range = document.createRange();
    range.setStart(element.firstChild, 0);
    range.setEnd(element.firstChild, endOffset);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  }, end);
  await page.getByRole('button', { name: 'Ask AI about selected text' }).click();
  await expect(page.getByText('Test explanation.')).toBeVisible();
  expect(state.ai.at(-1).selectedText).toBe(original.slice(0, end));
  expect(state.ai.at(-1).passageId).toBe('passage-0-0');
  await page.reload();
  await page.getByRole('button', { name: 'Passage tools', exact: true }).click();
  await page.getByRole('button', { name: 'Bookmark verse' }).click();
  await expect(page.getByRole('button', { name: 'Remove bookmark' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByText('Source notes', { exact: true }).click();
  await expect(page.getByText(sections[0].passages[0].sourceNotes, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Add or edit note' }).click();
  await page.getByLabel('Note text').fill('Layout regression note');
  await page.getByRole('button', { name: 'Save note' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(state.notes[0].passageId).toBe('passage-0-0');
  expect(state.bookmarks[0].passageId).toBe('passage-0-0');
  await page.getByRole('button', { name: 'Contents', exact: true }).click();
  await page.getByRole('button', { name: /अध्याय 41:/ }).click();
  await expect(page.locator('.reader-visible-page [data-passage-id="passage-40-0"]')).toBeVisible();
  await expect.poll(() => state.saves.at(-1)?.sectionId).toBe('section-40');
  await checkPages(page);
  await page.getByRole('button', { name: 'Notes', exact: true }).click();
  await page.getByRole('button', { name: /Layout regression note/ }).click();
  await expect(text).toBeVisible();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByLabel('Page', { exact: true })).toHaveValue('4');
  await checkPages(page);
  expect(state.errors).toEqual([]);
});

test('older API responses load complete sections without unbounded requests', async ({ page }) => {
  const state = await mockBook(page, true);
  await page.goto('/reader/mahabharata/book?page=3');
  await checkPages(page);
  expect(state.requests).toHaveLength(sections.length);
  expect(state.requests.every(limit => limit === 100)).toBe(true);
  expect(state.errors).toEqual([]);
});

