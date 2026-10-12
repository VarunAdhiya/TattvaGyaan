import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  page.on('pageerror', error => console.error(error.message));
});

// Deliberately synthetic UI fixtures, never imported into the scripture library.
const edition = { id: 'edition-test', scriptureId: 'book-test', title: 'Test edition', language: 'en', textDirection: 'ltr', scripture: { title: 'Reader test book' } };
const sections = Array.from({ length: 4 }, (_, sectionIndex) => ({
  id: `section-${sectionIndex}`, title: `Test section ${sectionIndex + 1}`, slug: `section-${sectionIndex}`,
  passages: Array.from({ length: 30 }, (_, index) => ({
    id: `passage-${sectionIndex}-${index}`, reference: `${sectionIndex + 1}.${index + 1}`,
    text: `Reader test passage ${index + 1}. Select these sample words to ask a question.`,
  })),
}));

async function mockReader(page) {
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const url = new URL(route.request().url());
    const body = url.pathname === '/api/auth/me' ? { user: { id: 'test-user', username: 'reader' } }
      : url.pathname === '/api/scripture-editions/edition-test' ? { edition }
      : url.pathname === '/api/passages/edition/edition-test' ? { sections }
      : url.pathname === '/api/bookmarks' ? { bookmarks: [] }
      : url.pathname === '/api/notes' ? { notes: [] }
      : url.pathname.includes('/highlights') ? { highlights: [] }
      : { progress: null };
    await route.fulfill({ json: body });
  });
}

test('opens a large two-page spread on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mockReader(page);
  await page.goto('/reader/book-test/edition-test');
  await expect(page.locator('.reader-paper.--left:visible')).toHaveCount(1);
  await expect(page.locator('.reader-paper.--right:visible')).toHaveCount(1);
  const book = await page.locator('.reader-book').boundingBox();
  expect(book.width).toBeGreaterThan(900);
  await page.screenshot({ path: 'test-results/reader-desktop.png', fullPage: true });
});

test('fits a single readable page on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockReader(page);
  await page.goto('/reader/book-test/edition-test');
  await expect(page.locator('.reader-paper.--right:visible')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
