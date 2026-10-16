import { test, expect } from '@playwright/test';

test('a reviewed transcription reads API text without requesting the original PDF', async ({ page }) => {
  // Synthetic text fixture; a local PDF source remains solely for attribution.
  const edition = { id: 'transcribed', scriptureId: 'book', title: 'Reviewed test edition', language: 'hi',
    source: '/library/test-book.pdf', contentStatus: 'transcribed', expectedPassages: 1,
    textDirection: 'ltr', scripture: { title: 'Test book' } };
  const scripture = { id: 'book', title: 'Test book', availabilityStatus: 'partial', editions: [edition] };
  const section = { id: 'page-2', title: 'Source PDF page 2', slug: 'pdf-page-2', _count: { passages: 1 } };
  const pdfRequests = [];
  const errors = [];
  const saves = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (request.url().includes('/library/')) pdfRequests.push(request.url()); });
  await page.route('**/library/**', route => route.abort());
  await page.route(url => url.pathname.startsWith('/api/'), route => {
    const pathname = new URL(route.request().url()).pathname;
    let json = {};
    if (pathname === '/api/auth/me') json = { user: { id: 'reader', username: 'reader' } };
    else if (pathname === '/api/scriptures/book') json = { scripture };
    else if (pathname === '/api/scripture-editions/transcribed') json = { edition };
    else if (pathname === '/api/passages/edition/transcribed') json = { sections: [section] };
    else if (pathname === '/api/passages/section/page-2') json = { passages: [{ id: 'text-1', sectionId: section.id,
      reference: 'PDF page 2', text: 'Reviewed fixture text from the database.', sourceNotes: 'Reviewed source page.' }] };
    else if (pathname === '/api/bookmarks') json = { bookmarks: [] };
    else if (pathname === '/api/notes') json = { notes: [] };
    else if (pathname.startsWith('/api/reading-progress')) {
      if (route.request().method() === 'POST') saves.push(route.request().postDataJSON());
      json = { progress: null };
    } else return route.fulfill({ status: 404, json: { error: `Unexpected API path: ${pathname}` } });
    return route.fulfill({ json });
  });
  await page.goto('/scripture/book');
  await expect(page.getByText('Reviewed transcription · 1 source page with text')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create Reading Plan' })).toBeEnabled();
  await expect(page.locator('a[href="/library/test-book.pdf"]')).toHaveCount(0);
  await page.goto('/reader/book/transcribed?page=3');
  await expect(page.getByText('Reviewed fixture text from the database.')).toBeVisible();
  await expect(page.getByText('Source and review notes')).toBeVisible();
  await expect(page.locator('.reader-scan, canvas, iframe')).toHaveCount(0);
  await expect.poll(() => saves.at(-1)?.passageId).toBe('text-1');
  expect(pdfRequests).toEqual([]);
  expect(errors).toEqual([]);
});
