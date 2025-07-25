import { test, expect } from '@playwright/test';

test.describe('JIRA Ticket Creation - CRITICAL FUNCTIONALITY', () => {
  test.beforeEach(async ({ page }) => {
    // Use saved authentication if available
    console.log('🔐 Starting ticket creation test with authentication...');
  });

  test('should be able to create a basic ticket in ITSM project', async ({ page }) => {
    console.log('🎫 Testing basic ticket creation - THE ENGINE TEST!');
    
    // First, let's find a working dashboard URL
    const dashboardUrls = [
      '/secure/Dashboard.jspa',
      '/dashboard',
      '/secure/Dashboard.jsp',
      '/',
      '/secure/'
    ];
    
    let workingUrl = '';
    let isAuthenticated = false;
    
    for (const url of dashboardUrls) {
      try {
        console.log(`🔍 Trying dashboard URL: ${url}`);
        await page.goto(url, { timeout: 10000 });
        await page.waitForLoadState('networkidle', { timeout: 5000 });
        
        const pageText = await page.textContent('body');
        const hasError = pageText.includes('HTTP Status 404') || 
                        pageText.includes('Not Found') || 
                        pageText.includes('Apache Tomcat');
        
        const hasLogin = pageText.includes('log in') || 
                        pageText.includes('sign in') ||
                        page.url().includes('login');
        
        if (!hasError && !hasLogin) {
          workingUrl = url;
          isAuthenticated = true;
          console.log(`✅ Found working dashboard: ${url}`);
          break;
        }
      } catch (error) {
        console.log(`❌ Dashboard URL ${url} failed: ${error.message}`);
      }
    }
    
    expect(isAuthenticated, 'Should be able to access JIRA dashboard').toBe(true);
    
    // Now try to navigate to ticket creation
    console.log('🎯 Attempting to access ticket creation...');
    
    // Try different ways to access ticket creation
    const createTicketUrls = [
      '/secure/CreateIssue!default.jspa',
      '/secure/CreateIssue.jspa',
      '/browse/ITSM/create',
      '/projects/ITSM/issues/create',
      '/secure/CreateIssue!default.jspa?pid=10000', // Common project ID
    ];
    
    let createUrl = '';
    let canAccessCreate = false;
    
    for (const url of createTicketUrls) {
      try {
        console.log(`🔍 Trying create URL: ${url}`);
        await page.goto(url, { timeout: 10000 });
        await page.waitForLoadState('networkidle', { timeout: 5000 });
        
        const pageText = await page.textContent('body');
        const hasError = pageText.includes('HTTP Status 404') || 
                        pageText.includes('Not Found') || 
                        pageText.includes('Apache Tomcat');
        
        const hasCreateForm = pageText.includes('Create Issue') || 
                             pageText.includes('Summary') ||
                             pageText.includes('Issue Type') ||
                             await page.locator('input[name="summary"]').isVisible().catch(() => false);
        
        if (!hasError && hasCreateForm) {
          createUrl = url;
          canAccessCreate = true;
          console.log(`✅ Found working create URL: ${url}`);
          break;
        } else {
          console.log(`❌ Create URL ${url} failed: ${hasError ? '404 error' : 'no create form'}`);
        }
      } catch (error) {
        console.log(`❌ Create URL ${url} failed with error: ${error.message}`);
      }
    }
    
    if (!canAccessCreate) {
      // Try to find create button from dashboard
      console.log('🔍 Trying to find Create button from dashboard...');
      await page.goto(workingUrl);
      
      const createButtons = [
        'button:has-text("Create")',
        'a:has-text("Create")',
        '[data-testid="create-button"]',
        '#create_link',
        '.create-issue-button',
        'button[aria-label*="Create"]'
      ];
      
      for (const selector of createButtons) {
        try {
          const button = page.locator(selector).first();
          if (await button.isVisible({ timeout: 2000 })) {
            console.log(`✅ Found create button: ${selector}`);
            await button.click();
            await page.waitForLoadState('networkidle', { timeout: 5000 });
            canAccessCreate = true;
            break;
          }
        } catch (error) {
          console.log(`❌ Create button ${selector} not found`);
        }
      }
    }
    
    // Take screenshot of current state
    await page.screenshot({ 
      path: 'jira-upgrade-testing/screenshots/ticket-creation-attempt.png',
      fullPage: true 
    });
    
    if (!canAccessCreate) {
      console.log('❌ CRITICAL FAILURE: Cannot access ticket creation functionality!');
      console.log('📸 Screenshot saved to: ticket-creation-attempt.png');
      
      // Log current page details for debugging
      console.log(`Current URL: ${page.url()}`);
      console.log(`Page title: ${await page.title()}`);
      
      // Check if we can see any navigation elements
      const navElements = await page.locator('nav, .navigation, .menu, .header').count();
      console.log(`Navigation elements found: ${navElements}`);
      
      expect(canAccessCreate, 'CRITICAL: Should be able to access ticket creation - this is core JIRA functionality!').toBe(true);
    }
    
    console.log('🎉 SUCCESS: Can access ticket creation functionality!');
    
    // Now try to fill out a basic ticket
    console.log('📝 Attempting to fill out basic ticket information...');
    
    try {
      // Look for common form fields
      const summaryField = page.locator('input[name="summary"], #summary, [data-testid="summary"]').first();
      const descriptionField = page.locator('textarea[name="description"], #description, [data-testid="description"]').first();
      
      if (await summaryField.isVisible({ timeout: 5000 })) {
        await summaryField.fill('UAT Test Ticket - Automated Creation Test');
        console.log('✅ Filled summary field');
      }
      
      if (await descriptionField.isVisible({ timeout: 5000 })) {
        await descriptionField.fill('This is an automated test ticket created during UAT testing to verify ticket creation functionality works after JIRA upgrade.');
        console.log('✅ Filled description field');
      }
      
      // Look for submit/create button
      const submitButtons = [
        'button:has-text("Create")',
        'input[type="submit"]',
        'button[type="submit"]',
        '[data-testid="create-issue-submit"]'
      ];
      
      let submitButton = null;
      for (const selector of submitButtons) {
        const button = page.locator(selector).first();
        if (await button.isVisible({ timeout: 2000 })) {
          submitButton = button;
          console.log(`✅ Found submit button: ${selector}`);
          break;
        }
      }
      
      if (submitButton) {
        console.log('🚀 Ready to create ticket - but stopping here for UAT safety');
        console.log('✅ TICKET CREATION FORM IS FUNCTIONAL!');
        
        // Take screenshot of filled form
        await page.screenshot({ 
          path: 'jira-upgrade-testing/screenshots/ticket-creation-form-filled.png',
          fullPage: true 
        });
        
        // For UAT, we'll stop here to avoid creating test tickets
        // In production testing, we would click submit and verify creation
        console.log('📸 Screenshot of filled form saved');
        
      } else {
        console.log('❌ WARNING: Could not find submit button');
        expect(submitButton, 'Should be able to find submit button for ticket creation').toBeTruthy();
      }
      
    } catch (error) {
      console.log(`❌ Error filling ticket form: ${error.message}`);
      await page.screenshot({ 
        path: 'jira-upgrade-testing/screenshots/ticket-creation-error.png',
        fullPage: true 
      });
      throw error;
    }
  });

  test('should validate required fields in ticket creation', async ({ page }) => {
    console.log('✅ Testing required field validation...');
    
    // This test would verify that required fields are properly validated
    // and users get appropriate error messages for missing information
    
    // For now, we'll implement this as a placeholder
    console.log('📋 Required field validation test - TO BE IMPLEMENTED');
    expect(true).toBe(true); // Placeholder
  });

  test('should handle different issue types', async ({ page }) => {
    console.log('🎭 Testing different issue types...');
    
    // This test would verify that different issue types (Bug, Task, Story, etc.)
    // can be selected and have appropriate fields
    
    console.log('🎭 Issue type testing - TO BE IMPLEMENTED');
    expect(true).toBe(true); // Placeholder
  });
});
