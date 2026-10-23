import { test, expect } from '@playwright/test';

const edition = { id: 'edition-test', scriptureId: 'book-test', title: 'Synthetic test edition', language: 'hi', textDirection: 'ltr', scripture: { title: 'Reader test book' } };
const passage = { id: 'passage-test', sectionId: 'section-test', reference: 'Test 1', text: 'Synthetic test passage for verifying citation navigation.' };
const answer = {
  id: 'answer-test', question: 'What does this passage explain?', responseLang: 'en', answered: true,
  paragraphs: [{ text: 'This is a synthetic explanation used only by the browser test.', sourceIds: ['S1'] }],
  sources: [{ id: 'S1', passageId: passage.id, title: 'Reader test book', edition: edition.title, section: 'Test chapter', reference: 'Test 1',
    excerpt: passage.text, contentStatus: 'draft', href: '/reader/book-test/edition-test?passage=passage-test' }],
};

async function setup(page, options = {}) {
  const requests = []; let history = options.history || [];
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const path = new URL(route.request().url()).pathname;
    let json = {}; let status = 200;
    if (path === '/api/auth/me') { json = options.guest ? { error: 'Authentication required' } : { user: { id: 'test-user', username: 'reader' } }; if (options.guest) status = 401; }
    else if (path === '/api/ai/library/catalog') json = { ready: options.ready !== false, totalPassages: 2, indexedPassages: options.ready === false ? 0 : 2, editions: [edition] };
    else if (path === '/api/ai/library/history') {
      if (route.request().method() === 'DELETE') history = [];
      json = { answers: history };
    } else if (path === '/api/ai/library/ask') {
      requests.push(route.request().postDataJSON());
      if (options.error) { status = 503; json = { error: 'Set GROQ_API_KEY in backend/.env and restart the backend.' }; }
      else json = options.noAnswer ? { ...answer, answered: false, sources: [], paragraphs: [], message: 'I could not find enough evidence in the available passages.' } : { ...answer, ...route.request().postDataJSON() };
    } else if (path === '/api/scripture-editions/edition-test') json = { edition };
    else if (path === '/api/passages/edition/edition-test') json = { sections: [{ id: 'section-test', title: 'Test chapter', slug: 'test', _count: { passages: 2 } }] };
    else if (path === '/api/passages/section/section-test') json = { passages: [passage, { ...passage, id: 'second', text: 'Second synthetic passage.' }] };
    else if (path.endsWith('/position')) json = { editionId: edition.id, pageIndex: 2 };
    else if (path === '/api/bookmarks') json = { bookmarks: [] };
    else if (path === '/api/notes') json = { notes: [] };
    else if (path.startsWith('/api/reading-progress')) json = { progress: null };
    await route.fulfill({ status, json });
  });
  return requests;
}

for (const width of [1440, 390]) test(`library answers show exact source excerpts and reader links at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  const requests = await setup(page);
  await page.goto('/ask');
  await page.getByLabel('What would you like to understand?').fill(answer.question);
  await page.getByLabel('Search in', { exact: true }).selectOption(edition.id);
  await page.getByLabel('Answer language').selectOption('en');
  await page.getByRole('button', { name: 'Ask the library', exact: true }).click();
  await expect(page.getByRole('heading', { name: answer.question })).toBeFocused();
  await expect(page.getByText(passage.text, { exact: true })).toBeVisible();
  await expect(page.getByText('Draft text · Not fully proofread')).toBeVisible();
  expect(requests[0]).toEqual({ question: answer.question, editionId: edition.id, responseLang: 'en' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  await page.screenshot({ path: `test-results/library-ai-${width}.png`, fullPage: true });
  await page.getByRole('link', { name: 'Open supporting passage' }).click();
  await expect(page).toHaveURL(/\/reader\/book-test\/edition-test\?passage=passage-test/);
  await expect(page.locator('#text-passage-test')).toBeVisible();
  await expect(page.locator('#text-passage-test')).toHaveClass(/book-focused-passage/);
});

test('no evidence produces an honest empty answer with no reader links', async ({ page }) => {
  await setup(page, { noAnswer: true }); await page.goto('/ask');
  await page.getByLabel('What would you like to understand?').fill('What is the current weather?');
  await page.getByRole('button', { name: 'Ask the library', exact: true }).click();
  await expect(page.getByText('I could not find enough evidence in the available passages.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open supporting passage' })).toHaveCount(0);
});
test('configuration errors retain the question for retry', async ({ page }) => {
  await setup(page, { error: true }); await page.goto('/ask');
  await page.getByLabel('What would you like to understand?').fill('धर्म क्या है?');
  await page.getByRole('button', { name: 'Ask the library', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('GROQ_API_KEY');
  await expect(page.getByLabel('What would you like to understand?')).toHaveValue('धर्म क्या है?');
  await expect(page.getByRole('button', { name: 'Ask the library', exact: true })).toBeEnabled();
});
test('history preserves citations, marks changed sources and can be cleared', async ({ page }) => {
  await setup(page, { history: [{ ...answer, sources: [{ ...answer.sources[0], href: null }] }] });
  await page.goto('/ask');
  await page.getByRole('button', { name: answer.question }).click();
  await expect(page.getByText('This source has changed or is no longer available.', { exact: false })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open supporting passage' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Clear history' }).click();
  await expect(page.getByRole('button', { name: answer.question })).toHaveCount(0);
});
test('index preparation and guest access have explicit states', async ({ page }) => {
  await setup(page, { ready: false }); await page.goto('/ask');
  await page.getByLabel('What would you like to understand?').fill('What is duty?');
  await expect(page.getByRole('button', { name: 'Ask the library', exact: true })).toBeDisabled();
  await expect(page.getByText('The library search index is being prepared.', { exact: false })).toBeVisible();
});
test('guests cannot open the library assistant', async ({ page }) => {
  await setup(page, { guest: true }); await page.goto('/ask');
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByLabel('What would you like to understand?')).toHaveCount(0);
});
