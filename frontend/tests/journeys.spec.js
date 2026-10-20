import { test, expect } from '@playwright/test';

const user = { id: 'journey-reader', username: 'traveler', displayName: 'Traveler' };
const progressKey = `tattvagyaan:journey:v1:${user.id}:ganesha`;
const titles = ['A mother’s creation', 'The faithful guardian', 'A new beginning', 'First among beginnings', 'The world within a circle', 'A tusk becomes a pen', 'Wisdom in every detail', 'A presence that stays'];

test.beforeEach(async ({ page }) => {
  await page.route('**/api/auth/me', route => route.fulfill({ json: { user } }));
});

async function capture(page, name) {
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('.journey-scene > img')).toHaveClass('is-loaded');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `../.impeccable/review/${name}.png`, fullPage: true, animations: 'disabled' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

test('all chapters unlock, navigation persists, and completion can be revisited', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/journeys');
  await expect(page).toHaveURL(/\/journeys\/ganesha$/);
  await expect(page.getByRole('button', { name: /Level 2:/ })).toBeDisabled();
  await capture(page, 'journey-entrance-desktop');
  await page.getByRole('button', { name: 'Enter the journey', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Previous', exact: true })).toBeDisabled();
  await capture(page, 'journey-birth-desktop');
  for (let index = 0; index < titles.length; index++) {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(titles[index]);
    const next = page.getByRole('button', { name: index === 7 ? 'Complete journey' : 'Next chapter' });
    await expect(next).toBeDisabled();
    await page.getByRole('button', { name: /^Collect the/ }).click();
    await expect(page.getByRole('button', { name: /petal collected$/ })).toBeDisabled();
    await expect(next).toBeEnabled();
    if (index === 1) {
      await page.reload();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(titles[1]);
      await page.getByRole('button', { name: 'Previous', exact: true }).click();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(titles[0]);
      await page.getByRole('button', { name: 'Next chapter' }).click();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(titles[1]);
      await page.getByRole('button', { name: 'Your journey map' }).click();
      await expect(page.getByRole('button', { name: /Level 1:.*completed/ })).toBeEnabled();
      await expect(page.getByRole('button', { name: /Level 4:/ })).toBeDisabled();
    }
    if (index === 4) await capture(page, 'journey-family-desktop');
    await next.click();
  }
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('The journey stayswith you.');
  await capture(page, 'journey-complete-desktop');
  await page.reload();
  await expect(page.locator('.journey-collected-petals > span')).toHaveCount(8);
  await page.getByRole('button', { name: 'Walk the path again' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(titles[0]);
  await expect(page.getByRole('progressbar')).toHaveAttribute('value', '8');
  expect(errors).toEqual([]);
});

test('mobile deity selection, reading, reduced motion and browser history work', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/journeys/ganesha');
  await expect(page.getByRole('button', { name: 'Enable scene motion' })).toHaveAttribute('aria-pressed', 'true');
  await capture(page, 'journey-entrance-mobile');
  for (const [name, path] of [['Shiva', 'shiva'], ['Krishna', 'krishna'], ['Hanuman', 'hanuman']]) {
    await page.getByRole('group', { name: 'Choose a deity' }).getByRole('button', { name: new RegExp(name) }).click();
    await expect(page).toHaveURL(new RegExp(`/journeys/${path}$`));
    await expect(page.getByRole('heading', { level: 1 })).toContainText(name);
    await expect(page.locator('.journey-coming')).toBeVisible();
    await expect(page.locator('.journey-entrance .journey-primary')).toHaveAttribute('href', /\/(mantras|bhajans|chalisas)/);
  }
  await page.getByRole('group', { name: 'Choose a deity' }).getByRole('button', { name: /Ganesha/ }).click();
  await page.getByRole('button', { name: 'Enter the journey', exact: true }).click();
  await capture(page, 'journey-birth-mobile');
  await page.getByRole('button', { name: /^Collect the/ }).click();
  await page.getByRole('button', { name: 'Next chapter' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(titles[1]);
  await page.goBack();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(titles[0]);
  await page.getByText('About this telling', { exact: true }).click();
  await expect(page.getByRole('link', { name: /Amritapuri/ })).toBeVisible();
  await page.getByRole('button', { name: 'Your journey map' }).click();
  await capture(page, 'journey-map-mobile');
  await page.getByRole('button', { name: 'Ring temple bell' }).click();
  await expect(page.locator('.journey-sr-only')).toContainText(/Temple bell/);
});

test('corrupt saves, locked deep links, unknown deities and missing images recover', async ({ page }) => {
  await page.addInitScript(key => localStorage.setItem(key, '{"version":1,"current":100,"completed":["presence","fake"]}'), progressKey);
  await page.goto('/journeys/ganesha?level=8');
  await expect(page).toHaveURL(/level=1$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(titles[0]);
  await page.goto('/journeys/unknown');
  await expect(page.getByRole('heading', { name: 'Choose a divine journey' })).toBeVisible();
  await page.route('**/journeys/ganesha.png', route => route.abort());
  await page.goto('/journeys/ganesha');
  await expect(page.getByText('The scene could not load. Your story is still available.')).toBeVisible();
  await page.getByRole('button', { name: 'Enter the journey', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(titles[0]);
});

test('unavailable storage does not block the journey and accounts have separate progress', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new DOMException('Storage unavailable', 'QuotaExceededError'); };
  });
  await page.goto('/journeys/ganesha');
  await expect(page.getByRole('status').filter({ hasText: 'Browser storage is unavailable' })).toBeVisible();
  await page.getByRole('button', { name: 'Enter the journey', exact: true }).click();
  await page.getByRole('button', { name: /^Collect the/ }).click();
  await page.getByRole('button', { name: 'Next chapter' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(titles[1]);
  await page.route('**/api/auth/me', route => route.fulfill({ json: { user: { ...user, id: 'another-reader' } } }));
  await page.reload();
  await expect(page).toHaveURL(/level=1$/);
  await expect(page.getByRole('button', { name: 'Next chapter' })).toBeDisabled();
});

test('journeys preserve the account gate', async ({ page }) => {
  await page.route('**/api/auth/me', route => route.fulfill({ status: 401, json: { error: 'Not signed in' } }));
  await page.goto('/journeys/ganesha?level=3');
  await expect(page).toHaveURL(/\/login$/);
});
