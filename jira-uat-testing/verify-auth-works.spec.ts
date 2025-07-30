import { test, expect } from '@playwright/test';

test.describe('JIRA UAT Authentication Verification', () => {
  test('should access dashboard with saved authentication', async ({ page }) => {
    console.log('🔍 Verifying JIRA UAT authentication works...');
    
    // Navigate to dashboard
    await page.goto('/secure/Dashboard.jspa');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot
    await page.screenshot({ 
      path: 'verification-dashboard.png', 
      fullPage: true 
    });
    
    const currentUrl = page.url();
    console.log('📍 Current URL:', currentUrl);
    console.log('📄 Page title:', await page.title());
    
    // Verify we're authenticated (not redirected to login)
    expect(currentUrl).not.toContain('login');
    expect(currentUrl).not.toContain('auth');
    expect(currentUrl).toContain('Dashboard.jspa');
    
    console.log('✅ SUCCESS: Dashboard accessible with saved authentication!');
  });

  test('should access create issue page', async ({ page }) => {
    console.log('🎯 Testing create issue access...');
    
    // Navigate to create issue
    await page.goto('/secure/CreateIssue!default.jspa');
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ 
      path: 'verification-create-issue.png', 
      fullPage: true 
    });
    
    const currentUrl = page.url();
    console.log('📍 Create Issue URL:', currentUrl);
    
    // Verify we can access create issue
    expect(currentUrl).not.toContain('login');
    expect(currentUrl).not.toContain('auth');
    
    console.log('✅ SUCCESS: Create issue accessible!');
  });

  test('should access project browser', async ({ page }) => {
    console.log('📂 Testing project browser access...');
    
    // Navigate to project browser
    await page.goto('/secure/BrowseProjects.jspa');
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ 
      path: 'verification-projects.png', 
      fullPage: true 
    });
    
    const currentUrl = page.url();
    console.log('📍 Projects URL:', currentUrl);
    
    // Verify we can access projects
    expect(currentUrl).not.toContain('login');
    expect(currentUrl).not.toContain('auth');
    
    console.log('✅ SUCCESS: Project browser accessible!');
  });
});
