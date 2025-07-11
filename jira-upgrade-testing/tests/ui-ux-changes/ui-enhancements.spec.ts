import { test, expect } from '@playwright/test';

test.describe('UI/UX Enhancement Validation', () => {
  test('should support dark theme functionality', async ({ page }) => {
    await page.goto('/');
    
    // Navigate to user profile
    await page.click('[data-testid="user-avatar"]');
    await page.click('text=Profile');
    
    // Switch to dark theme
    await page.click('text=Preferences');
    await page.selectOption('#theme-select', 'dark');
    await page.click('#save-preferences');
    
    // Verify dark theme applied
    await page.reload();
    const bodyClass = await page.locator('body').getAttribute('class');
    expect(bodyClass).toContain('theme-dark');
  });

  test('should validate two-step authentication', async ({ page }) => {
    // Navigate to security settings
    await page.goto('/secure/admin/user/UserBrowser.jspa');
    
    // Check 2FA options available
    await page.click('text=Security');
    await expect(page.locator('text=Two-Factor Authentication')).toBeVisible();
  });
});
