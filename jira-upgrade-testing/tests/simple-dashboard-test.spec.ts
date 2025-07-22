import { test, expect } from '@playwright/test';

test.describe('Simple Dashboard Authentication Test', () => {
  test('should access JIRA dashboard with saved authentication', async ({ page }) => {
    console.log('🚀 Testing dashboard access with saved session...');
    
    // Navigate to the main dashboard
    await page.goto('/secure/Dashboard.jspa');
    await page.waitForLoadState('networkidle');
    
    // Take a screenshot for verification
    await page.screenshot({ path: 'dashboard-auth-test.png', fullPage: true });
    
    // Verify we're on the dashboard (not a 404 or login page)
    await expect(page).toHaveURL(/Dashboard\.jspa/);
    
    // Check for dashboard-specific elements
    const dashboardTitle = page.locator('h1:has-text("System Dashboard")');
    const hasDashboard = await dashboardTitle.count() > 0;
    
    if (hasDashboard) {
      console.log('✅ Found System Dashboard title');
      await expect(dashboardTitle).toBeVisible();
    } else {
      console.log('ℹ️ No System Dashboard title found, checking for other dashboard indicators...');
    }
    
    // Check for user menu (proves authentication)
    const userMenuSelectors = [
      '#header-details-user-fullname',
      '.aui-dropdown2-trigger-arrowless',
      '[data-test-id="global.header.user-menu"]',
      '.user-menu'
    ];
    
    let foundUserMenu = false;
    for (const selector of userMenuSelectors) {
      const element = page.locator(selector);
      if (await element.count() > 0) {
        console.log(`✅ Found user menu: ${selector}`);
        foundUserMenu = true;
        break;
      }
    }
    
    // Verify authentication worked
    expect(foundUserMenu).toBe(true);
    
    // Check that we're not on an error page
    const pageText = await page.textContent('body');
    expect(pageText).not.toContain('HTTP Status 404');
    expect(pageText).not.toContain('Not Found');
    expect(pageText).not.toContain('Apache Tomcat');
    
    console.log('🎉 Dashboard authentication test PASSED!');
    console.log('📸 Screenshot saved as: dashboard-auth-test.png');
  });
  
  test('should list available projects for future testing', async ({ page }) => {
    console.log('🔍 Discovering available projects...');
    
    // Navigate to projects page
    await page.goto('/secure/BrowseProjects.jspa');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of projects page
    await page.screenshot({ path: 'available-projects.png', fullPage: true });
    
    // Extract project information
    const projects = await page.evaluate(() => {
      const projectElements = document.querySelectorAll('[data-project-key], .project-list-item, .project-item');
      const projectList: string[] = [];
      
      projectElements.forEach(element => {
        const key = element.getAttribute('data-project-key') || 
                   element.textContent?.match(/\b[A-Z]{2,10}\b/)?.[0] || 
                   'Unknown';
        if (key !== 'Unknown') {
          projectList.push(key);
        }
      });
      
      return [...new Set(projectList)]; // Remove duplicates
    });
    
    console.log('📋 Available projects found:', projects);
    console.log('📸 Projects screenshot saved as: available-projects.png');
    
    // Log projects for tomorrow's testing
    if (projects.length > 0) {
      console.log('🎯 Recommended projects for tomorrow\'s tests:');
      projects.forEach(project => {
        console.log(`   - ${project}`);
      });
    }
  });
});
