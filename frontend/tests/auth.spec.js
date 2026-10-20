import { test, expect } from '@playwright/test';

test('registration keeps validation and input values through a failed request, then opens the dashboard', async ({ page }) => {
  await page.route('**/api/auth/me', route => route.fulfill({ status: 401, json: { error: 'Sign in' } }));
  let available = false;
  let submitted;
  await page.route('**/api/auth/register', route => {
    submitted = route.request().postDataJSON();
    return route.fulfill(available
      ? { json: { user: { id: 'test-reader', username: 'reader', displayName: 'Test Reader' } } }
      : { status: 503, json: { error: 'Please try again shortly.' } });
  });
  await page.route('**/api/devotionals/calendar?*', route => route.fulfill({ json: { days: [] } }));
  await page.goto('/login');
  await page.getByRole('navigation', { name: 'Account access' }).getByRole('link', { name: 'Create Account' }).click();
  await expect(page).toHaveURL(/\/register$/);
  await page.getByLabel('Full Name').fill('Test Reader');
  await page.getByLabel('Username', { exact: true }).fill('reader');
  await page.getByLabel('Email Address').fill('reader@example.com');
  await page.getByLabel('Password', { exact: true }).fill('test-password');
  const submit = page.getByRole('button', { name: 'Create Account', exact: true });
  await expect(submit).toBeDisabled();
  await page.getByLabel('Confirm Password').fill('test-password');
  await submit.click();
  await expect(page.getByRole('alert')).toContainText('Please try again shortly.');
  await expect(page.getByLabel('Email Address')).toHaveValue('reader@example.com');
  available = true;
  await submit.click();
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(submitted).toEqual({
    displayName: 'Test Reader', username: 'reader', email: 'reader@example.com', password: 'test-password',
  });
});

test('login shows server errors without losing credentials and allows switching account screens', async ({ page }) => {
  await page.route('**/api/auth/me', route => route.fulfill({ status: 401, json: { error: 'Sign in' } }));
  await page.route('**/api/auth/login', route => route.fulfill({ status: 401, json: { error: 'Incorrect email or password.' } }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/login');
  await page.getByLabel('Email Address').fill('reader@example.com');
  await page.getByLabel('Password', { exact: true }).fill('wrong-password');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page.getByRole('alert')).toContainText('Incorrect email or password.');
  await expect(page.getByLabel('Email Address')).toHaveValue('reader@example.com');
  await page.getByRole('navigation', { name: 'Account access' }).getByRole('link', { name: 'Create Account' }).click();
  await expect(page.getByRole('navigation', { name: 'Account access' }).getByRole('link', { name: 'Create Account' })).toHaveAttribute('aria-current', 'page');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
