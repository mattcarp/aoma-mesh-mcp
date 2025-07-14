import { test, expect } from '@playwright/test';
import { authenticateJira, waitForJiraLoad } from './auth-setup';

test.describe('Simple JIRA Login Test', () => {
  test('should authenticate successfully and access JIRA', async ({ page }) => {
    console.log('🧪 Starting simple JIRA login test...');
    
    // Authenticate
    await authenticateJira(page);
    
    // Verify we can access the dashboard
    await page.goto('/jira/dashboard.jspa');
    await waitForJiraLoad(page);
    
    // Simple check - if we can access dashboard, login worked
    const isOnDashboard = await page.evaluate(() => {
      return window.location.href.includes('dashboard') || 
             window.location.href.includes('Dashboard');
    });
    
    expect(isOnDashboard).toBe(true);
    console.log('✅ Login test passed!');
  });
  
  test('should access ITSM project after login', async ({ page }) => {
    console.log('🧪 Testing ITSM project access...');
    
    // Navigate to ITSM project
    await page.goto('/browse/ITSM');
    await waitForJiraLoad(page);
    
    // Check if we can access ITSM project
    const canAccessITSM = await page.evaluate(() => {
      const errorElement = document.querySelector('.error, .aui-message-error');
      if (errorElement && errorElement.textContent?.includes('does not exist')) {
        return false;
      }
      return !window.location.href.includes('error');
    });
    
    expect(canAccessITSM).toBe(true);
    console.log('✅ ITSM project access test passed!');
  });
}); 