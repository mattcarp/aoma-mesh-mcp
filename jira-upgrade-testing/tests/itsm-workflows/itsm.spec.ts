import { test, expect } from '@playwright/test';
import { authenticateJira, waitForJiraLoad, verifyProjectAccess } from '../auth-setup';

test.describe('ITSM Project Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate first
    await authenticateJira(page);
    
    // Navigate to ITSM project and verify access
    await verifyProjectAccess(page, 'ITSM');
    await waitForJiraLoad(page);
  });

  test('should access ITSM project successfully', async ({ page }) => {
    // Verify we can access the ITSM project
    await page.goto('/browse/ITSM');
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
    await expect(page).toHaveURL(/.*\/browse\/ITSM/);
  });

  test('should display ITSM tickets correctly', async ({ page }) => {
    // Navigate to ITSM issues list
    await page.goto('/issues/?jql=project%20%3D%20ITSM%20ORDER%20BY%20created%20DESC');
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
    
    console.log(`✅ ITSM project has ${hasIssues.issueCount} visible issues`);
  });

  test('should validate ITSM project configuration', async ({ page }) => {
    // Check project settings and configuration
    await page.goto('/plugins/servlet/project-config/ITSM/summary');
    await waitForJiraLoad(page);
    
    // Verify project configuration is accessible
    const configExists = await page.evaluate(() => {
      const projectConfig = document.querySelector('.project-config-summary, .project-details');
      const errorElement = document.querySelector('.error, .aui-message-error');
      
      return !!(projectConfig && !errorElement);
    });
    
    expect(configExists).toBe(true);
    
    // Verify project name contains ITSM
    const projectName = await page.evaluate(() => {
      const nameElement = document.querySelector('.project-name, h1');
      return nameElement?.textContent?.trim() || '';
    });
    
    expect(projectName.toLowerCase()).toContain('itsm');
  });

  test('should test ITSM search functionality', async ({ page }) => {
    // Test search functionality within ITSM
    await page.goto('/issues/');
    await waitForJiraLoad(page);
    
    // Enter search query for ITSM
    const searchInput = await page.locator('#quickSearchInput, .quick-search-input').first();
    await searchInput.fill('project = ITSM');
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
    console.log(`✅ ITSM search returned ${searchResults.issueCount} results`);
  });
});
