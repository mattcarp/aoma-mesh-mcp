import { test, expect } from '@playwright/test';

test.describe('Simple Authentication Test - Using Working Session', () => {
  
  test('✅ PASS: Can access JIRA UAT with working session', async ({ page }) => {
    console.log('🔐 Testing with working session file...');
    
    // Navigate to dashboard
    await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa', { timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    // Take screenshot
    await page.screenshot({ 
      path: 'jira-uat-testing/screenshots/working-session-test.png',
      fullPage: true 
    });
    
    // Check URL and title
    const currentUrl = page.url();
    const title = await page.title();
    
    console.log(`🌐 Current URL: ${currentUrl}`);
    console.log(`📄 Page title: ${title}`);
    
    // Verify we're not redirected to login
    const isAuthenticated = !currentUrl.includes('login') && !currentUrl.includes('auth');
    
    if (isAuthenticated) {
      console.log('✅ SUCCESS: Working session allows access to JIRA UAT!');
      expect(true, 'Should be authenticated with working session').toBe(true);
    } else {
      console.log('❌ FAILURE: Working session expired or invalid');
      expect(false, 'Working session should provide authentication').toBe(true);
    }
  });

  test('✅ PASS: Can access ticket creation with working session', async ({ page }) => {
    console.log('🎫 Testing ticket creation access...');
    
    // Try to access create issue
    await page.goto('https://jirauat.smedigitalapps.com/jira/secure/CreateIssue!default.jspa', { timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    // Take screenshot
    await page.screenshot({ 
      path: 'jira-uat-testing/screenshots/create-issue-working-session.png',
      fullPage: true 
    });
    
    const currentUrl = page.url();
    console.log(`🌐 Create issue URL: ${currentUrl}`);
    
    const canAccessCreate = !currentUrl.includes('login') && !currentUrl.includes('auth');
    
    if (canAccessCreate) {
      console.log('✅ SUCCESS: Can access ticket creation with working session!');
      expect(true, 'Should access create issue with working session').toBe(true);
    } else {
      console.log('❌ FAILURE: Cannot access ticket creation');
      expect(false, 'Should access create issue with working session').toBe(true);
    }
  });

});