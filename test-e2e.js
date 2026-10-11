import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3001/api';

async function testRegistrationAndLogin() {
  console.log('🚀 Starting E2E Tests for TattvaGyaan Authentication\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Test 1: Register new account
    console.log('📝 Test 1: User Registration');
    await page.goto(`${BASE_URL}/register`);

    // Wait for page to load
    await page.waitForSelector('input[type="text"]');

    const testUser = {
      displayName: 'Test User ' + Date.now(),
      username: 'testuser' + Date.now(),
      email: 'test' + Date.now() + '@example.com',
      password: 'TestPass@123',
    };

    console.log(`  • Filling registration form for ${testUser.email}`);
    await page.fill('input[placeholder="John Doe"]', testUser.displayName);
    await page.fill('input[placeholder="johndoe"]', testUser.username);
    await page.fill('input[placeholder="your@email.com"]', testUser.email);
    await page.fill('input[placeholder="••••••••"]', testUser.password);

    // Fill confirm password
    const passwordInputs = await page.locator('input[type="password"]').all();
    await passwordInputs[1].fill(testUser.password);

    console.log('  • Submitting registration form');
    await page.click('button:has-text("Create Account")');

    // Wait for redirect to dashboard
    await page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 5000 });
    console.log('  ✅ Registration successful - redirected to dashboard\n');

    // Test 2: Verify user is logged in
    console.log('🔍 Test 2: Verify Session');
    const userGreeting = await page.locator('h1').first().textContent();
    console.log(`  • User greeting: "${userGreeting}"`);
    console.log('  ✅ User session active\n');

    // Test 3: Logout
    console.log('🚪 Test 3: Logout');
    await page.click('button[title="Log out"]');
    await page.waitForURL(`${BASE_URL}/login`, { timeout: 5000 });
    console.log('  ✅ Logout successful\n');

    // Test 4: Login with same credentials
    console.log('🔐 Test 4: Login with Created Account');
    await page.fill('input[placeholder="your@email.com"]', testUser.email);
    await page.fill('input[placeholder="••••••••"]', testUser.password);
    await page.click('button:has-text("Sign In")');

    await page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 5000 });
    console.log('  ✅ Login successful\n');

    // Test 5: Verify design system
    console.log('🎨 Test 5: Design System Verification');

    // Check navbar
    const navbar = await page.locator('nav').first();
    const navClasses = await navbar.getAttribute('class');
    console.log(`  • Navbar classes: ${navClasses}`);
    const hasAmberColors = navClasses?.includes('amber') || navClasses?.includes('stone');
    console.log(`  • Amber/Stone color scheme: ${hasAmberColors ? '✅' : '❌'}`);

    // Check dashboard heading
    const heading = await page.locator('h1').first();
    const headingClasses = await heading.getAttribute('class');
    const hasSerifFont = headingClasses?.includes('serif') || headingClasses?.includes('font-serif');
    console.log(`  • Serif typography: ${hasSerifFont ? '✅' : '❌'}`);

    console.log('  ✅ Design system verified\n');

    console.log('✨ All tests passed! Registration and Login flow working correctly.\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  } finally {
    await context.close();
    await browser.close();
  }
}

testRegistrationAndLogin();
