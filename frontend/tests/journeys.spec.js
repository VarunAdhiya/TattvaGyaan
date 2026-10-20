import { test, expect } from '@playwright/test';

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
  return world;
}

async function capture(page, name) {
  await page.evaluate(() => document.fonts.ready);
  await settled(page);
  await page.screenshot({ path: `../.impeccable/review/${name}.png` });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

test('all sculptural chapters are open, descriptions follow the island, and navigation persists', async ({ page }) => {
  test.setTimeout(120000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.stack || error.message));
  page.on('console', message => { if (message.type() === 'error' && /shader|webgl/i.test(message.text())) errors.push(message.text()); });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/journeys/ganesha?level=1');
  const world = await settled(page);
  await expect(world).toHaveAttribute('data-scene-kind', 'sculptural-diorama');
  await expect(page.getByRole('button', { name: /^Collect/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Previous chapter' })).toBeDisabled();
  for (let index = 0; index < titles.length; index++) {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(titles[index]);
    await settled(page);
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

test('water moves, pause freezes the scene, and dragging changes the 3D view', async ({ page }) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/journeys/ganesha?level=7');
  const world = await settled(page);
  const firstTime = await world.getAttribute('data-water-time');
  await expect.poll(() => world.getAttribute('data-water-time')).not.toBe(firstTime);
  await page.getByRole('button', { name: 'Pause scene motion' }).click();
  await expect(world).toHaveAttribute('data-motion', 'paused');
  const pausedTime = await world.getAttribute('data-water-time');
  await page.waitForTimeout(200);
  await expect(world).toHaveAttribute('data-water-time', pausedTime);
  const cameraBefore = await world.getAttribute('data-camera-position');
  await page.mouse.move(460, 420);
  await page.mouse.down();
  await page.mouse.move(750, 420, { steps: 12 });
  await page.mouse.up();
  await expect.poll(() => world.getAttribute('data-camera-position')).not.toBe(cameraBefore);
  await capture(page, 'sculpture-orbit');
  await page.getByRole('button', { name: 'Enable scene motion' }).click();
  await expect.poll(() => world.getAttribute('data-water-time')).not.toBe(pausedTime);
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
  await page.getByRole('button', { name: 'View illustration' }).click();
  await expect(page.locator('.game-art-dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Close scene' }).click();
  await expect(page.getByRole('button', { name: 'View illustration' })).toBeFocused();
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
