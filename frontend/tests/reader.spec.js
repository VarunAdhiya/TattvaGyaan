import { test, expect } from '@playwright/test';

// Synthetic fixtures used only by tests.
const edition = { id: 'edition-test', scriptureId: 'book-test', title: 'Test edition', language: 'hi', textDirection: 'ltr', scripture: { title: 'Reader test book' } };
const sections = Array.from({ length: 4 }, (_, sectionIndex) => ({
  id: 'section-' + sectionIndex, title: 'Test section ' + (sectionIndex + 1), slug: 'section-' + sectionIndex,
  _count: { passages: 30 },
}));
function passage(section, index) {
  return { id: 'passage-' + section + '-' + index, sectionId: 'section-' + section,
    reference: (section + 1) + '.' + (index + 1),
    text: 'Reader test passage ' + (index + 1) + '. Select these sample words to ask a question.',
    section: { edition },
  };
}

async function mockReader(page) {
  const state = { ai: [], pageRequests: [], bookmarks: [], notes: [{ id: 'note-1', passageId: 'passage-3-4', content: 'Saved reflection', passage: passage(3, 4) }] };
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const url = new URL(route.request().url());
    const pathname = url.pathname;
    const method = route.request().method();
    let body = { progress: null };
    if (pathname === '/api/auth/me') body = { user: { id: 'test-user', username: 'reader' } };
    else if (pathname === '/api/scripture-editions/edition-test') body = { edition };
    else if (pathname === '/api/passages/edition/edition-test') body = { sections };
    else if (pathname.startsWith('/api/passages/section/')) {
      state.pageRequests.push(url.searchParams.get('limit'));
      const section = Number(pathname.split('-').at(-1));
      const offset = (Number(url.searchParams.get('page')) - 1) * 2;
      body = { passages: [passage(section, offset), passage(section, offset + 1)] };
    } else if (pathname.endsWith('/position')) {
      const [, section, index] = pathname.split('/')[3].split('-');
      body = { editionId: edition.id, pageIndex: 2 + Number(section) * 15 + Math.floor(Number(index) / 2) };
    } else if (pathname === '/api/bookmarks') {
      if (method === 'POST') {
        const input = route.request().postDataJSON();
        const bookmark = { ...input, id: 'bookmark-new' };
        state.bookmarks.push(bookmark);
        body = { bookmark };
      } else body = { bookmarks: state.bookmarks };
    } else if (pathname.startsWith('/api/bookmarks/')) {
      state.bookmarks = []; body = {};
    } else if (pathname === '/api/notes') body = { notes: state.notes };
    else if (pathname === '/api/notes/note-1') {
      if (method === 'DELETE') { state.notes = []; body = {}; }
      else { state.notes[0].content = route.request().postDataJSON().content; body = { note: state.notes[0] }; }
    } else if (pathname.startsWith('/api/ai/')) {
      state.ai.push({ endpoint: pathname, ...route.request().postDataJSON() });
      body = { content: 'Explanation of the selected source only.', conversationId: 'conversation' };
    }
    await route.fulfill({ json: body });
  });
  return state;
}

test('desktop spread fetches only visible pages and hides library search', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const state = await mockReader(page);
  await page.goto('/reader/book-test/edition-test');
  await expect(page.locator('.reader-paper.--left:visible')).toHaveCount(1);
  await expect(page.locator('.reader-paper.--right:visible')).toHaveCount(1);
  await expect(page.getByRole('searchbox')).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Search library' })).toHaveCount(0);
  await expect(page.locator('#text-passage-0-0')).toBeVisible();
  expect(state.pageRequests.every(limit => limit === '2')).toBe(true);
  expect(state.pageRequests.length).toBeLessThanOrEqual(2);
  expect((await page.locator('.reader-book').boundingBox()).width).toBeGreaterThan(900);
  await page.screenshot({ path: 'test-results/reader-desktop.png', fullPage: true });
});

test('mobile reader fits the viewport and jumps to exact page 50', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockReader(page);
  await page.goto('/reader/book-test/edition-test');
  await page.getByLabel('Page', { exact: true }).fill('50');
  await page.getByRole('button', { name: 'Go', exact: true }).click();
  await expect(page.getByRole('article', { name: 'Page 50', exact: true })).toBeVisible();
  await expect(page.locator('#text-passage-3-4')).toBeVisible();
  await expect(page.locator('.reader-paper')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'test-results/reader-mobile.png', fullPage: true });
});

