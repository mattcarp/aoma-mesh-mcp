import { test, expect } from '@playwright/test';

test.describe('DPSA Ticket Validation - Upgrade Testing', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to DPSA project or search for DPSA tickets
    await page.goto('/browse/DPSA');
  });

  test('should create DPSA tickets successfully', async ({ page }) => {
    // Test DPSA ticket creation workflow
    await page.click('[data-testid="create-issue-button"]');
    
    // Select DPSA ticket type (might be custom issue type)
    await page.selectOption('#issuetype', 'DPSA Assessment');
    
    // Fill DPSA-specific fields
    await page.fill('#summary', 'Test DPSA - Upgrade Validation');
    await page.fill('#description', 'Testing DPSA ticket creation post-upgrade');
    
    // Security/compliance specific fields
    if (await page.locator('#security-level').isVisible()) {
      await page.selectOption('#security-level', 'Confidential');
    }
    
    if (await page.locator('#compliance-category').isVisible()) {
      await page.selectOption('#compliance-category', 'Data Protection');
    }
    
    // Submit DPSA ticket
    await page.click('#create-issue-submit');
    
    // Verify DPSA ticket created
    await expect(page.locator('.issue-header')).toBeVisible();
    await expect(page.locator('.issue-type')).toContainText('DPSA');
  });

  test('should process DPSA security assessment workflow', async ({ page }) => {
    // Test security assessment workflow
    await page.click('[data-testid="create-issue-button"]');
    
    // Select security assessment type
    await page.selectOption('#issuetype', 'Security Assessment');
    
    // Fill assessment details
    await page.fill('#summary', 'Test Security Assessment - Platform Upgrade');
    await page.selectOption('#risk-level', 'Medium');
    await page.selectOption('#assessment-type', 'System Change');
    
    await page.click('#create-issue-submit');
    
    // Verify security workflow triggers
    await expect(page.locator('.workflow-status')).toContainText('Security Review');
  });

  test('should validate data protection compliance features', async ({ page }) => {
    // Test data protection ticket workflow
    await page.click('[data-testid="create-issue-button"]');
    
    // Select data protection ticket type
    await page.selectOption('#issuetype', 'Data Protection');
    
    // Fill compliance fields
    await page.fill('#summary', 'Test Data Protection - Upgrade Validation');
    await page.selectOption('#data-classification', 'Personal Data');
    await page.selectOption('#gdpr-category', 'Processing Assessment');
    
    // Set compliance deadline
    if (await page.locator('#compliance-deadline').isVisible()) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      await page.fill('#compliance-deadline', futureDate.toISOString().split('T')[0]);
    }
    
    await page.click('#create-issue-submit');
    
    // Verify compliance tracking
    await expect(page.locator('.compliance-status')).toBeVisible();
    await expect(page.locator('.audit-trail')).toBeVisible();
  });

  test('should maintain DPSA custom fields post-upgrade', async ({ page }) => {
    // Test that DPSA-specific custom fields work correctly
    await page.goto('/secure/admin/ViewCustomFields.jspa');
    
    // Search for DPSA-related custom fields
    await page.fill('#field-search', 'DPSA');
    await page.click('#search-fields');
    
    // Verify DPSA custom fields are present and functional
    await expect(page.locator('.custom-field-row')).toHaveCount({ min: 1 });
    
    // Check specific DPSA fields exist
    const expectedFields = [
      'Security Level',
      'Compliance Category', 
      'Risk Assessment',
      'Data Classification',
      'Audit Trail'
    ];
    
    for (const field of expectedFields) {
      await expect(page.locator(`text=${field}`)).toBeVisible();
    }
  });

  test('should validate DPSA reporting and dashboards', async ({ page }) => {
    // Test DPSA-specific reporting functionality
    await page.goto('/secure/Dashboard.jspa');
    
    // Look for DPSA dashboard widgets
    await expect(page.locator('.dashboard-item')).toHaveCount({ min: 1 });
    
    // Navigate to DPSA reports
    await page.goto('/secure/ConfigureReport.jspa');
    
    // Verify DPSA project is available in reports
    if (await page.locator('#project-select').isVisible()) {
      await page.selectOption('#project-select', 'DPSA');
      await expect(page.locator('#project-select')).toHaveValue('DPSA');
    }
  });

  test('should validate DPSA ticket search and filtering', async ({ page }) => {
    // Test searching and filtering DPSA tickets
    await page.goto('/issues/');
    
    // Search for DPSA tickets
    await page.fill('#quickSearchInput', 'project = DPSA');
    await page.press('#quickSearchInput', 'Enter');
    
    await page.waitForLoadState('networkidle');
    
    // Verify DPSA tickets are searchable
    await expect(page.locator('.issue-list')).toBeVisible();
    
    // Test DPSA-specific filters
    if (await page.locator('#filter-security-level').isVisible()) {
      await page.selectOption('#filter-security-level', 'Confidential');
    }
    
    if (await page.locator('#filter-compliance-status').isVisible()) {
      await page.selectOption('#filter-compliance-status', 'In Review');
    }
  });

  test('should ensure DPSA audit trail functionality', async ({ page }) => {
    // Create a test DPSA ticket to verify audit trail
    await page.click('[data-testid="create-issue-button"]');
    await page.selectOption('#issuetype', 'DPSA Assessment');
    await page.fill('#summary', 'Audit Trail Test - Upgrade Validation');
    await page.click('#create-issue-submit');
    
    // Navigate to issue history/audit trail
    await page.click('#view-history-tab');
    
    // Verify audit trail captures creation
    await expect(page.locator('.activity-item')).toHaveCount({ min: 1 });
    await expect(page.locator('.activity-item')).toContainText('created');
    
    // Make a change to verify audit tracking
    await page.click('#edit-issue');
    await page.fill('#description', 'Updated description for audit trail test');
    await page.click('#issue-edit-submit');
    
    // Verify change is audited
    await page.click('#view-history-tab');
    await expect(page.locator('.activity-item')).toContainText('updated');
  });
}); 