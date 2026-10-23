import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const snapshot = JSON.parse(readFileSync(new URL('../../library/devotionals/hinduaarti-2026.json', import.meta.url), 'utf8'));
const user = { id: 'theme-reader', username: 'reader', displayName: 'Test Reader', email: 'reader@example.com' };
const scriptures = ['Bhagavad Gita', 'Mahabharat', 'Ramayan'].map((title, index) => ({
  id: `book-${index}`, title, originalLang: 'Hindi', availabilityStatus: 'complete',
  description: 'Hindi edition available in the scripture library.', religion: { name: 'Hinduism' },
  editions: [{ id: `edition-${index}`, title: 'Hindi edition', language: 'hi' }],
}));

async function textContrastIssues(page) {
  return page.locator('.workspace-route main').evaluateAll(roots => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    function rgba(color) {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      return [...context.getImageData(0, 0, 1, 1).data];
    }
    function background(element) {
      if (!element) return [25, 23, 21];
      const color = rgba(getComputedStyle(element).backgroundColor);
      const alpha = color[3] / 255;
      const behind = alpha === 1 ? color : background(element.parentElement);
      return color.slice(0, 3).map((value, i) => value * alpha + behind[i] * (1 - alpha));
    }
    function luminance(color) {
      const channels = color.slice(0, 3).map(value => {
        const s = value / 255;
        return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4;
      });
      return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
    }
    return roots.flatMap(root => [...root.querySelectorAll('p, span, h1, h2, h3, label, a, button, input, select, dt, dd')]).flatMap(element => {
      const style = getComputedStyle(element);
      const bounds = element.getBoundingClientRect();
      if (element.children.length || !bounds.width || bounds.height < 10 || element.disabled || style.visibility === 'hidden') return [];
      const text = element.textContent.trim() || element.getAttribute('placeholder');
      if (!text) return [];
      const foreground = element.matches('input[placeholder]') ? getComputedStyle(element, '::placeholder').color : style.color;
      const levels = [luminance(rgba(foreground)), luminance(background(element))].sort((a, b) => a - b);
      const ratio = (levels[1] + .05) / (levels[0] + .05);
      const large = parseFloat(style.fontSize) >= 24 || (parseFloat(style.fontSize) >= 18.66 && Number(style.fontWeight) >= 700);
      return ratio >= (large ? 3 : 4.5) ? [] : [{ text: text.slice(0, 55), ratio: ratio.toFixed(2), foreground }];
    });
  });
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-21T06:00:00Z'));
  await page.route(url => url.pathname.startsWith('/api/'), route => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (path === '/api/auth/me' || path === '/api/auth/profile') return route.fulfill({ json: { user } });
    if (path === '/api/scriptures') return route.fulfill({ json: { scriptures, pagination: { total: 3, totalPages: 1 } } });
    if (path.startsWith('/api/scriptures/')) return route.fulfill({ json: { scripture: scriptures[0] } });
    if (path === '/api/devotionals/calendar') return route.fulfill({ json: { days: snapshot.days.filter(day => day.date.startsWith('2026-10')), availableFrom: '2026-01-01', availableTo: '2026-12-31' } });
    if (path === '/api/devotionals') {
      const texts = snapshot.texts.filter(text => text.category === url.searchParams.get('category')).slice(0, 3);
      return route.fulfill({ json: { texts, deities: [...new Set(texts.map(text => text.deity))].map(name => ({ name, count: texts.filter(text => text.deity === name).length })), total: texts.length, page: 1, pages: 1 } });
    }
    if (path.startsWith('/api/devotionals/')) {
      const text = snapshot.texts.find(text => text.slug === path.split('/').pop());
      return route.fulfill({ json: { text, related: snapshot.texts.filter(item => item.category === text.category && item.id !== text.id).slice(0, 3) } });
    }
    return route.fulfill({ json: { plans: [], bookmarks: [], notes: [], religions: [] } });
  });
});

for (const width of [1440, 390]) {
  test(`shared pages keep the dashboard palette and navigation at ${width}px`, async ({ page }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width, height: 1000 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const routes = [
      ['/library', '.scripture-card'], ['/chalisas', '.dev-card'], ['/bhajans', '.dev-card'],
      ['/mantras', '.dev-card'], ['/chalisas/hanuman-chalisa', '.dev-prayer-text'],
      ['/calendar?year=2026&month=10', '.dev-calendar-day'], ['/scripture/book-0', '.scripture-detail-page'],
      ['/reading-plans', '.sacred-page'], ['/profile', '.profile-statistics'], ['/journeys/ganesha', '.journey-entrance'],
    ];
    for (const [path, ready] of routes) {
      await page.goto(path);
      await expect(page.locator(ready).first()).toBeVisible();
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all([...document.querySelectorAll('img')].map(image => { image.loading = 'eager'; return image.decode(); }));
        await Promise.all(document.getAnimations().filter(animation => animation.effect.getTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => {})));
      });
      await expect(page.locator('.site-header')).toHaveCSS('background-color', 'rgb(27, 23, 20)');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), path).toBe(true);
      if (width < 1200) await page.getByRole('button', { name: 'Open navigation' }).click();
      const tab = page.getByRole('navigation', { name: width < 1200 ? 'Mobile navigation' : 'Main navigation' }).getByRole('link', { name: 'Calendar', exact: true });
      await expect(tab).toBeInViewport();
      if (width < 1200) { await tab.focus(); await page.keyboard.press('Escape'); }
      expect(await textContrastIssues(page), path).toEqual([]);
      const name = path.split('?')[0].split('/').filter(Boolean).join('-');
      await page.screenshot({ path: `../.impeccable/review/theme-${name}-${width}.png`, fullPage: true });
    }
    expect(errors).toEqual([]);
  });
}