test('bookmark clicks preserve the page and can be toggled', async ({ page }) => {
  const state = await mockReader(page);
  await page.goto('/reader/book-test/edition-test?page=3');
  const pageNumber = page.getByLabel('Page', { exact: true });
  await page.locator('#passage-passage-0-0').getByRole('button', { name: 'Bookmark verse' }).click();
  await expect(page.locator('#passage-passage-0-0').getByRole('button', { name: 'Remove bookmark' })).toHaveAttribute('aria-pressed', 'true');
  await expect(pageNumber).toHaveValue('3');
  expect(state.bookmarks).toHaveLength(1);
  await page.locator('#passage-passage-0-0').getByRole('button', { name: 'Remove bookmark' }).click();
  await expect(pageNumber).toHaveValue('3');
});

test('dragging text does not turn pages and sends only the selection to AI', async ({ page }) => {
  const state = await mockReader(page);
  await page.goto('/reader/book-test/edition-test?page=3');
  const text = page.locator('#text-passage-0-0');
  await expect(text).toBeVisible();
  const box = await text.boundingBox();
  await page.mouse.move(box.x + 2, box.y + 14);
  await page.mouse.down();
  await page.mouse.move(box.x + 180, box.y + 14, { steps: 12 });
  await page.mouse.up();
  await expect(page.getByRole('button', { name: 'Ask AI about selected text' })).toBeVisible();
  const selected = await page.evaluate(() => window.getSelection().toString().trim());
  expect(selected.length).toBeGreaterThan(0);
  await expect(page.getByLabel('Page', { exact: true })).toHaveValue('3');
  await page.getByRole('button', { name: 'Ask AI about selected text' }).click();
  await expect(page.getByText('Explanation of the selected source only.')).toBeVisible();
  expect(state.ai.at(-1).selectedText).toBe(selected);
  expect(state.ai.at(-1).passageId).toBe('passage-0-0');
  await page.getByRole('button', { name: 'Ask Questions' }).click();
  await page.getByPlaceholder('Ask follow-up question...').fill('Summarize this selection');
  await page.getByPlaceholder('Ask follow-up question...').press('Enter');
  await expect.poll(() => state.ai.at(-1).endpoint).toBe('/api/ai/chat');
  expect(state.ai.at(-1).selectedText).toBe(selected);
  expect(state.ai.at(-1).sectionId).toBe('section-0');
});

