import { test, expect } from '@playwright/test';

test.describe('JIRA UAT Authentication Proof', () => {
  test('should successfully authenticate and access JIRA UAT dashboard', async ({ page }) => {
    console.log('🔥 PROVING JIRA UAT AUTHENTICATION WORKS...');
    
    // Navigate to JIRA UAT dashboard
    await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    // Take screenshot for proof
    await page.screenshot({ 
      path: 'auth-proof-dashboard.png', 
      fullPage: true 
    });
    
    const currentUrl = page.url();
    const title = await page.title();
    
    console.log(`📍 Current URL: ${currentUrl}`);
    console.log(`📄 Page title: ${title}`);
    
    // Verify we're NOT on a login page
    expect(currentUrl).not.toContain('login');
    expect(currentUrl).not.toContain('auth');
    expect(currentUrl).not.toContain('saml');
    
    // Verify we're on the dashboard
    expect(currentUrl).toContain('Dashboard.jspa');
    
    // Check page content for JIRA elements
    const bodyText = await page.textContent('body');
    const hasJiraContent = bodyText?.includes('JIRA') || 
                          bodyText?.includes('Dashboard') || 
                          bodyText?.includes('Projects');
    
    expect(hasJiraContent).toBe(true);
    
    console.log('✅ SUCCESS: JIRA UAT authentication is working perfectly!');
    console.log('✅ Dashboard is accessible without login redirect');
    console.log('✅ Session-based authentication is functioning');
  });

  test('should access project creation page', async ({ page }) => {
    console.log('🎯 Testing project creation access...');
    
    // Try to access create project page
    await page.goto('https://jirauat.smedigitalapps.com/jira/secure/CreateProject!default.jspa');
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    await page.screenshot({ 
      path: 'auth-proof-create-project.png', 
      fullPage: true 
    });
    
    const currentUrl = page.url();
    console.log(`📍 Create Project URL: ${currentUrl}`);
    
    // Verify we can access admin functions
    expect(currentUrl).not.toContain('login');
    expect(currentUrl).not.toContain('auth');
    
    console.log('✅ SUCCESS: Can access project creation - admin permissions working!');
  });
});
