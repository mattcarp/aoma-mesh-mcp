import { test, expect } from '@playwright/test';

test.describe('ITSM Project Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to ITSM project
    await page.goto('/browse/ITSM');
  });

  test('should create incident tickets successfully', async ({ page }) => {
    // Test incident creation workflow
    await page.click('[data-testid="create-issue-button"]');
    
    // Select incident type
    await page.selectOption('#issuetype', 'Incident');
    
    // Fill required fields
    await page.fill('#summary', 'Test Incident - Upgrade Validation');
    await page.fill('#description', 'Testing incident creation post-upgrade');
    
    // Submit
    await page.click('#create-issue-submit');
    
    // Verify creation
    await expect(page.locator('.issue-header')).toBeVisible();
  });

  test('should process change requests through CAB', async ({ page }) => {
    // Test Change Advisory Board workflow
    await page.click('[data-testid="create-issue-button"]');
    
    // Select change request type
    await page.selectOption('#issuetype', 'Change Request');
    
    // Fill change details
    await page.fill('#summary', 'Test Change - System Upgrade');
    await page.selectOption('#priority', 'Medium');
    
    await page.click('#create-issue-submit');
    
    // Verify CAB workflow triggers
    await expect(page.locator('.workflow-status')).toContainText('Waiting for Approval');
  });
});