test('notes navigate to a paragraph; pencil edits and trash deletes without navigation', async ({ page }) => {
  await mockReader(page);
  await page.goto('/reader/book-test/edition-test');
  await page.getByRole('button', { name: 'Notes', exact: true }).click();
  await page.getByRole('button', { name: /Saved reflection/ }).click();
  await expect(page.getByLabel('Page', { exact: true })).toHaveValue('50');
  await expect(page.locator('#passage-passage-3-4')).toBeVisible();
  await page.getByRole('button', { name: 'Notes', exact: true }).click();
  await page.getByRole('button', { name: 'Edit Note', exact: true }).click();
  await page.getByLabel('Note text').fill('Updated reflection');
  await page.getByRole('button', { name: 'Save note' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByLabel('Page', { exact: true })).toHaveValue('50');
  await page.getByRole('button', { name: 'Notes', exact: true }).click();
  await expect(page.getByText('Updated reflection')).toBeVisible();
  await page.getByRole('button', { name: 'Delete Note', exact: true }).click();
  await expect(page.getByText('No notes saved yet.')).toBeVisible();
});

test('selected section summary and follow-up chat retain section context', async ({ page }) => {
  const state = await mockReader(page);
  await page.goto('/reader/book-test/edition-test?page=50');
  await page.getByRole('button', { name: 'Summarize Section', exact: true }).first().click();
  await expect(page.getByText('Explanation of the selected source only.')).toBeVisible();
  expect(state.ai.at(-1).sectionId).toBe('section-3');
  await page.getByRole('button', { name: 'Ask Questions' }).click();
  await page.getByPlaceholder('Ask follow-up question...').fill('Summarize this section');
  await page.getByPlaceholder('Ask follow-up question...').press('Enter');
  await expect.poll(() => state.ai.at(-1).endpoint).toBe('/api/ai/chat');
  expect(state.ai.at(-1).sectionId).toBe('section-3');
  expect(state.ai.at(-1).passageId).toBeUndefined();
});

test('keyboard arrows in the page field never turn a page', async ({ page }) => {
  await mockReader(page);
  await page.goto('/reader/book-test/edition-test?page=3');
  await page.getByLabel('Page', { exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('article', { name: 'Page 3', exact: true })).toBeVisible();
});

test('reader deep links resolve a passage that was not downloaded', async ({ page }) => {
  await mockReader(page);
  await page.goto('/reader/book-test/edition-test?passage=passage-3-4');
  await expect(page.getByLabel('Page', { exact: true })).toHaveValue('50');
  await expect(page.locator('#passage-passage-3-4')).toBeVisible();
});

test('desktop pages turn around the spine in both directions with inert readable faces', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mockReader(page);
  await page.goto('/reader/book-test/edition-test?page=4');
  await expect(page.locator('#text-passage-0-4')).toBeVisible();
  const book = page.locator('.reader-book');
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(book).toHaveAttribute('data-turn-state', 'flipping');
  await expect(book).toHaveAttribute('data-turning', 'forward');
  await expect(page.locator('.reader-turn-face--front')).toContainText('Reader test passage 5.');
  await expect(page.locator('.reader-turn-face--back')).toContainText('Reader test passage 7.');
  await expect(page.locator('.reader-flip-layer')).toHaveAttribute('inert', '');
  await expect(page.locator('.reader-flip-layer [id]')).toHaveCount(0);
  const sheet = page.locator('.reader-turn-sheet');
  const perspective = await sheet.evaluate(element => {
    const animation = element.getAnimations()[0];
    animation.pause();
    animation.currentTime = 220;
    return Math.abs(new DOMMatrix(getComputedStyle(element).transform).m13);
  });
  expect(perspective).toBeGreaterThan(0.1);
  await page.screenshot({ path: 'test-results/book-flip-desktop.png', fullPage: true });
  await sheet.evaluate(element => element.getAnimations()[0].finish());
  await expect(page.locator('.reader-turn-sheet')).toHaveCount(0);
  await expect(page.getByLabel('Page', { exact: true })).toHaveValue('6');
  await page.getByRole('button', { name: 'Previous', exact: true }).click();
  await expect(book).toHaveAttribute('data-turning', 'backward');
  await expect(book).toHaveAttribute('data-turn-state', 'flipping');
  await expect(page.locator('.reader-turn-sheet')).toHaveCount(0);
  await expect(page.getByLabel('Page', { exact: true })).toHaveValue('4');
  await expect(page.locator('#text-passage-0-4')).toBeVisible();
});

test('page corners work on mobile and reduced motion bypasses 3D animation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockReader(page);
  await page.goto('/reader/book-test/edition-test?page=3');
  await expect(page.locator('#text-passage-0-0')).toBeVisible();
  await page.getByRole('button', { name: 'Turn page forward', exact: true }).click();
  await expect(page.locator('.reader-book')).toHaveAttribute('data-turn-state', 'flipping');
  await expect(page.locator('.reader-turn-scene--single')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await expect(page.locator('.reader-turn-sheet')).toHaveCount(0);
  await expect(page.getByLabel('Page', { exact: true })).toHaveValue('4');
  await page.getByRole('button', { name: 'Turn page backward', exact: true }).click();
  await expect(page.locator('.reader-book')).toHaveAttribute('data-turning', 'backward');
  await expect(page.locator('.reader-turn-sheet')).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Turn page forward', exact: true }).click();
  await expect(page.getByLabel('Page', { exact: true })).toHaveValue('4');
  await expect(page.locator('#text-passage-0-2')).toBeVisible();
  await expect(page.locator('.reader-book')).not.toHaveAttribute('data-turning', /.+/);
  await expect(page.locator('.reader-turn-sheet')).toHaveCount(0);
});

test('rapid navigation and resizing leave the requested page usable', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mockReader(page);
  await page.goto('/reader/book-test/edition-test?page=4');
  await expect(page.locator('#text-passage-0-4')).toBeVisible();
  await page.getByRole('button', { name: 'Next', exact: true }).dblclick();
  await expect(page.getByLabel('Page', { exact: true })).toHaveValue('8');
  await expect(page.locator('.reader-turn-sheet')).toHaveCount(0);
  await page.getByLabel('Page', { exact: true }).fill('50');
  await page.getByRole('button', { name: 'Go', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.reader-turn-sheet')).toHaveCount(0);
  await expect(page.locator('.reader-paper')).toHaveCount(1);
  await expect(page.locator('#text-passage-3-4')).toBeVisible();
  await page.locator('#passage-passage-3-4').getByRole('button', { name: 'Bookmark verse' }).click();
  await expect(page.locator('#passage-passage-3-4').getByRole('button', { name: 'Remove bookmark' })).toBeVisible();
});
