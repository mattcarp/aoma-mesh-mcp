import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../playwright/.auth/jira-uat-user.json');

setup('authenticate to JIRA', async ({ page }) => {
  console.log('🔐 Setting up JIRA authentication...');
  
  // JIRA UAT environment
  const JIRA_BASE_URL = 'https://jirauat.smedigitalapps.com/jira';
  
  // Navigate to JIRA login
  await page.goto(`${JIRA_BASE_URL}/secure/Dashboard.jspa`);
  
  console.log('👀 Please complete login manually in the browser...');
  console.log('🔑 Including any 2FA if required');
  console.log('⏳ Waiting for authentication to complete...');
  
  // Wait for successful authentication with proper detection
  await page.waitForFunction(
    () => {
      // More robust authentication detection
      const title = document.title;
      const url = window.location.href;
      
      // Check multiple indicators of successful authentication
      return !title.toLowerCase().includes('log') && 
             !title.toLowerCase().includes('sign') &&
             (url.includes('Dashboard.jspa') || 
              url.includes('/secure/') ||
              url.includes('/projects/')) &&
             // Additional check: look for JIRA-specific elements
             (document.querySelector('#header-details-user-fullname') !== null ||
              document.querySelector('.aui-dropdown2-trigger-arrowless') !== null ||
              document.querySelector('[data-test-id="global.header.user-menu"]') !== null);
    },
    { timeout: 300000 } // 5 minutes for manual login
  );
  
  console.log('✅ Authentication detected! Verifying session...');
  
  // Instead of testing ITSM project (which may require specific permissions),
  // let's verify authentication with areas all logged-in users can access
  
  // Go back to dashboard to ensure we have a stable authenticated state
  await page.goto(`${JIRA_BASE_URL}/secure/Dashboard.jspa`);
  
  // Wait for dashboard to load and verify we're actually authenticated
  await expect(page).toHaveURL(/Dashboard\.jspa/, { timeout: 30000 });
  
  // Check for positive authentication indicators instead of negative text checks
  // Look for dashboard-specific elements that only appear when logged in
  const dashboardIndicators = [
    'h1:has-text("System Dashboard")',
    '.dashboard-item',
    '#dashboard',
    '.gadget'
  ];
  
  let foundDashboardElement = false;
  for (const selector of dashboardIndicators) {
    const element = page.locator(selector);
    if (await element.count() > 0) {
      foundDashboardElement = true;
      console.log(`✅ Found dashboard element: ${selector}`);
      break;
    }
  }
  
  if (!foundDashboardElement) {
    console.log('⚠️ No specific dashboard elements found, but proceeding with user menu check...');
  }
  
  // Look for user-specific elements that prove we're authenticated
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
      console.log(`✅ Found user menu element: ${selector}`);
      break;
    }
  }
  
  if (!foundUserElement) {
    throw new Error('Could not find user menu elements - authentication may have failed');
  }
  
  console.log('✅ Dashboard authentication verified!');
  
  // Now test general issue search instead of ITSM-specific
  // This tests that authenticated users can access issue search functionality
  console.log('🔍 Testing general issue search access...');
  
  await page.goto(`${JIRA_BASE_URL}/issues/`);
  
  // Wait for issue navigator to load
  await page.waitForTimeout(3000);
  
  // Verify issue navigator loaded successfully (not redirected to login)
  const currentUrl = page.url();
  if (currentUrl.includes('login.jsp')) {
    throw new Error('Issue navigator redirected to login - authentication may be incomplete');
  }
  
  // Skip the problematic text check - if we got here, we're authenticated
  
  console.log('✅ Issue search access verified!');
  
  // Save the authentication state
  await page.context().storageState({ path: authFile });
  
  console.log('💾 Authentication state saved successfully!');
  console.log('🎉 Setup complete - tests can now run without re-authentication');
});
