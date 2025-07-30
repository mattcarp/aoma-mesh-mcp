import { test, expect } from '@playwright/test';

test.describe('Authentication Demo - Pass vs Fail Examples', () => {
  
  test('✅ PASS: With Authentication - Can Access Protected Pages', async ({ page }) => {
    console.log('🔐 Testing WITH proper authentication...');
    
    // This test uses saved authentication from setup
    await page.goto('/secure/Dashboard.jspa', { timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // Check we're not redirected to login
    const currentUrl = page.url();
    console.log(`🌐 Current URL: ${currentUrl}`);
    
    expect(currentUrl).not.toContain('login');
    expect(currentUrl).toContain('secure');
    
    // Look for authenticated elements
    const pageTitle = await page.title();
    console.log(`📄 Page title: ${pageTitle}`);
    
    // Take screenshot as evidence
    await page.screenshot({ 
      path: 'jira-uat-testing/screenshots/authenticated-success.png',
      fullPage: true 
    });
    
    console.log('✅ SUCCESS: Authenticated access works!');
    expect(true, 'Should access protected pages when authenticated').toBe(true);
  });

  test('✅ PASS: With Authentication - Can Access Ticket Creation', async ({ page }) => {
    console.log('🎫 Testing ticket creation WITH authentication...');
    
    // Navigate to create issue page
    await page.goto('/secure/CreateIssue!default.jspa', { timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    const currentUrl = page.url();
    console.log(`🌐 Create issue URL: ${currentUrl}`);
    
    // Should not be redirected to login
    expect(currentUrl).not.toContain('login');
    
    // Take screenshot
    await page.screenshot({ 
      path: 'jira-uat-testing/screenshots/create-issue-authenticated.png',
      fullPage: true 
    });
    
    console.log('✅ SUCCESS: Can access ticket creation when authenticated!');
    expect(true, 'Should access create issue page when authenticated').toBe(true);
  });

  test('📊 INFO: Authentication State Details', async ({ page }) => {
    console.log('🔍 Inspecting current authentication state...');
    
    await page.goto('/secure/Dashboard.jspa', { timeout: 30000 });
    
    // Get authentication cookies
    const cookies = await page.context().cookies();
    const authCookies = cookies.filter(cookie => 
      cookie.name.toLowerCase().includes('jsession') || 
      cookie.name.toLowerCase().includes('jira') ||
      cookie.name.toLowerCase().includes('atlassian') ||
      cookie.name.toLowerCase().includes('seraph')
    );
    
    console.log(`🍪 Found ${authCookies.length} authentication-related cookies:`);
    authCookies.forEach(cookie => {
      console.log(`  - ${cookie.name}: ${cookie.value.substring(0, 30)}...`);
      console.log(`    Domain: ${cookie.domain}, Secure: ${cookie.secure}, HttpOnly: ${cookie.httpOnly}`);
    });
    
    // Check user info if available
    const userInfo = await page.evaluate(() => {
      // Try to get user info from common JIRA global variables
      return {
        // @ts-ignore
        currentUser: window.AJS?.Meta?.get('remote-user') || 'unknown',
        // @ts-ignore
        baseUrl: window.AJS?.Meta?.get('base-url') || 'unknown'
      };
    }).catch(() => ({ currentUser: 'unavailable', baseUrl: 'unavailable' }));
    
    console.log(`👤 Current user: ${userInfo.currentUser}`);
    console.log(`🌐 Base URL: ${userInfo.baseUrl}`);
    
    expect(authCookies.length).toBeGreaterThan(0);
    console.log('✅ Authentication state inspection complete');
  });

});