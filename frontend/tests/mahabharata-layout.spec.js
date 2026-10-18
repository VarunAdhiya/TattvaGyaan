import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

// The full Hindi edition is measured after fonts load; cold font caches can
// take longer than Playwright's default five-second assertion timeout.
const expectBook = expect.configure({ timeout: 20000 });

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
  await expectBook(content.first()).toBeVisible();
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

test('compact Mahabharat controls keep navigation below the text and preserve page jumps and themes', async ({ page }) => {
  test.setTimeout(60000);
  const state = await mockBook(page);
  await page.goto('/reader/mahabharata/book?page=3');
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await checkPages(page);
    const dock = page.getByRole('navigation', { name: 'Page navigation' });
    const dockBox = await dock.boundingBox();
    expect(dockBox.width).toBeLessThan(Math.min(width, 400));
    const bottom = await page.locator('.reader-visible-page').evaluateAll(nodes => Math.max(...nodes.map(node => node.getBoundingClientRect().bottom)));
    expect(dockBox.y).toBeGreaterThan(bottom);
    await expect(page.getByText('Draft text · Not fully proofread', { exact: true })).toBeVisible();
  }
  const field = page.getByLabel('Page', { exact: true });
  await field.fill('6');
  await field.press('Enter');
  await expect(field).toHaveValue('6');
  await expect(page.locator('.reader-book')).toHaveAttribute('data-spread-start', '5');
  for (const theme of ['dark', 'sepia', 'light']) {
    await page.getByLabel('Reading theme').selectOption(theme);
    await expect(page.locator('.reader-typeset')).toHaveClass(new RegExp('theme-' + theme));
  }
  await field.fill('1');
  await field.press('Enter');
  await expect(page.getByRole('button', { name: 'Previous', exact: true })).toBeDisabled();
  await field.fill(await field.getAttribute('max'));
  await field.press('Enter');
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
  expect(state.errors).toEqual([]);
});

test('isolated chapter 3 labels form one complete family tree with working deep links', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const state = await mockBook(page);
  await page.goto('/reader/mahabharata/book?passage=passage-2-18');
  const tree = page.locator('.reader-visible-page .book-family-tree');
  await expectBook(tree).toBeVisible();
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
  test.setTimeout(90000);
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
  await expectBook(page.locator('.reader-visible-page [data-passage-id="' + saved + '"]').first()).toBeVisible();
  expect(state.errors).toEqual([]);
});

test('selection, AI, notes, bookmarks and chapter navigation keep original passage identities', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const state = await mockBook(page);
  await page.goto('/reader/mahabharata/book?page=3');
  const text = page.locator('.reader-visible-page [data-passage-id="passage-0-0"]');
  await expectBook(text).toBeVisible();
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

test('adhyay 40 and 41 begin on fresh pages with working summaries and contents', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const state = await mockBook(page);
  await page.goto('/reader/mahabharata/book?page=4');
  await checkPages(page);
  const leaf = await page.locator('.reader-visible-page').first().boundingBox();
  expect(leaf.height / leaf.width).toBeGreaterThan(1.3);
  for (const chapterIndex of [39, 40]) {
    await page.getByRole('button', { name: 'Contents', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: new RegExp('अध्याय ' + (chapterIndex + 1) + ':') }).click();
    const leaf = page.locator('.reader-visible-page').filter({ has: page.locator('[data-passage-id="passage-' + chapterIndex + '-0"]') });
    await expectBook(leaf).toBeVisible();
    await expect(leaf.locator('.scripture-text').first()).toHaveAttribute('data-passage-id', 'passage-' + chapterIndex + '-0');
    await expect(leaf.locator('.scripture-text').first()).toHaveAttribute('data-source-start', '0');
    const ids = await leaf.locator('.scripture-text').evaluateAll(nodes => nodes.map(node => node.dataset.passageId));
    expect(ids.every(id => id.startsWith('passage-' + chapterIndex + '-'))).toBe(true);
    await expect(page.locator('.reader-visible-page .book-chapter-heading')).toHaveCount(0);
    await checkPages(page);
  }
  const chapter = page.locator('.reader-visible-page').filter({ has: page.locator('[data-passage-id="passage-40-0"]') });
  await chapter.getByRole('button', { name: 'Summarize Section' }).click();
  await expect(page.getByText('Test explanation.')).toBeVisible();
  expect(state.ai.at(-1).sectionId).toBe('section-40');
  expect(state.ai.at(-1).passageId).toBeUndefined();
});

test('curved sheets show both faces, clean up after interruption, and respect reduced motion', async ({ page }) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  const state = await mockBook(page);
  await page.goto('/reader/mahabharata/book?page=4');
  await checkPages(page);
  const book = page.locator('.reader-book');
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(book).toHaveAttribute('data-turn-state', 'flipping');
  const curve = page.locator('.reader-turn-sheet--curved');
  const shape = await curve.evaluate(sheet => {
    for (const animation of sheet.getAnimations({ subtree: true })) { animation.pause(); animation.currentTime = 320; }
    return [...sheet.querySelectorAll('.reader-turn-strip')].map(strip => {
      const matrix = new DOMMatrix(getComputedStyle(strip).transform);
      return { angle: matrix.m13, depth: matrix.m43 };
    });
  });
  expect(shape).toHaveLength(16);
  expect(Math.max(...shape.map(strip => strip.depth))).toBeGreaterThan(100);
  expect(Math.abs(shape[0].angle - shape.at(-1).angle)).toBeGreaterThan(.1);
  await expect(page.locator('.reader-turn-strip .reader-turn-face--front .scripture-text').first()).not.toBeEmpty();
  await expect(page.locator('.reader-turn-strip .reader-turn-face--back .scripture-text').first()).not.toBeEmpty();
  await expect(page.locator('.reader-flip-layer [id]')).toHaveCount(0);
  await expect(page.locator('.reader-flip-layer')).toHaveAttribute('inert', '');
  await page.screenshot({ path: 'test-results/mahabharata-curved-turn-desktop.png' });
  await curve.evaluate(sheet => sheet.getAnimations().forEach(animation => animation.finish()));
  await expect(curve).toHaveCount(0);
  await page.getByRole('button', { name: 'Previous', exact: true }).click();
  await expect(book).toHaveAttribute('data-turning', 'backward');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(curve).toHaveCount(0);
  await checkPages(page);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.locator('.reader-turn-strip')).toHaveCount(12);
  await page.screenshot({ path: 'test-results/mahabharata-curved-turn-mobile.png' });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(curve).toHaveCount(0);
  await page.getByRole('button', { name: 'Previous', exact: true }).click();
  await expect(curve).toHaveCount(0);
  await checkPages(page);
  expect(state.errors).toEqual([]);
});

