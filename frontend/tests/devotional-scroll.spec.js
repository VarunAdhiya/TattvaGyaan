import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const snapshot = JSON.parse(readFileSync(new URL('../../library/devotionals/hinduaarti-2026.json', import.meta.url), 'utf8'));

for (const [category, path, slug] of [
  ['chalisa', 'chalisas', 'hanuman-chalisa'],
  ['bhajan', 'bhajans', 'raghupati-raghav'],
  ['mantra', 'mantras', 'gayatri-mantra'],
]) {
  test(`${category} scroll preserves passages and reading controls on desktop and mobile`, async ({ page }) => {
    const source = snapshot.texts.find(text => text.slug === slug);
    await page.route('**/api/auth/me', route => route.fulfill({ json: { user: { id: 'reader', username: 'reader' } } }));
    await page.route(`**/api/devotionals/${category}/${slug}`, route => route.fulfill({ json: { text: source, related: [] } }));
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`/${path}/${slug}`);
    const reader = page.locator('.dev-prayer-text');
    await expect(reader).toHaveAttribute('lang', 'hi');
    expect((await reader.locator('p').allTextContents()).join('\n\n')).toBe(source.hindi);
    expect(await page.locator('.dev-scroll-paper').evaluate(async element => {
      const url = getComputedStyle(element).borderImageSource.match(/url\(["']?(.*?)["']?\)/)[1];
      const image = new Image();
      image.src = url;
      await image.decode();
      return image.naturalWidth;
    })).toBeGreaterThanOrEqual(1400);
    await expect(reader).toHaveCSS('color', 'rgb(67, 38, 18)');
    if (category === 'mantra') await page.screenshot({ path: 'test-results/scroll-desktop.png', fullPage: true });
    await page.getByRole('button', { name: 'Transliteration', exact: true }).click();
    expect((await reader.locator('p').allTextContents()).join('\n\n')).toBe(source.transliteration);
    await page.getByRole('button', { name: 'Reading mode', exact: true }).click();
    await expect(page.locator('.dev-related')).toHaveCount(0);
    await page.getByRole('button', { name: 'Reading mode', exact: true }).click();
    await expect(page.locator('.dev-related')).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'हिन्दी', exact: true }).click();
    if (category === 'mantra') await page.screenshot({ path: 'test-results/scroll-mobile.png', fullPage: true });
    for (let i = 0; i < 6; i++) await page.getByRole('button', { name: 'Increase text size' }).click();
    await expect(reader).toHaveCSS('font-size', '34px');
    await expect(page.getByRole('button', { name: 'Increase text size' })).toBeDisabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await reader.locator('p').allTextContents()).join('\n\n')).toBe(source.hindi);
  });
}
