import { test, expect } from '@playwright/test';
import { authenticateJira, waitForJiraLoad, verifyProjectAccess } from '../auth-setup';

test.describe('DPSA Ticket Validation - Upgrade Testing', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate first
    await authenticateJira(page);
    
    // Navigate to DPSA project and verify access
    await verifyProjectAccess(page, 'DPSA');
    await waitForJiraLoad(page);
  });

  test('should access DPSA project successfully', async ({ page }) => {
    // Verify we can access the DPSA project
    await page.goto('/browse/DPSA');
    await waitForJiraLoad(page);
    
    // Check if project exists and is accessible
    const projectExists = await page.evaluate(() => {
      const errorElement = document.querySelector('.error, .aui-message-error');
      if (errorElement && errorElement.textContent?.includes('does not exist')) {
        return false;
      }
      return !window.location.href.includes('error');
    });
    
    expect(projectExists).toBe(true);
    
    // Verify page loaded correctly
    await expect(page).toHaveURL(/.*\/browse\/DPSA/);
  });

  test('should display DPSA tickets correctly', async ({ page }) => {
    // Navigate to DPSA issues list
    await page.goto('/issues/?jql=project%20%3D%20DPSA%20ORDER%20BY%20created%20DESC');
    await waitForJiraLoad(page);
    
    // Check for issue navigator elements
    const hasIssues = await page.evaluate(() => {
      const issueTable = document.querySelector('.issue-table, .navigator-content');
      const issueRows = document.querySelectorAll('[data-issuekey]');
      const noIssuesMessage = document.querySelector('.no-issues-message');
      
      return {
        hasTable: !!issueTable,
        issueCount: issueRows.length,
        hasNoIssuesMessage: !!noIssuesMessage
      };
    });
    
    // Either we have issues or a clear "no issues" message
    expect(hasIssues.hasTable || hasIssues.hasNoIssuesMessage).toBe(true);
    
    console.log(`✅ DPSA project has ${hasIssues.issueCount} visible issues`);
  });

  test('should validate DPSA project configuration', async ({ page }) => {
    // Check project settings and configuration
    await page.goto('/plugins/servlet/project-config/DPSA/summary');
    await waitForJiraLoad(page);
    
    // Verify project configuration is accessible
    const configExists = await page.evaluate(() => {
      const projectConfig = document.querySelector('.project-config-summary, .project-details');
      const errorElement = document.querySelector('.error, .aui-message-error');
      
      return !!(projectConfig && !errorElement);
    });
    
    expect(configExists).toBe(true);
    
    // Verify project name contains DPSA
    const projectName = await page.evaluate(() => {
      const nameElement = document.querySelector('.project-name, h1');
      return nameElement?.textContent?.trim() || '';
    });
    
    expect(projectName.toLowerCase()).toContain('dpsa');
  });

  test('should test DPSA search functionality', async ({ page }) => {
    // Test search functionality within DPSA
    await page.goto('/issues/');
    await waitForJiraLoad(page);
    
    // Enter search query for DPSA
    const searchInput = await page.locator('#quickSearchInput, .quick-search-input').first();
    await searchInput.fill('project = DPSA');
    await searchInput.press('Enter');
    
    await waitForJiraLoad(page);
    
    // Verify search results
    const searchResults = await page.evaluate(() => {
      const resultContainer = document.querySelector('.issue-list, .navigator-content');
      const issues = document.querySelectorAll('[data-issuekey]');
      
      return {
        hasResults: !!resultContainer,
        issueCount: issues.length
      };
    });
    
    expect(searchResults.hasResults).toBe(true);
    console.log(`✅ DPSA search returned ${searchResults.issueCount} results`);
  });

  test('should validate DPSA reporting and dashboards', async ({ page }) => {
    // Test DPSA-specific reporting functionality
    await page.goto('/secure/Dashboard.jspa');
    await waitForJiraLoad(page);
    
    // Look for dashboard elements
    const dashboardExists = await page.evaluate(() => {
      const dashboard = document.querySelector('.dashboard, .dashboard-content');
      const errorElement = document.querySelector('.error, .aui-message-error');
      
      return !!(dashboard && !errorElement);
    });
    
    expect(dashboardExists).toBe(true);
    
    // Navigate to issue navigator to test DPSA filtering
    await page.goto('/issues/');
    await waitForJiraLoad(page);
    
    // Test advanced search with DPSA
    await page.locator('#quickSearchInput, .quick-search-input').first().fill('project = DPSA');
    await page.locator('#quickSearchInput, .quick-search-input').first().press('Enter');
    
    await waitForJiraLoad(page);
    
    // Verify we can filter by DPSA project
    const canFilter = await page.evaluate(() => {
      const url = window.location.href;
      return url.includes('DPSA') || url.includes('project');
    });
    
    expect(canFilter).toBe(true);
  });
}); 