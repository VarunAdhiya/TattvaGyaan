import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const source = JSON.parse(readFileSync(new URL('../../library/editions/drafts/garuda-purana-hi.json', import.meta.url), 'utf8'));
const layout = JSON.parse(readFileSync(new URL('../../backend/data/layouts/garuda-purana.json', import.meta.url), 'utf8'));
const sections = source.sections.map(section => ({ ...section, id: section.slug,
  _count: { passages: section.passages.length }, readerBlocks: layout.sections[section.slug].blocks,
  passages: section.passages.map(p => ({ ...p, id: p.reference, sectionId: section.slug })),
}));
const originals = Object.fromEntries(sections.flatMap(s => s.passages.map(p => [p.id, p.text])));
const ready = expect.configure({ timeout: 30000 });

async function mockBook(page) {
  const state = { errors: [], ai: [], saves: [], notes: [], bookmarks: [] };
  page.on('pageerror', error => state.errors.push(error.message));
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const path = new URL(route.request().url()).pathname;
    const body = route.request().method() === 'POST' ? route.request().postDataJSON() : null;
    let json;
    if (path === '/api/auth/me') json = { user: { id: 'fixture', username: 'reader' } };
    else if (path === '/api/scripture-editions/garuda') json = { edition: { ...source, id: 'garuda', contentStatus: 'draft', scripture: { title: 'गरुडपुराण', slug: 'garuda-purana' } } };
    else if (path === '/api/passages/edition/garuda') json = { sections };
    else if (path.startsWith('/api/reading-progress')) {
      if (body) state.saves.push(body);
      json = { progress: state.saves.at(-1) || null };
    } else if (path === '/api/bookmarks' || path === '/api/notes') {
      const key = path.slice(5);
      if (body) state[key].push({ ...body, id: key + '-1' });
      json = body ? { [key === 'notes' ? 'note' : 'bookmark']: state[key].at(-1) } : { [key]: state[key] };
    } else if (path.startsWith('/api/ai/')) {
      state.ai.push(body);
      json = { content: 'Garuda test explanation.', conversationId: 'conversation' };
    } else return route.fulfill({ status: 404, json: { error: path } });
    await route.fulfill({ json });
  });
  return state;
}

async function checkPages(page) {
  const content = page.locator('.reader-visible-page .book-page-content');
  await ready(content.first()).toBeVisible();
  await ready.poll(() => content.evaluateAll(nodes => nodes.every(node => node.scrollHeight <= node.clientHeight + 1 &&
    node.scrollWidth <= node.clientWidth + 1 && node.lastElementChild.getBoundingClientRect().bottom <= node.getBoundingClientRect().bottom + 1))).toBe(true);
  const parts = await content.locator('.scripture-text').evaluateAll(nodes => nodes.map(node => ({
    id: node.dataset.passageId, start: Number(node.dataset.sourceStart), end: Number(node.dataset.sourceEnd), text: node.textContent,
  })));
  for (const part of parts) expect(part.text).toBe(originals[part.id].slice(part.start, part.end));
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize().width);
}

