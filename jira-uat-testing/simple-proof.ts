import { test, expect } from '@playwright/test';

test('PROVE authentication works', async ({ page }) => {
  console.log('🔍 TESTING AUTHENTICATION WITH SAVED SESSION...');
  
  // Navigate to JIRA UAT dashboard
  await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa', { timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  
  // Take screenshot
  await page.screenshot({ 
    path: 'jira-uat-testing/proof-dashboard.png',
    fullPage: true 
  });
  
  // Get URL and title
  const currentUrl = page.url();
  const title = await page.title();
  
  console.log(`📄 Current URL: ${currentUrl}`);
  console.log(`📄 Page title: ${title}`);
  
  // Check if we're authenticated
  const isAuthenticated = !currentUrl.includes('login') && !currentUrl.includes('auth');
  
  if (isAuthenticated) {
    console.log('✅ SUCCESS: Authentication works! Dashboard accessible.');
  } else {
    console.log('❌ FAILED: Redirected to login page.');
  }
  
  // Try create issue page
  await page.goto('https://jirauat.smedigitalapps.com/jira/secure/CreateIssue!default.jspa', { timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  
  await page.screenshot({ 
    path: 'jira-uat-testing/proof-create-issue.png',
    fullPage: true 
  });
  
  const createUrl = page.url();
  console.log(`📄 Create Issue URL: ${createUrl}`);
  
  const canAccessCreate = !createUrl.includes('login') && !createUrl.includes('auth');
  
  if (canAccessCreate) {
    console.log('✅ SUCCESS: Can access ticket creation!');
  } else {
    console.log('❌ FAILED: Cannot access ticket creation.');
  }
  
  expect(isAuthenticated && canAccessCreate, 'Should be fully authenticated').toBe(true);
});