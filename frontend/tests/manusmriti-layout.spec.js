import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const source = JSON.parse(readFileSync(new URL('../../library/editions/drafts/manusmriti-hi.json', import.meta.url), 'utf8'));
const layout = JSON.parse(readFileSync(new URL('../../backend/data/layouts/manusmriti.json', import.meta.url), 'utf8'));
const sections = source.sections.map(section => ({ ...section, id: section.slug,
  _count: { passages: section.passages.length }, readerBlocks: layout.sections[section.slug].blocks,
  passages: section.passages.map(p => ({ ...p, id: p.reference, sectionId: section.slug })),
}));
const original = Object.fromEntries(sections.flatMap(s => s.passages.map(p => [p.id, p.text])));
const ready = expect.configure({ timeout: 30000 });
const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function setup(page) {
  const state = { errors: [], ai: [], progress: null, bookmarks: [], notes: [] };
  page.on('pageerror', error => state.errors.push(error.message));
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const path = new URL(route.request().url()).pathname;
    const body = route.request().method() === 'POST' ? route.request().postDataJSON() : null;
    let json;
    if (path === '/api/auth/me') json = { user: { id: 'fixture', username: 'reader' } };
    else if (path === '/api/scripture-editions/manu') json = { edition: { ...source, id: 'manu', contentStatus: 'draft', scripture: { title: 'मनुस्मृति', slug: 'manusmriti' } } };
    else if (path === '/api/passages/edition/manu') json = { sections };
    else if (path.startsWith('/api/reading-progress')) {
      if (body) state.progress = body;
      json = { progress: state.progress };
    } else if (path === '/api/bookmarks' || path === '/api/notes') {
      const key = path.slice(5);
      if (body) state[key].push({ ...body, id: key + '-1' });
      json = body ? { [key === 'notes' ? 'note' : 'bookmark']: state[key].at(-1) } : { [key]: state[key] };
    } else if (path.startsWith('/api/ai/')) {
      state.ai.push(body);
      json = { content: 'Manusmriti test explanation.', conversationId: 'conversation' };
    } else return route.fulfill({ status: 404, json: { error: path } });
    await route.fulfill({ json });
  });
  return state;
}

