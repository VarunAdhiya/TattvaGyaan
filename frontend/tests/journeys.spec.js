import { test, expect } from '@playwright/test';
import { journeyDefinitions } from '../src/data/divineJourneys';

const user = { id: 'journey-reader', username: 'traveler', displayName: 'Traveler' };
const progressKey = `tattvagyaan:journey:v1:${user.id}:ganesha`;
const titles = ['A mother’s creation', 'The faithful guardian', 'A new beginning', 'First among beginnings', 'The world within a circle', 'A tusk becomes a pen', 'Wisdom in every detail', 'A presence that stays'];

test.beforeEach(async ({ page }) => {
  await page.route('**/api/auth/me', route => route.fulfill({ json: { user } }));
});

async function settled(page) {
  const world = page.locator('.sacred-world');
  await expect(world).toHaveAttribute('data-ready', 'true', { timeout: 30000 });
  await expect(world).toHaveAttribute('data-moving', 'false', { timeout: 15000 });
  await expect(world).toHaveAttribute('data-art-ready', 'true', { timeout: 30000 });
  return world;
}

async function capture(page, name) {
  await page.evaluate(() => document.fonts.ready);
  await settled(page);
  await page.screenshot({ path: `../.impeccable/review/${name}.png` });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

test('all illustrated chapters are open, neighbouring islands persist, and navigation saves progress', async ({ page }) => {
  test.setTimeout(120000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.stack || error.message));
  page.on('console', message => { if (message.type() === 'error' && /shader|webgl/i.test(message.text())) errors.push(message.text()); });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/journeys/ganesha?level=1');
  const world = await settled(page);
  await expect(world).toHaveAttribute('data-scene-kind', 'devotional-tableau');
  await expect(page.getByRole('button', { name: /^Collect/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Previous chapter' })).toBeDisabled();
  for (let index = 0; index < titles.length; index++) {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(titles[index]);
    await settled(page);
    await expect(world).toHaveAttribute('data-visible-islands', '8');
    await expect(page.locator('[data-world-story]')).toBeVisible();
    await expect(page.locator('[data-world-leader]')).toHaveAttribute('d', /^M /);
    if ([0, 2, 5, 7].includes(index)) await capture(page, `sculpture-chapter-${index + 1}`);
    await page.getByRole('button', { name: index === 7 ? 'Finish journey' : 'Next chapter', exact: true }).click();
  }
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('The journey stayswith you.');
  await expect(page.locator('.journey-collected-petals > span')).toHaveCount(8);
  await page.getByRole('button', { name: 'Walk the path again' }).click();
  await settled(page);
  await page.getByRole('button', { name: `Level 6: ${titles[5]}`, exact: true }).click();
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(titles[5]);
  await settled(page);
  expect(errors).toEqual([]);
});

test('water moves and dragging changes the 3D view', async ({ page }) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/journeys/ganesha?level=7');
  const world = await settled(page);
  const firstTime = await world.getAttribute('data-water-time');
  await expect.poll(() => world.getAttribute('data-water-time')).not.toBe(firstTime);
  const cameraBefore = await world.getAttribute('data-camera-position');
  await page.mouse.move(460, 420);
  await page.mouse.down();
  await page.mouse.move(750, 420, { steps: 12 });
  await page.mouse.up();
  await expect.poll(() => world.getAttribute('data-camera-position')).not.toBe(cameraBefore);
  await expect(world).toHaveAttribute('data-visible-islands', '8');
  await capture(page, 'sculpture-orbit');
});

test('mobile chapters, map, sources and browser history remain usable with reduced motion', async ({ page }) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/journeys/ganesha?level=1');
  const world = await settled(page);
  await expect(world).toHaveAttribute('data-motion', 'paused');
  await capture(page, 'sculpture-mobile');
  const story = await page.locator('[data-world-story]').boundingBox();
  const next = await page.getByRole('button', { name: 'Next chapter', exact: true }).boundingBox();
  expect(story.y + story.height).toBeLessThanOrEqual(next.y);
  await page.getByRole('button', { name: 'Next chapter', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(titles[1]);
  await page.goBack();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(titles[0]);
  await page.getByRole('button', { name: 'Reflection & story source' }).click();
  await expect(page.getByRole('link', { name: /Amritapuri/ })).toBeVisible();
  await page.getByRole('button', { name: 'Explore world map' }).click();
  await capture(page, 'sculpture-map-mobile');
  await page.getByRole('button', { name: `Level 8: ${titles[7]}`, exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(titles[7]);
});

test('no WebGL and unavailable storage still allow direct chapter navigation', async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
      return kind.includes('webgl') ? null : getContext.call(this, kind, ...args);
    };
    Storage.prototype.setItem = () => { throw new DOMException('Storage unavailable', 'QuotaExceededError'); };
  });
  await page.goto('/journeys/ganesha?level=6');
  await expect(page.getByText('3D is unavailable in this browser. You can still explore every chapter.')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(titles[5]);
  await page.getByRole('button', { name: 'Next chapter', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(titles[6]);
  await page.goto('/journeys/krishna?level=6');
  await expect(page.getByText('3D is unavailable in this browser. You can still explore every chapter.')).toBeVisible();
  await page.getByRole('button', { name: 'Next chapter', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Wisdom before the battle');
});

test('progress remains account-specific and journeys preserve the account gate', async ({ page }) => {
  await page.addInitScript(key => localStorage.setItem(key, JSON.stringify({ version: 1, current: 5, completed: ['birth', 'scribe'] })), progressKey);
  await page.goto('/journeys/ganesha');
  await page.getByRole('button', { name: 'Continue your journey', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(titles[5]);
  await page.route('**/api/auth/me', route => route.fulfill({ json: { user: { ...user, id: 'another-reader' } } }));
  await page.goto('/journeys/ganesha');
  await expect(page.getByRole('button', { name: 'Enter the journey', exact: true })).toBeVisible();
  await page.route('**/api/auth/me', route => route.fulfill({ status: 401, json: { error: 'Not signed in' } }));
  await page.goto('/journeys/ganesha?level=3');
  await expect(page).toHaveURL(/\/login$/);
});

const krishnaTitles = ['Hope in the darkness', 'Held in a mother’s love', 'The forest hears a flute', 'Shelter beneath the hill', 'A family set free', 'The wealth of friendship', 'Wisdom before the battle', 'A compassionate farewell'];

test('Krishna has eight distinct scenes, linked sources, open navigation and a completion reflection', async ({ page }) => {
  test.setTimeout(120000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/journeys/krishna');
  await page.getByRole('button', { name: 'Enter the journey', exact: true }).click();
  const world = await settled(page);
  await expect(world).toHaveAttribute('data-deity', 'krishna');
  await expect(page.locator('.game-brand')).toContainText('Krishna’s world');
  const scenes = new Set();
  for (let index = 0; index < krishnaTitles.length; index++) {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(krishnaTitles[index]);
    await settled(page);
    await expect(world).toHaveAttribute('data-visible-islands', '8');
    scenes.add(await world.getAttribute('data-chapter'));
    await page.getByRole('button', { name: 'Reflection & story source' }).click();
    await expect(page.locator('.game-story-details a').first()).toHaveAttribute('href', /^https:\/\/vedabase.io\/en\/library\//);
    await page.getByRole('button', { name: 'Reflection & story source' }).click();
    if ([0, 3, 6, 7].includes(index)) await capture(page, `krishna-desktop-${index + 1}`);
    await page.getByRole('button', { name: index === 7 ? 'Finish journey' : 'Next chapter', exact: true }).click();
  }
  expect(scenes.size).toBe(8);
  await expect(page.locator('.journey-collected-petals > span')).toHaveCount(8);
  await expect(page.locator('.journey-completion .journey-invocation')).toHaveText('जय श्री कृष्ण');
  await page.getByRole('button', { name: 'Walk the path again' }).click();
  await expect(page).toHaveURL(/krishna\?level=1$/);
  expect(errors).toEqual([]);
});

test('switching deities keeps their saved chapters separate, including a reload', async ({ page }) => {
  await page.addInitScript(key => localStorage.setItem(key, JSON.stringify({ version: 1, current: 5, completed: ['birth', 'scribe'] })), progressKey);
  await page.goto('/journeys/ganesha');
  const chooser = page.getByRole('group', { name: 'Choose a deity' });
  await chooser.getByRole('button', { name: /Krishna/ }).click();
  await page.getByRole('button', { name: 'Enter the journey', exact: true }).click();
  await page.getByRole('button', { name: `Level 4: ${krishnaTitles[3]}`, exact: true }).click();
  await page.getByRole('link', { name: 'All deities' }).click();
  await chooser.getByRole('button', { name: /Ganesha/ }).click();
  await page.getByRole('button', { name: 'Continue your journey', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(titles[5]);
  await page.getByRole('link', { name: 'All deities' }).click();
  await chooser.getByRole('button', { name: /Krishna/ }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Continue your journey', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(krishnaTitles[3]);
  const saves = await page.evaluate(keys => keys.map(key => JSON.parse(localStorage.getItem(key))), [progressKey, progressKey.replace(':ganesha', ':krishna')]);
  expect(saves[0].completed).toEqual(['birth', 'scribe']);
  expect(saves[1].completed).toEqual(['mathura-birth', 'govardhan']);
});

test('Krishna mobile map, history and reduced motion work together', async ({ page }) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/journeys/krishna?level=999');
  await expect(page).toHaveURL(/krishna\?level=8$/);
  const world = await settled(page);
  await expect(world).toHaveAttribute('data-motion', 'paused');
  await page.getByRole('button', { name: 'Previous chapter' }).click();
  await capture(page, 'krishna-mobile');
  const story = await page.locator('[data-world-story]').boundingBox();
  const next = await page.getByRole('button', { name: 'Next chapter', exact: true }).boundingBox();
  expect(story.y + story.height).toBeLessThanOrEqual(next.y);
  await page.goBack();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(krishnaTitles[7]);
  await page.getByRole('button', { name: 'Explore world map' }).click();
  await capture(page, 'krishna-map-mobile');
  await page.getByRole('button', { name: 'Visit Hope in the darkness', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(krishnaTitles[0]);
});

for (const deity of ['shiva', 'hanuman', 'ram']) {
  const journey = journeyDefinitions[deity];
  test(`${deity}: all eight scenes, sources and completion are usable`, async ({ page }) => {
    test.setTimeout(120000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`/journeys/${deity}`);
    await expect(page.getByRole('group', { name: 'Choose a deity' }).getByRole('button')).toHaveCount(5);
    await page.getByRole('button', { name: 'Enter the journey', exact: true }).click();
    const world = await settled(page);
    await expect(world).toHaveAttribute('data-deity', deity);
    await expect(page.locator('footer')).toHaveCount(0);
    for (let index = 0; index < journey.levels.length; index++) {
      const chapter = journey.levels[index];
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(chapter.title);
      await settled(page);
      await expect(world).toHaveAttribute('data-visible-islands', '8');
      await expect(world).toHaveAttribute('data-chapter', chapter.id);
      await expect(page.locator('.journey-sr-only').first()).toContainText(chapter.sceneAlt);
      await page.getByRole('button', { name: 'Reflection & story source' }).click();
      await expect(page.locator('.game-story-details a').first()).toHaveAttribute('href', /^https:\/\//);
      await page.getByRole('button', { name: 'Reflection & story source' }).click();
      if ([0, 5, 7].includes(index)) await capture(page, `${deity}-desktop-${index + 1}`);
      await page.getByRole('button', { name: index === 7 ? 'Finish journey' : 'Next chapter', exact: true }).click();
    }
    await expect(page.locator('.journey-collected-petals > span')).toHaveCount(8);
    await expect(page.locator('.journey-completion .journey-invocation')).toHaveText(journey.invocation);
    await page.getByRole('button', { name: 'Walk the path again' }).click();
    await expect(page).toHaveURL(new RegExp(`${deity}\\?level=1$`));
    expect(errors).toEqual([]);
  });

  test(`${deity}: mobile map, history and artwork remain accessible`, async ({ page }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`/journeys/${deity}?level=6`);
    const world = await settled(page);
    await expect(world).toHaveAttribute('data-motion', 'paused');
    await capture(page, `${deity}-mobile`);
    const story = await page.locator('[data-world-story]').boundingBox();
    const next = await page.getByRole('button', { name: 'Next chapter', exact: true }).boundingBox();
    expect(story.y + story.height).toBeLessThanOrEqual(next.y);
    await page.getByRole('button', { name: 'Previous chapter' }).click();
    await page.goBack();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(journey.levels[5].title);
    await page.getByRole('button', { name: 'Explore world map' }).click();
    await settled(page);
    await expect(page.locator('.world-pin:visible')).toHaveCount(8);
    await page.getByRole('button', { name: `Visit ${journey.levels[7].title}`, exact: true }).click();
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(journey.levels[7].title);
  });
}

test('all five deity choices fit on a small phone and retain independent progress', async ({ page }) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 320, height: 800 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/journeys/ram');
  await page.screenshot({ path: '../.impeccable/review/five-deities-mobile.png', fullPage: true });
  const ids = ['ganesha', 'shiva', 'krishna', 'hanuman', 'ram'];
  for (let index = 0; index < ids.length; index++) {
    const id = ids[index];
    const choice = page.getByRole('group', { name: 'Choose a deity' }).getByRole('button').nth(index);
    const bounds = await choice.boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(320);
    expect(bounds.height).toBeGreaterThanOrEqual(44);
    await choice.click();
    await expect(page).toHaveURL(new RegExp(`/journeys/${id}$`));
    await expect(choice).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Enter the journey', exact: true }).click();
    await page.getByRole('button', { name: `Level ${index + 2}: ${journeyDefinitions[id].levels[index + 1].title}`, exact: true }).click();
    await page.getByRole('link', { name: 'All deities' }).click();
  }
  const saves = await page.evaluate(({ ids, userId }) => ids.map(id => JSON.parse(localStorage.getItem(`tattvagyaan:journey:v1:${userId}:${id}`))), { ids, userId: user.id });
  for (let index = 0; index < ids.length; index++) {
    expect(saves[index].current).toBe(index + 1);
    expect(saves[index].completed).toEqual([journeyDefinitions[ids[index]].levels[0].id, journeyDefinitions[ids[index]].levels[index + 1].id]);
  }
  await page.reload();
  await page.getByRole('button', { name: 'Continue your journey', exact: true }).click();
  await expect(page).toHaveURL(/ram\?level=6$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('new journeys preserve fallback navigation and the authentication gate', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
      return kind.includes('webgl') ? null : original.call(this, kind, ...args);
    };
  });
  for (const deity of ['shiva', 'hanuman', 'ram']) {
    await page.goto(`/journeys/${deity}?level=4`);
    await expect(page.getByText('3D is unavailable in this browser. You can still explore every chapter.')).toBeVisible();
    await page.getByRole('button', { name: 'Next chapter', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(journeyDefinitions[deity].levels[4].title);
  }
  await page.route('**/api/auth/me', route => route.fulfill({ status: 401, json: { error: 'Not signed in' } }));
  await page.goto('/journeys/ram?level=1');
  await expect(page).toHaveURL(/\/login$/);
});
