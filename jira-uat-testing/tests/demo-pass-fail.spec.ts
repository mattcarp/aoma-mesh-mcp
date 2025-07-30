import { test, expect } from '@playwright/test';

test.describe('Demo: Pass and Fail Examples', () => {
  
  test('✅ PASS: Basic JIRA UAT URL Access', async ({ page }) => {
    console.log('🎯 Testing basic JIRA UAT access...');
    
    // Navigate to JIRA UAT
    await page.goto('https://jirauat.smedigitalapps.com', { timeout: 30000 });
    
    // Check if we can reach the site (even if login required)
    const pageTitle = await page.title();
    console.log(`📄 Page title: ${pageTitle}`);
    
    // This should pass - we can reach the JIRA UAT site
    expect(pageTitle).toBeTruthy();
    expect(pageTitle.length).toBeGreaterThan(0);
    
    console.log('✅ SUCCESS: Can access JIRA UAT site');
  });

  test('❌ FAIL: Intentional Authentication Failure Demo', async ({ page }) => {
    console.log('🎯 Demonstrating authentication failure...');
    
    // Navigate to JIRA UAT
    await page.goto('https://jirauat.smedigitalapps.com', { timeout: 30000 });
    
    // Try to access a protected page without authentication
    await page.goto('https://jirauat.smedigitalapps.com/secure/Dashboard.jspa', { timeout: 30000 });
    
    // Check if we're authenticated (this should fail)
    const pageText = await page.textContent('body');
    const hasLogin = pageText.includes('log in') || 
                    pageText.includes('sign in') ||
                    page.url().includes('login');
    
    console.log(`🔍 Has login page: ${hasLogin}`);
    console.log(`🔍 Current URL: ${page.url()}`);
    
    // This should FAIL - we expect to NOT see login page, but we will
    expect(hasLogin, 'Should be authenticated and not see login page').toBe(false);
    
    console.log('❌ EXPECTED FAILURE: Not authenticated as expected');
  });

  test('✅ PASS: Environment URL Validation', async ({ page }) => {
    console.log('🎯 Testing environment URL validation...');
    
    const uatUrl = 'https://jirauat.smedigitalapps.com';
    
    // Validate that we're using UAT environment
    expect(uatUrl).toContain('uat');
    expect(uatUrl).not.toContain('jira.smedigitalapps.com');
    
    console.log('✅ SUCCESS: Using correct UAT environment URL');
  });

});