async function chapter(page) {
  await ready(page.getByRole('button', { name: 'Contents', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Contents', exact: true }).click();
  await page.getByRole('button', { name: /^सृष्टि-वर्णन ·/ }).click();
  const heading = page.locator('.reader-visible-page .book-block-chapter').filter({ hasText: /^सृष्टि-वर्णन\s*$/ });
  await ready(heading).toBeVisible();
  expect(await heading.evaluate(node => node === node.parentElement.firstElementChild)).toBe(true);
}

test('Garuda uses fresh topic pages, compact controls and source-safe responsive text', async ({ page }) => {
  test.setTimeout(180000);
  const state = await mockBook(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/reader/garuda-purana/garuda');
  await chapter(page);
  await checkPages(page);
  await page.screenshot({ path: 'test-results/garuda-layout-desktop.png', fullPage: true });
  for (const width of [900, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await chapter(page);
    await checkPages(page);
    const dock = await page.getByRole('navigation', { name: 'Page navigation' }).boundingBox();
    const bottom = await page.locator('.reader-visible-page').evaluateAll(nodes => Math.max(...nodes.map(node => node.getBoundingClientRect().bottom)));
    expect(dock.width).toBeLessThan(Math.min(width, 400));
    expect(dock.y).toBeGreaterThan(bottom);
  }
  await page.getByRole('button', { name: 'Increase font size' }).click();
  await checkPages(page);
  for (const theme of ['dark', 'sepia', 'light']) {
    await page.getByLabel('Reading theme').selectOption(theme);
    await checkPages(page);
  }
  await page.screenshot({ path: 'test-results/garuda-layout-mobile.png', fullPage: true });
  const field = page.getByLabel('Page', { exact: true });
  await field.fill(await field.getAttribute('max'));
  await field.press('Enter');
  await ready(page.getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
  await checkPages(page);
  await ready.poll(() => state.saves.at(-1)?.sectionId).toBe('back-covers');
  expect(state.errors).toEqual([]);
});

test('Garuda topic summaries, passage selections, bookmarks and notes retain their context', async ({ page }) => {
  test.setTimeout(120000);
  const state = await mockBook(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/reader/garuda-purana/garuda');
  await chapter(page);
  await page.getByRole('button', { name: 'Summarize Section', exact: true }).click();
  await expect(page.getByText('Garuda test explanation.')).toBeVisible();
  expect(state.ai.at(-1)).toMatchObject({ editionId: 'garuda', sectionId: 'achara-kanda', chapterKey: 'pdf-20-line-23' });
  await page.reload();
  await chapter(page);
  const text = page.locator('.reader-visible-page .book-block-paragraph .scripture-text').first();
  const passageId = await text.getAttribute('data-passage-id');
  const selectedText = (await text.textContent()).slice(0, 25).trim();
  await text.evaluate(element => {
    const range = document.createRange();
    range.setStart(element.firstChild, 0);
    range.setEnd(element.firstChild, Math.min(25, element.firstChild.length));
    const selection = window.getSelection();
    selection.removeAllRanges(); selection.addRange(range);
    element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  });
  await page.getByRole('button', { name: 'Ask AI about selected text' }).click();
  await expect(page.getByText('Garuda test explanation.')).toBeVisible();
  expect(state.ai.at(-1)).toMatchObject({ passageId, selectedText });
  await page.reload();
  await chapter(page);
  await page.getByRole('button', { name: 'Passage tools', exact: true }).click();
  await page.getByRole('button', { name: 'Bookmark verse' }).click();
  await page.getByRole('button', { name: 'Add or edit note' }).click();
  await page.getByLabel('Note text').fill('Garuda layout note');
  await page.getByRole('button', { name: 'Save note' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(originals[state.notes[0].passageId]).toBeTruthy();
  expect(state.bookmarks[0].passageId).toBe(state.notes[0].passageId);
  expect(state.errors).toEqual([]);
});

test('Garuda restores printed word spacing and keeps contents entries separate', async ({ page }) => {
  test.setTimeout(120000);
  const state = await mockBook(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/reader/garuda-purana/garuda?passage=3.27');
  await checkPages(page);
  const phrase = page.locator('.reader-visible-page .book-paragraph').filter({ hasText: 'जिनमें सम्पूर्ण जगत्का वास है' });
  for (let turn = 0; turn < 3 && !await phrase.count(); turn += 1) {
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await checkPages(page);
  }
  await ready(phrase).toBeVisible();
  await page.screenshot({ path: 'test-results/garuda-spacing-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Contents', exact: true }).click();
  await page.getByRole('button', { name: new RegExp('^' + source.sections[1].title + ' ·') }).click();
  await checkPages(page);
  await ready(page.locator('.reader-visible-page .book-block-contents-entry').first()).toBeVisible();
  await page.screenshot({ path: 'test-results/garuda-contents-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await checkPages(page);
  const row = page.locator('.reader-visible-page .book-block-contents-entry').first();
  await expect(row).toHaveCSS('text-indent', '0px');
  await expect(row).toHaveCSS('white-space', 'pre-line');
  await page.screenshot({ path: 'test-results/garuda-contents-mobile.png', fullPage: true });
  expect(state.errors).toEqual([]);
});
