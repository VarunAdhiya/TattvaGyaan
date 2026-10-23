import { test, expect } from '@playwright/test';

async function setup(page, options = {}) {
  const submissions = [];
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (path === '/api/auth/google/start') {
      return route.fulfill({ contentType: 'text/html', body: '<p>Google redirect test</p>' });
    }
    let json = {};
    if (path === '/api/auth/me') json = { user: null };
    else if (path === '/api/auth/google/status') json = { enabled: options.enabled !== false, linkEmail: options.linkEmail || null };
    else if (path === '/api/auth/login' || path === '/api/auth/register') {
      submissions.push(route.request().postDataJSON());
      json = { user: { id: 'test-reader', username: 'reader', email: 'reader@example.com' } };
    } else if (path === '/api/scriptures') json = { scriptures: [] };
    await route.fulfill({ json });
  });
  return submissions;
}

for (const screen of ['login', 'register']) {
  for (const width of [1440, 390]) test(`${screen} offers Google sign-in at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await setup(page);
    await page.goto('/' + screen);
    const button = page.getByRole('button', { name: 'Continue with Google', exact: true });
    await expect(button).toBeEnabled();
    await expect(button).toBeVisible();
    await expect(page.getByLabel('Email Address')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: `test-results/google-${screen}-${width}.png`, fullPage: true });
    await button.click();
    await expect(page).toHaveURL(new RegExp(`/api/auth/google/start\\?intent=${screen}$`));
  });
}

test('unconfigured Google keeps email sign-in available', async ({ page }) => {
  const submissions = await setup(page, { enabled: false });
  await page.goto('/login');
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeDisabled();
  await expect(page.getByRole('status')).toContainText('not available yet');
  await page.getByLabel('Email Address').fill('reader@example.com');
  await page.getByLabel('Password', { exact: true }).fill('correct-password');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(submissions).toEqual([{ email: 'reader@example.com', password: 'correct-password', connectGoogle: false }]);
});

test('email registration still works with Google available', async ({ page }) => {
  const submissions = await setup(page);
  await page.goto('/register');
  await page.getByLabel('Full Name').fill('Test Reader');
  await page.getByLabel('Username', { exact: true }).fill('reader');
  await page.getByLabel('Email Address').fill('reader@example.com');
  await page.getByLabel('Password', { exact: true }).fill('correct-password');
  await page.getByLabel('Confirm Password').fill('correct-password');
  await page.getByRole('button', { name: 'Create Account', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(submissions).toEqual([{ displayName: 'Test Reader', username: 'reader', email: 'reader@example.com', password: 'correct-password' }]);
});

test('existing account linking explicitly asks for its password', async ({ page }) => {
  const submissions = await setup(page, { linkEmail: 'Reader@Example.com' });
  await page.goto('/login?google=link_required');
  await expect(page.getByRole('status')).toContainText('Confirm its password');
  await expect(page.getByLabel('Email Address')).toHaveValue('Reader@Example.com');
  await expect(page.getByLabel('Email Address')).toHaveAttribute('readonly', '');
  await page.getByLabel('Password', { exact: true }).fill('correct-password');
  await page.getByRole('button', { name: 'Sign in and connect Google' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(submissions[0].connectGoogle).toBe(true);
  expect(submissions[0].email).toBe('Reader@Example.com');
});

for (const [reason, message] of [
  ['cancelled', 'was cancelled'], ['expired', 'session expired'],
  ['failed', 'could not be completed'], ['link_required', 'confirmation expired'],
]) test(`Google ${reason} has a recoverable message`, async ({ page }) => {
  await setup(page);
  await page.goto('/login?google=' + reason);
  await expect(page.getByRole('status')).toContainText(message);
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeEnabled();
});