async function chapter(page, number) {
  await ready(page.getByRole('button', { name: 'Contents', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Contents', exact: true }).click();
  await page.getByRole('button', { name: new RegExp('^' + escape(sections[number].title) + ' ·') }).click();
  await ready(page.locator(`.reader-visible-page [data-passage-id="${number}.1"]`)).toBeVisible();
}

async function checkPages(page) {
  const pages = page.locator('.reader-visible-page .book-page-content');
  await ready(pages.first()).toBeVisible();
  await ready.poll(() => pages.evaluateAll(nodes => nodes.every(node => node.scrollHeight <= node.clientHeight + 1 &&
    node.scrollWidth <= node.clientWidth + 1 && node.lastElementChild.getBoundingClientRect().bottom <= node.getBoundingClientRect().bottom + 1))).toBe(true);
  for (const part of await pages.locator('.scripture-text').evaluateAll(nodes => nodes.map(n => ({ id: n.dataset.passageId,
    start: Number(n.dataset.sourceStart), end: Number(n.dataset.sourceEnd), text: n.textContent })))) {
    expect(part.text).toBe(original[part.id].slice(part.start, part.end));
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize().width);
}

test('Manusmriti uses the shared reader with fresh chapters, distinct shlokas and responsive contents', async ({ page }) => {
  test.setTimeout(180000);
  const state = await setup(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/reader/manusmriti/manu');
  await chapter(page, 1);
  await checkPages(page);
  await expect(page.locator('.reader-visible-page .book-block-verse').first()).toHaveCSS('white-space', 'pre-line');
  expect(await page.locator('.reader-visible-page .book-block-verse').first().textContent()).toContain('॥१॥');
  await page.screenshot({ path: 'test-results/manusmriti-desktop.png', fullPage: true });
  for (const number of [2, 8, 12]) {
    await chapter(page, number);
    await checkPages(page);
    const first = page.locator(`.reader-visible-page [data-passage-id="${number}.1"]`);
    expect(await first.evaluate(node => node.closest('.book-paragraph') === node.closest('.book-page-content').firstElementChild)).toBe(true);
  }
  for (const width of [900, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await chapter(page, 2);
    await checkPages(page);
    const nav = await page.getByRole('navigation', { name: 'Page navigation' }).boundingBox();
    const bookBottom = await page.locator('.reader-visible-page').evaluateAll(nodes => Math.max(...nodes.map(n => n.getBoundingClientRect().bottom)));
    expect(nav.y).toBeGreaterThan(bookBottom);
    expect(nav.width).toBeLessThan(Math.min(width, 400));
  }
  await page.getByRole('button', { name: 'Increase font size' }).click();
  await checkPages(page);
  for (const theme of ['dark', 'sepia', 'light']) {
    await page.getByLabel('Reading theme').selectOption(theme);
    await checkPages(page);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await chapter(page, 1);
  await page.screenshot({ path: 'test-results/manusmriti-mobile.png', fullPage: true });
  await page.goto('/reader/manusmriti/manu?passage=front-matter.5');
  await checkPages(page);
  await ready(page.locator('.reader-visible-page .book-block-contents-entry').first()).toBeVisible();
  await page.screenshot({ path: 'test-results/manusmriti-contents-mobile.png', fullPage: true });
  const field = page.getByLabel('Page', { exact: true });
  await field.fill(await field.getAttribute('max'));
  await field.press('Enter');
  await ready(page.getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
  await checkPages(page);
  await ready.poll(() => state.progress?.sectionId).toBe('credits');
  expect(state.errors).toEqual([]);
});

test('Manusmriti preserves AI selection, chapter summaries, annotations and saved passage on resize', async ({ page }) => {
  test.setTimeout(120000);
  const state = await setup(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/reader/manusmriti/manu?passage=2.7');
  await checkPages(page);
  await ready(page.locator('.reader-visible-page [data-passage-id="2.7"]').first()).toBeVisible();
  const verse = page.locator('.reader-visible-page [data-passage-id="2.7"]').first();
  const selectedText = (await verse.textContent()).slice(0, 22).trim();
  await verse.evaluate(node => {
    const range = document.createRange(); range.setStart(node.firstChild, 0); range.setEnd(node.firstChild, 22);
    const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
    node.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  });
  await page.getByRole('button', { name: 'Ask AI about selected text' }).click();
  await expect(page.getByText('Manusmriti test explanation.')).toBeVisible();
  expect(state.ai.at(-1)).toMatchObject({ passageId: '2.7', selectedText });
  await page.goto('/reader/manusmriti/manu');
  await chapter(page, 8);
  await page.getByRole('button', { name: 'Summarize Section', exact: true }).click();
  await expect(page.getByText('Manusmriti test explanation.')).toBeVisible();
  expect(state.ai.at(-1)).toMatchObject({ editionId: 'manu', sectionId: 'chapter-8' });
  await page.reload();
  await chapter(page, 8);
  await page.getByRole('button', { name: 'Passage tools', exact: true }).click();
  await page.getByRole('button', { name: 'Bookmark verse' }).click();
  await page.getByRole('button', { name: 'Add or edit note' }).click();
  await page.getByLabel('Note text').fill('Manusmriti reading note');
  await page.getByRole('button', { name: 'Save note' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.keyboard.press('Escape');
  expect(state.notes[0].passageId).toBe(state.bookmarks[0].passageId);
  expect(original[state.notes[0].passageId]).toBeTruthy();
  await ready.poll(() => state.progress?.passageId).toBeTruthy();
  const saved = state.progress.passageId;
  await page.setViewportSize({ width: 1440, height: 1000 });
  await checkPages(page);
  await page.reload();
  await ready(page.locator(`.reader-visible-page [data-passage-id="${saved}"]`).first()).toBeVisible();
  expect(state.errors).toEqual([]);
});
