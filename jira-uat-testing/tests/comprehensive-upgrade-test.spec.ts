import { test, expect } from '@playwright/test';
import { authenticateJira, waitForJiraLoad } from './auth-setup';

test.describe('Comprehensive JIRA Upgrade Testing', () => {
  test('should perform complete JIRA upgrade validation in single session', async ({ page }) => {
    console.log('🚀 Starting comprehensive JIRA 10.3 upgrade validation...');
    
    // Step 1: Authenticate (only once!)
    console.log('\n📝 Step 1: Authentication');
    await authenticateJira(page);
    
    // Step 2: Verify Dashboard Access
    console.log('\n📝 Step 2: Dashboard Access');
    await page.goto('/jira/dashboard.jspa');
    await waitForJiraLoad(page);
    
    const dashboardAccess = await page.evaluate(() => {
      return window.location.href.includes('dashboard') || 
             window.location.href.includes('Dashboard');
    });
    
    expect(dashboardAccess).toBe(true);
    console.log('✅ Dashboard access verified');
    
    // Step 3: ITSM Project Validation
    console.log('\n📝 Step 3: ITSM Project Validation');
    await page.goto('/browse/ITSM');
    await waitForJiraLoad(page);
    
    const itsmAccess = await page.evaluate(() => {
      const errorElement = document.querySelector('.error, .aui-message-error');
      if (errorElement && errorElement.textContent?.includes('does not exist')) {
        return false;
      }
      return !window.location.href.includes('error');
    });
    
    expect(itsmAccess).toBe(true);
    console.log('✅ ITSM project access verified');
    
    // Step 4: ITSM Ticket Search
    console.log('\n📝 Step 4: ITSM Ticket Search');
    await page.goto('/issues/?jql=project%20%3D%20ITSM%20ORDER%20BY%20created%20DESC');
    await waitForJiraLoad(page);
    
    const itsmTickets = await page.evaluate(() => {
      const issueTable = document.querySelector('.issue-table, .navigator-content');
      const issueRows = document.querySelectorAll('[data-issuekey]');
      const noIssuesMessage = document.querySelector('.no-issues-message');
      
      return {
        hasTable: !!issueTable,
        issueCount: issueRows.length,
        hasNoIssuesMessage: !!noIssuesMessage,
        canSearch: !!issueTable || !!noIssuesMessage
      };
    });
    
    expect(itsmTickets.canSearch).toBe(true);
    console.log(`✅ ITSM search verified - found ${itsmTickets.issueCount} tickets`);
    
    // Step 5: DPSA Project Validation
    console.log('\n📝 Step 5: DPSA Project Validation');
    await page.goto('/browse/DPSA');
    await waitForJiraLoad(page);
    
    const dpsaAccess = await page.evaluate(() => {
      const errorElement = document.querySelector('.error, .aui-message-error');
      if (errorElement && errorElement.textContent?.includes('does not exist')) {
        return false;
      }
      return !window.location.href.includes('error');
    });
    
    expect(dpsaAccess).toBe(true);
    console.log('✅ DPSA project access verified');
    
    // Step 6: DPSA Ticket Search
    console.log('\n📝 Step 6: DPSA Ticket Search');
    await page.goto('/issues/?jql=project%20%3D%20DPSA%20ORDER%20BY%20created%20DESC');
    await waitForJiraLoad(page);
    
    const dpsaTickets = await page.evaluate(() => {
      const issueTable = document.querySelector('.issue-table, .navigator-content');
      const issueRows = document.querySelectorAll('[data-issuekey]');
      const noIssuesMessage = document.querySelector('.no-issues-message');
      
      return {
        hasTable: !!issueTable,
        issueCount: issueRows.length,
        hasNoIssuesMessage: !!noIssuesMessage,
        canSearch: !!issueTable || !!noIssuesMessage
      };
    });
    
    expect(dpsaTickets.canSearch).toBe(true);
    console.log(`✅ DPSA search verified - found ${dpsaTickets.issueCount} tickets`);
    
    // Step 7: General Search Functionality
    console.log('\n📝 Step 7: General Search Functionality');
    await page.goto('/issues/');
    await waitForJiraLoad(page);
    
    // Test quick search
    const searchInput = await page.locator('#quickSearchInput, .quick-search-input').first();
    await searchInput.fill('project in (ITSM, DPSA)');
    await searchInput.press('Enter');
    await waitForJiraLoad(page);
    
    const searchResults = await page.evaluate(() => {
      const resultContainer = document.querySelector('.issue-list, .navigator-content');
      const issues = document.querySelectorAll('[data-issuekey]');
      
      return {
        hasResults: !!resultContainer,
        issueCount: issues.length,
        canSearch: !!resultContainer
      };
    });
    
    expect(searchResults.canSearch).toBe(true);
    console.log(`✅ General search verified - found ${searchResults.issueCount} total tickets`);
    
    // Step 8: Platform Performance Check
    console.log('\n📝 Step 8: Platform Performance Check');
    const performanceStart = Date.now();
    await page.goto('/secure/Dashboard.jspa');
    await waitForJiraLoad(page);
    const performanceEnd = Date.now();
    
    const loadTime = performanceEnd - performanceStart;
    console.log(`📊 Dashboard load time: ${loadTime}ms`);
    
    // Reasonable load time for upgraded platform
    expect(loadTime).toBeLessThan(15000); // 15 seconds max
    console.log('✅ Platform performance acceptable');
    
    // Final Summary
    console.log('\n🎉 COMPREHENSIVE JIRA UPGRADE VALIDATION COMPLETE!');
    console.log('================================================================================');
    console.log('✅ Authentication: PASSED');
    console.log('✅ Dashboard Access: PASSED');
    console.log('✅ ITSM Project Access: PASSED');
    console.log(`✅ ITSM Tickets: ${itsmTickets.issueCount} found`);
    console.log('✅ DPSA Project Access: PASSED');
    console.log(`✅ DPSA Tickets: ${dpsaTickets.issueCount} found`);
    console.log('✅ Search Functionality: PASSED');
    console.log(`✅ Platform Performance: ${loadTime}ms (acceptable)`);
    console.log('================================================================================');
    console.log('🎯 JIRA 10.3 UPGRADE VALIDATION: SUCCESS! 🎯');
    console.log('📧 Ready for Irina\'s team review!');
    
    // Wait a moment before closing to see results
    await page.waitForTimeout(5000);
  });
}); 