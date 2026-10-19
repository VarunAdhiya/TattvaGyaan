import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const source = JSON.parse(readFileSync(new URL('../../library/editions/drafts/bal-mahabharat-katha-hi.json', import.meta.url), 'utf8'));

test('draft edition shows source text, chapter navigation and saves text positions', async ({ page }) => {
  const sections = source.sections.map(s => ({ ...s, id: s.slug, _count: { passages: s.passages.length } }));
  const edition = { ...source, id: 'draft', contentStatus: 'draft', scripture: { title: 'महाभारत' } };
  const saves = [];
  const pdfRequests = [];
  page.on('request', r => { if (r.url().endsWith('.pdf')) pdfRequests.push(r.url()); });
  await page.route(url => url.pathname.startsWith('/api/'), route => {
    const pathname = new URL(route.request().url()).pathname;
    let json;
    if (pathname === '/api/auth/me') json = { user: { id: 'fixture', username: 'reader' } };
    else if (pathname === '/api/scriptures/book') json = { scripture: { id: 'book', title: 'महाभारत', availabilityStatus: 'partial', editions: [edition] } };
    else if (pathname === '/api/scripture-editions/draft') json = { edition };
    else if (pathname === '/api/passages/edition/draft') json = { sections: sections.map(s => ({ ...s,
      passages: s.passages.map(p => ({ ...p, id: p.reference, sectionId: s.id })),
    })) };
    else if (pathname.startsWith('/api/passages/section/')) {
      const section = sections.find(s => s.id === pathname.split('/').at(-1));
      const url = new URL(route.request().url());
      expect(url.searchParams.get('limit')).toBe('2');
      const offset = (Number(url.searchParams.get('page')) - 1) * 2;
      json = { passages: section.passages.slice(offset, offset + 2).map(p => ({ ...p, id: p.reference, sectionId: section.id })) };
    } else if (pathname === '/api/bookmarks') json = { bookmarks: [] };
    else if (pathname === '/api/notes') json = { notes: [] };
    else if (pathname.startsWith('/api/reading-progress')) {
      if (route.request().method() === 'POST') saves.push(route.request().postDataJSON());
      json = { progress: null };
    } else return route.fulfill({ status: 404, json: { error: pathname } });
    return route.fulfill({ json });
  });
  await page.goto('/scripture/book');
  await expect(page.getByText('Draft text · 725 passages · Not fully proofread')).toBeVisible();
  await page.getByRole('button', { name: 'Start Reading', exact: true }).click();
  await page.getByRole('button', { name: 'Contents', exact: true }).click();
  await page.getByRole('dialog').getByRole('button').nth(1).click();
  await expect(page.getByText('Draft text · Not fully proofread', { exact: true })).toHaveCount(0);
  await expect(page.locator('.reader-visible-page .scripture-text').first()).toContainText('महाभारत की कथा');
  await page.getByRole('button', { name: 'Passage tools', exact: true }).first().click();
  await expect(page.getByText('Source notes', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close panel' }).click();
  await page.getByRole('button', { name: 'Contents', exact: true }).click();
  await page.getByRole('button', { name: /अध्याय 41:/ }).last().click();
  await expect(page.locator('.reader-visible-page .scripture-text').filter({ hasText: 'महाभारत के युद्ध की समाप्ति के बाद' })).toBeVisible();
  await expect.poll(() => saves.at(-1)?.sectionId).toBe('chapter-41');
  expect(pdfRequests).toEqual([]);
});

test('live Supabase draft is the default Mahabharata reader on desktop and mobile', async ({ page, request }) => {
  test.skip(!process.env.RUN_LIVE_LIBRARY, 'Requires the configured API on port 3001.');
  test.setTimeout(60000);
  await page.route(url => url.pathname === '/api/auth/me', route => route.fulfill({ json: { user: { id: 'smoke', username: 'reader' } } }));
  await page.route(url => ['/api/bookmarks', '/api/notes'].includes(url.pathname), route => route.fulfill({ json: { bookmarks: [], notes: [] } }));
  await page.route(url => url.pathname.startsWith('/api/reading-progress'), route => route.fulfill({ json: { progress: null } }));
  const response = await request.get('/api/scriptures?search=Mahabharata');
  expect(response.ok()).toBeTruthy();
  const book = (await response.json()).scriptures.find(b => b.slug === 'mahabharata');
  expect(book.editions[0].contentStatus).toBe('draft');
  expect(book.editions[0].expectedPassages).toBe(725);
  expect(book.editions).toHaveLength(1);
  expect(book.editions.some(e => e.contentStatus === 'scanned')).toBe(false);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`/scripture/${book.id}`);
  await page.getByRole('button', { name: 'Start Reading', exact: true }).click();
  await page.getByRole('button', { name: 'Contents', exact: true }).click();
  await page.getByRole('dialog').getByRole('button').nth(1).click();
  await expect(page).toHaveURL(new RegExp(book.editions[0].id));
  await expect(page.locator('.reader-visible-page .scripture-text').first()).toContainText('महाभारत की कथा', { timeout: 20000 });
  expect(source.sections[0].passages[0].text.startsWith(await page.locator('.reader-visible-page .scripture-text').first().textContent())).toBe(true);
  await expect(page.getByText('Draft text · Not fully proofread', { exact: true })).toHaveCount(0);
  await page.screenshot({ path: 'test-results/mahabharata-draft-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Contents', exact: true }).click();
  await page.getByRole('dialog').getByRole('button').nth(1).click();
  await expect(page.locator('.reader-paper')).toHaveCount(1);
  await expect(page.locator('.reader-visible-page .scripture-text').first()).toContainText('महाभारत की कथा');
  expect(source.sections[0].passages[0].text.startsWith(await page.locator('.reader-visible-page .scripture-text').first().textContent())).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'test-results/mahabharata-draft-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Contents', exact: true }).click();
  await page.getByRole('button', { name: /अध्याय 41:/ }).last().click();
  await expect(page.locator('.reader-visible-page .scripture-text').first()).toContainText('महाभारत के युद्ध की समाप्ति के बाद');
  expect(source.sections[40].passages[0].text.startsWith(await page.locator('.reader-visible-page .scripture-text').first().textContent())).toBe(true);
});
