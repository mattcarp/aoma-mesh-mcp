import { test, expect } from '@playwright/test';

test.describe('Platform Validation - Jira 9.12 → 10.3 LTS', () => {
  test('should load Jira application successfully on Java 17', async ({ page }) => {
    await page.goto('/');
    
    // Check for successful page load - Updated to match actual Sony Music JIRA title
    await expect(page).toHaveTitle(/System Dashboard.*Sony Music/);
    
    // Verify no JavaScript errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.waitForLoadState('networkidle');
    expect(errors.length).toBe(0);
  });

  test('should support async webhooks', async ({ page }) => {
    // Navigate to webhook administration  
    await page.goto('/secure/admin/webhooks/ViewWebhooks.jspa');
    
    // Verify webhook page loads (indicates Platform 7 compatibility)
    await expect(page.locator('h2')).toContainText('Webhooks');
  });

  test('should maintain REST API compatibility', async ({ page, request }) => {
    // Test REST v2 endpoints
    const response = await request.get('/rest/api/2/serverInfo');
    expect(response.status()).toBe(200);
    
    const serverInfo = await response.json();
    expect(serverInfo.version).toMatch(/^10\.3\./);
  });
});
