import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const source = JSON.parse(readFileSync(new URL('../../library/documents/rigved-hi.json', import.meta.url), 'utf8'));
const edition = { ...source, id: 'rigveda-scan', scriptureId: 'vedas', contentStatus: 'scanned', expectedPassages: null };
const scripture = { id: 'vedas', title: 'वेद', originalLang: 'Sanskrit', availabilityStatus: 'partial', editions: [edition] };

async function mockCatalog(page, document = source) {
  const scanEdition = { ...edition, ...document };
  const scanScripture = { ...scripture, editions: [scanEdition] };
  const state = { requests: [], progress: null, saves: [], errors: [] };
  page.on('pageerror', error => state.errors.push(error.message));
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const path = new URL(route.request().url()).pathname;
    state.requests.push(path);
    if (path === '/api/auth/me') return route.fulfill({ json: { user: { id: 'reader', username: 'reader' } } });
    if (path === '/api/scriptures/vedas') return route.fulfill({ json: { scripture: scanScripture } });
    if (path === '/api/scripture-editions/rigveda-scan') return route.fulfill({ json: { edition: { ...scanEdition, scripture: scanScripture } } });
    if (path.startsWith('/api/reading-progress')) {
      if (route.request().method() === 'POST') {
        state.progress = route.request().postDataJSON();
        state.saves.push(state.progress);
      }
      return route.fulfill({ json: { progress: state.progress } });
    }
    return route.fulfill({ status: 404, json: { error: 'Unexpected request' } });
  });
  return state;
}

async function jumpToPage(page, number) {
  await page.getByLabel('Page', { exact: true }).fill(String(number));
  await page.getByRole('button', { name: 'Go', exact: true }).click();
}

for (const file of ['rigved-hi', 'manusmriti-hi', 'bal-mahabharat-katha-hi', 'valmiki-ramayana-ramakien-study-hi', 'ramcharitmanas-hi', 'shiva-purana-hi', 'garuda-purana-hi']) {
test(`${file}: an idle scanned page keeps its canvas without blank frames or repeated rendering`, async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const document = JSON.parse(readFileSync(new URL(`../../library/documents/${file}.json`, import.meta.url), 'utf8'));
  await mockCatalog(page, document);
  await page.goto('/reader/vedas/rigveda-scan?page=4');
  // Cold PDF decoding can exceed the default five-second assertion timeout.
  await expect(page.locator('.reader-visible-page .reader-scan canvas')).toHaveCount(2, { timeout: 20000 });
  await expect(page.locator('.reader-visible-page .reader-scan[aria-busy="true"]')).toHaveCount(0, { timeout: 20000 });
  const sample = await page.evaluate(async () => {
    const scans = [...document.querySelectorAll('.reader-visible-page .reader-scan')];
    const original = scans.map(scan => scan.querySelector('canvas'));
    let blankFrames = 0;
    let replacedFrames = 0;
    for (let frame = 0; frame < 120; frame++) {
      await new Promise(requestAnimationFrame);
      if (scans.some(scan => !scan.querySelector('canvas')?.width)) blankFrames++;
      if (scans.some((scan, index) => scan.querySelector('canvas') !== original[index])) replacedFrames++;
    }
    return { blankFrames, replacedFrames };
  });
  expect(sample).toEqual({ blankFrames: 0, replacedFrames: 0 });
});
}

test('Garuda Purana renders JBIG2 text pages with the local decoder', async ({ page }) => {
  const document = JSON.parse(readFileSync(new URL('../../library/documents/garuda-purana-hi.json', import.meta.url), 'utf8'));
  const errors = [];
  page.on('console', message => { if (/Unable to decode image|JBig2 failed/.test(message.text())) errors.push(message.text()); });
  await mockCatalog(page, document);
  const decoder = page.waitForResponse(response => response.url().endsWith('/pdfjs/wasm/jbig2.wasm'));
  await page.goto('/reader/vedas/rigveda-scan?page=12');
  expect((await decoder).ok()).toBeTruthy();
  const scan = page.getByRole('img', { name: 'Scanned page 10', exact: true });
  await expect(scan).toBeVisible();
  const inkFraction = await scan.evaluate(canvas => {
    const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    let darkPixels = 0;
    for (let index = 0; index < pixels.length; index += 4) if (pixels[index] < 120 && pixels[index + 3] > 0) darkPixels++;
    return darkPixels / (canvas.width * canvas.height);
  });
  expect(inkFraction).toBeGreaterThan(0.02); // Watermarks alone must not pass.
  expect(errors).toEqual([]);
  await page.screenshot({ path: 'test-results/garuda-decoded-page.png' });
});

