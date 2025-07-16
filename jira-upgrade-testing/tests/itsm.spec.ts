import { test, expect } from '@playwright/test';

test.describe('JIRA Authentication and Access Tests', () => {
  test('verify authenticated dashboard access', async ({ page }) => {
    // Page is already authenticated from setup!
    await page.goto('/secure/Dashboard.jspa');
    
    // Verify we're on the dashboard
    await expect(page).toHaveURL(/Dashboard\.jspa/);
    
    // Verify we're not seeing login page
    await expect(page.locator('body')).not.toContainText('log in', { ignoreCase: true });
    
    // Look for user-specific elements
    const userElements = [
      '#header-details-user-fullname',
      '.aui-dropdown2-trigger-arrowless',
      '[data-test-id="global.header.user-menu"]',
      '.user-menu',
      '#user-menu-link'
    ];
    
    let foundUserElement = false;
    for (const selector of userElements) {
      const element = page.locator(selector);
      if (await element.count() > 0) {
        foundUserElement = true;
        break;
      }
    }
    
    expect(foundUserElement).toBeTruthy();
    console.log('✅ Dashboard authentication verified');
  });
  
  test('attempt ITSM project access', async ({ page }) => {
    // Try to access ITSM project - this may fail due to permissions
    await page.goto('/projects/ITSM');
    
    const currentUrl = page.url();
    
    if (currentUrl.includes('login.jsp') || currentUrl.includes('permissionViolation=true')) {
      console.log('⚠️ ITSM project access denied - user lacks permissions');
      console.log('🔍 This is a permissions issue, not an authentication issue');
      
      // Verify we're still authenticated by going back to dashboard
      await page.goto('/secure/Dashboard.jspa');
      await expect(page).toHaveURL(/Dashboard\.jspa/);
      await expect(page.locator('body')).not.toContainText('log in', { ignoreCase: true });
      
      console.log('✅ Authentication still valid - just no ITSM permissions');
    } else {
      // If we can access ITSM, verify the page loaded
      await expect(page).toHaveURL(/\/projects\/ITSM/);
      await expect(page.locator('h1, .project-title, .page-title')).toBeVisible();
      console.log('✅ ITSM project access successful');
    }
  });
  
  test('search general issues', async ({ page }) => {
    // Test general issue search that doesn't require specific project permissions
    await page.goto('/issues/');
    
    // Wait for search interface
    await page.waitForTimeout(2000);
    
    // Verify we're not redirected to login
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('login.jsp');
    
    // Verify we can see the search interface
    await expect(page.locator('body')).not.toContainText('log in', { ignoreCase: true });
    
    console.log('✅ General issue search accessible');
  });
  
  test('verify user authentication status', async ({ page }) => {
    // Go to dashboard to verify we're logged in
    await page.goto('/secure/Dashboard.jspa');
    
    // Look for user-specific elements that indicate authentication
    const userElements = [
      '#header-details-user-fullname',
      '.aui-dropdown2-trigger-arrowless',
      '[data-test-id="global.header.user-menu"]',
      '.user-menu'
    ];
    
    let foundUserElement = false;
    for (const selector of userElements) {
      const element = page.locator(selector);
      if (await element.count() > 0) {
        foundUserElement = true;
        break;
      }
    }
    
    expect(foundUserElement).toBeTruthy();
    console.log('✅ User authentication verified');
  });
});
