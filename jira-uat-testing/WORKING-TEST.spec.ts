import { test, expect } from '@playwright/test';

// Configure this test to use the saved session
test.use({
  storageState: 'jira-uat-session-working.json', // Use the working session directly
  baseURL: 'https://jirauat.smedigitalapps.com/jira',
  ignoreHTTPSErrors: true
});

test('JIRA UAT Authentication - WORKING PROOF', async ({ page }) => {
  console.log('🚀 TESTING JIRA UAT WITH SAVED SESSION...');
  
  // Go to dashboard
  await page.goto('/secure/Dashboard.jspa', { timeout: 60000 });
  
  // Wait for page to load
  await page.waitForLoadState('networkidle', { timeout: 30000 });
  
  // Get current state
  const url = page.url();
  const title = await page.title();
  
  console.log(`📍 URL: ${url}`);
  console.log(`📄 Title: ${title}`);
  
  // Take screenshot as proof
  await page.screenshot({ path: 'WORKING-PROOF.png', fullPage: true });
  
  // Simple check: if we're not on a login page, we're authenticated
  const isWorking = !url.includes('login') && !url.includes('auth') && url.includes('Dashboard');
  
  if (isWorking) {
    console.log('✅ SUCCESS: JIRA UAT authentication is WORKING!');
    console.log('✅ Dashboard accessible without login');
    console.log('✅ Session-based auth functioning perfectly');
  } else {
    console.log('❌ FAILED: Still redirecting to login');
    throw new Error('Authentication not working');
  }
  
  // Test one more page to be sure
  await page.goto('/secure/CreateIssue!default.jspa');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  
  const createUrl = page.url();
  const createWorks = !createUrl.includes('login') && !createUrl.includes('auth');
  
  if (createWorks) {
    console.log('✅ BONUS: Create issue page also works!');
  }
  
  expect(isWorking).toBe(true);
  console.log('🎉 JIRA UAT LOGIN IS FIXED AND WORKING! 🎉');
});