test('prayer and calendar controls keep source text and selected state through theme changes', async ({ page }) => {
  await page.goto('/chalisas/hanuman-chalisa');
  const source = snapshot.texts.find(text => text.slug === 'hanuman-chalisa');
  const reader = page.locator('.dev-prayer-text');
  await expect(reader).toHaveAttribute('lang', 'hi');
  expect((await reader.locator('p').allTextContents()).join('\n\n')).toBe(source.hindi);
  await page.getByRole('button', { name: 'Transliteration', exact: true }).click();
  expect((await reader.locator('p').allTextContents()).join('\n\n')).toBe(source.transliteration);
  await page.getByRole('button', { name: 'Increase text size' }).click();
  await expect(reader).toHaveCSS('font-size', '24px');
  await page.getByRole('button', { name: 'Reading mode', exact: true }).click();
  await expect(page.locator('.dev-related')).toHaveCount(0);
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Calendar', exact: true }).click();
  await page.locator('.dev-calendar-day').filter({ has: page.locator('.dev-day-number', { hasText: /^22$/ }) }).click();
  await expect(page).toHaveURL(/day=2026-10-22/);
  await expect(page.getByRole('complementary', { name: 'Selected day Panchang' })).toContainText('22 October 2026');
});

test('shared header keeps search accessible and marks the current section', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/mantras');
  await expect(page.locator('.site-header')).toHaveCount(1);
  const navigation = page.getByRole('navigation', { name: 'Main navigation' });
  await expect(navigation.getByRole('link')).toHaveCount(7);
  await expect(navigation.getByRole('link', { name: 'Ask the library', exact: true })).toHaveAttribute('href', '/ask');
  await expect(navigation.getByRole('link', { name: 'Mantras', exact: true })).toHaveAttribute('aria-current', 'page');
  await page.getByRole('button', { name: 'Search scriptures' }).click();
  const search = page.getByRole('textbox', { name: 'Search library' });
  await expect(search).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(search).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Search scriptures' })).toBeFocused();
  await page.getByRole('button', { name: 'Search scriptures' }).click();
  await search.fill('Mahabharat');
  await search.press('Enter');
  await expect(page).toHaveURL(/\/library\?search=Mahabharat$/);
  await expect(search).toHaveCount(0);
  await expect(page.getByRole('searchbox', { name: 'Search books' })).toHaveValue('Mahabharat');
});

test('cards lift smoothly, respect reduced motion, and collection introductions stay centered', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/chalisas');
  const card = page.locator('.dev-card').first();
  await expect(card).toBeVisible();
  await expect(card).toHaveCSS('transition-property', 'transform, border-color, background-color');
  await expect(card.locator('h2')).toHaveCSS('font-size', '28px');
  await card.hover();
  await expect(card.locator('.dev-card-art img')).toHaveJSProperty('naturalWidth', 1536);
  await expect(card).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, -4)');
  await expect(card.locator('h2')).toHaveCSS('color', 'rgb(242, 203, 146)');
  await page.mouse.move(0, 0);
  await expect(card).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await card.hover();
  await expect(card).toHaveCSS('transform', 'none');
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    const heading = page.locator('.dev-collection-heading');
    await expect(heading.locator('img')).toHaveCount(0);
    await expect(heading).toHaveCSS('text-align', 'center');
    const bounds = await heading.boundingBox();
    const description = await heading.locator('.dev-description').boundingBox();
    expect(Math.abs(description.x + description.width / 2 - bounds.x - bounds.width / 2)).toBeLessThan(1);
  }
});

test('each prayer card uses its own full-resolution image across collections', async ({ page }) => {
  for (const path of ['/chalisas', '/bhajans', '/mantras']) {
    await page.goto(path);
    const cards = page.locator('.dev-card');
    await expect(cards.first()).toBeVisible();
    const sources = [];
    for (const card of await cards.all()) {
      const slug = (await card.getAttribute('href')).split('/').pop();
      const artwork = card.locator('img');
      await expect(artwork).toHaveAttribute('src', `/devotional-artwork/${slug}.png`);
      await expect(artwork).toHaveAttribute('loading', 'lazy');
      await artwork.evaluate(async image => { image.loading = 'eager'; await image.decode(); });
      await expect(artwork).toHaveJSProperty('naturalWidth', 1536);
      await expect(artwork).toHaveJSProperty('naturalHeight', 1024);
      sources.push(await artwork.getAttribute('src'));
    }
    expect(new Set(sources).size).toBe(sources.length);
  }
});
