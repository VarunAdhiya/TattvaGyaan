import { test, expect } from '@playwright/test';

test('search calls the server, shows errors, and recovers', async ({ page }) => {
  const queries = [];
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/auth/me') return route.fulfill({ json: { user: { id: 'test', username: 'reader' } } });
    const query = url.searchParams.get('search') || '';
    queries.push(query);
    if (query === 'failure') return route.fulfill({ status: 503, json: { error: 'Library unavailable' } });
    const scriptures = query === 'unknown' ? [] : [{ id: 'book', title: query || 'Test book', availabilityStatus: 'metadata_only', editions: [] }];
    await route.fulfill({ json: { scriptures, pagination: { total: scriptures.length, totalPages: 1 } } });
  });
  await page.goto('/library');
  const input = page.getByRole('searchbox', { name: 'Search books' });
  await input.fill('गीता');
  await expect(page.getByRole('heading', { name: 'गीता', exact: true })).toBeVisible();
  expect(queries).toContain('गीता');
  await page.getByRole('textbox', { name: 'Search library' }).fill('Bhagwadgeeta');
  await page.getByRole('textbox', { name: 'Search library' }).press('Enter');
  await expect(input).toHaveValue('Bhagwadgeeta');
  await expect(page.getByRole('heading', { name: 'Bhagwadgeeta', exact: true })).toBeVisible();
  await input.fill('failure');
  await expect(page.getByRole('alert')).toContainText('Library unavailable');
  await input.fill('unknown');
  await expect(page.getByText('No books found. Try another title or spelling.')).toBeVisible();
  await page.getByRole('button', { name: 'Show all books' }).click();
  await expect(page.getByRole('heading', { name: 'Test book', exact: true })).toBeVisible();
});