test('zoom and resize retain the painted scan until its replacement is ready', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mockCatalog(page);
  await page.goto('/reader/vedas/rigveda-scan?page=4');
  await expect(page.locator('.reader-visible-page .reader-scan canvas')).toHaveCount(2);
  await expect(page.locator('.reader-visible-page .reader-scan[aria-busy="true"]')).toHaveCount(0);
  await page.evaluate(() => {
    window.blankScanFrames = 0;
    window.monitorScans = true;
    const sample = () => {
      if (!window.monitorScans) return;
      if ([...document.querySelectorAll('.reader-visible-page .reader-scan')].some(scan => !scan.querySelector('canvas')?.width)) window.blankScanFrames++;
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  const scan = page.getByRole('img', { name: 'Scanned page 3', exact: true });
  const originalWidth = await scan.evaluate(canvas => canvas.width);
  await page.getByRole('button', { name: 'Increase page zoom' }).click();
  await expect.poll(() => scan.evaluate(canvas => canvas.width)).toBeGreaterThan(originalWidth);
  const zoomedWidth = await scan.evaluate(canvas => canvas.width);
  await page.setViewportSize({ width: 1300, height: 900 });
  await expect.poll(() => scan.evaluate(canvas => canvas.width)).toBeLessThan(zoomedWidth);
  await expect(page.locator('.reader-visible-page .reader-scan[aria-busy="true"]')).toHaveCount(0);
  expect(await page.evaluate(() => { window.monitorScans = false; return window.blankScanFrames; })).toBe(0);
});

test('Vedas uses the Gita book layout, controls, contents and original scanned pages', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const state = await mockCatalog(page);
  await page.goto('/scripture/vedas');
  await expect(page.getByText('Scanned PDF · Partial collection')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create Reading Plan' })).toBeDisabled();
  await expect(page.getByRole('link', { name: 'Source and attribution' })).toHaveAttribute('href', source.source);
  await page.getByRole('button', { name: 'Start Reading', exact: true }).click();
  await expect(page).toHaveURL(/\/reader\/vedas\/rigveda-scan$/);
  await expect(page.locator('.reader-paper.--left')).toHaveCount(1);
  await expect(page.locator('.reader-paper.--right')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Table of Contents' })).toBeVisible();
  const scan = page.getByRole('img', { name: 'Scanned page 1', exact: true });
  await expect(scan).toBeVisible();
  expect(await scan.evaluate(canvas => {
    const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    return data.some((value, index) => index % 4 === 0 && value < 128);
  })).toBe(true);
  await expect(page.locator('iframe')).toHaveCount(0);
  await expect(page.getByLabel('Page', { exact: true })).toHaveAttribute('max', String(source.pageCount + 2));
  await expect(page.getByRole('button', { name: 'Toggle fullscreen' })).toBeVisible();
  await page.getByLabel('Reading theme').selectOption('sepia');
  await expect(page.locator('.reader-shell')).toHaveClass(/theme-sepia/);
  await page.getByLabel('Reading theme').selectOption('dark');
  await expect(page.locator('.reader-shell')).toHaveClass(/theme-dark/);
  await page.getByLabel('Reading theme').selectOption('light');
  await page.getByRole('button', { name: 'Toggle fullscreen' }).click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement?.classList.contains('reader-shell'))).toBe(true);
  await page.getByRole('button', { name: 'Toggle fullscreen' }).click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
  await page.getByRole('button', { name: 'Contents', exact: true }).click();
  await page.getByRole('dialog', { name: 'contents', exact: true }).getByRole('button', { name: 'Scanned pages 26–50 · 28', exact: true }).click();
  await expect(page.getByRole('img', { name: 'Scanned page 26', exact: true })).toBeVisible();
  await expect(page.locator('.reader-scan canvas')).toHaveCount(2);
  await page.getByRole('button', { name: 'Bookmarks', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'bookmarks' })).toContainText('require verified text');
  await page.getByRole('button', { name: 'Close panel' }).click();
  await page.getByRole('button', { name: 'Notes', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'notes' })).toContainText('require verified text');
  await page.getByRole('button', { name: 'Close panel' }).click();
  await page.screenshot({ path: 'test-results/rigveda-book-desktop.png', fullPage: true });
  await jumpToPage(page, 1);
  await expect(page.getByRole('link', { name: 'Download original PDF' })).toHaveAttribute('href', source.source);
  expect(state.requests.some(path => /passages|bookmarks|notes|ai\//.test(path))).toBe(false);
  expect(state.errors).toEqual([]);
});

test('mobile scans support exact page jumps, zoom, keyboard navigation and saved position', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const state = await mockCatalog(page);
  await page.goto('/reader/vedas/rigveda-scan?page=50');
  await expect(page.getByRole('article', { name: 'Page 50', exact: true })).toBeVisible();
  const scan = page.getByRole('img', { name: 'Scanned page 48', exact: true });
  await expect(scan).toBeVisible();
  await expect(page.locator('.reader-paper')).toHaveCount(1);
  const originalWidth = await scan.evaluate(canvas => canvas.width);
  await page.getByRole('button', { name: 'Increase page zoom' }).click();
  await expect.poll(() => scan.evaluate(canvas => canvas.width)).toBeGreaterThan(originalWidth);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await expect.poll(() => state.progress?.pageIndex).toBe(49);
  await page.goto('/reader/vedas/rigveda-scan');
  await expect(page.getByLabel('Page', { exact: true })).toHaveValue('50');
  await expect(page.getByRole('img', { name: 'Scanned page 48', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByRole('img', { name: 'Scanned page 49', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Previous', exact: true }).click();
  await expect(page.getByLabel('Page', { exact: true })).toHaveValue('50');
  await page.getByLabel('Page', { exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByLabel('Page', { exact: true })).toHaveValue('50');
  await page.getByLabel('Page', { exact: true }).blur();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByLabel('Page', { exact: true })).toHaveValue('51');
  await expect(page.getByRole('img', { name: 'Scanned page 49', exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/rigveda-book-mobile.png', fullPage: true });
  expect(state.errors).toEqual([]);
});

test('the final scan is reachable and rapid navigation does not leave stale canvases', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const state = await mockCatalog(page);
  await page.goto('/reader/vedas/rigveda-scan?page=741');
  await expect(page.getByRole('img', { name: 'Scanned page 739', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
  await expect.poll(() => state.progress?.percentage).toBe(100);
  await jumpToPage(page, 3);
  await jumpToPage(page, 200);
  await jumpToPage(page, 50);
  await expect(page.getByRole('img', { name: 'Scanned page 48', exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Scanned page 49', exact: true })).toBeVisible();
  await expect(page.locator('.reader-scan canvas')).toHaveCount(2);
  await expect.poll(() => state.progress?.pageIndex).toBe(49);
  expect(state.errors).toEqual([]);
});

test('book loading failures are recoverable', async ({ page }) => {
  await mockCatalog(page);
  await page.route('**/library/rigved.pdf', route => route.fulfill({ status: 503, body: 'Unavailable' }));
  await page.goto('/reader/vedas/rigveda-scan');
  await expect(page.getByRole('alert')).toContainText('Unable to load this book');
  await page.unroute('**/library/rigved.pdf');
  await page.getByRole('button', { name: 'Retry book' }).click();
  await expect(page.getByRole('img', { name: 'Scanned page 1', exact: true })).toBeVisible();
});

test('book reader rejects a source outside the local library', async ({ page }) => {
  await mockCatalog(page);
  await page.route('**/api/scripture-editions/rigveda-scan', route => route.fulfill({
    json: { edition: { ...edition, scripture, source: 'https://example.com/untrusted.pdf' } },
  }));
  await page.goto('/reader/vedas/rigveda-scan');
  await expect(page.getByRole('alert')).toHaveText("This edition's PDF is unavailable.");
  await expect(page.locator('iframe, canvas')).toHaveCount(0);
});

test('scanned pages retain their image on the turning sheet', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const state = await mockCatalog(page);
  await page.goto('/reader/vedas/rigveda-scan?page=4');
  await expect(page.getByRole('img', { name: 'Scanned page 3', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.locator('.reader-book')).toHaveAttribute('data-turn-state', 'flipping');
  const sheet = page.locator('.reader-turn-sheet');
  await sheet.evaluate(element => {
    const animation = element.getAnimations()[0];
    animation.pause();
    animation.currentTime = 230;
  });
  expect(await page.locator('.reader-turn-face--front canvas').evaluate(canvas => {
    const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    return pixels.some((value, index) => index % 4 === 0 && value < 128 && pixels[index + 3] > 0);
  })).toBe(true);
  await expect(page.locator('.reader-turn-face--back')).toContainText('Scanned page 4 of 739');
  // Full-page screenshots resize the viewport and intentionally cancel a turn.
  await page.screenshot({ path: 'test-results/rigveda-book-flip.png' });
  await sheet.evaluate(element => element.getAnimations()[0].finish());
  await expect(page.locator('.reader-turn-sheet')).toHaveCount(0);
  await expect(page.getByRole('img', { name: 'Scanned page 4', exact: true })).toBeVisible();
  await expect.poll(() => state.progress?.pageIndex).toBe(5);
  expect(state.errors).toEqual([]);
});
