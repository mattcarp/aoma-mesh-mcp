import { test, expect } from '@playwright/test';

test.describe('Direct JIRA Validation (Already Authenticated)', () => {
  test('should validate JIRA functionality assuming already logged in', async ({ page }) => {
    console.log('🚀 Starting direct JIRA validation (skipping auth)...');
    
    // Go directly to dashboard - assume already logged in
    console.log('\n📝 Step 1: Dashboard Access Test');
    await page.goto('https://jirauat.smedigitalapps.com/jira/dashboard.jspa');
    await page.waitForLoadState('networkidle');
    
    const dashboardAccess = await page.evaluate(() => {
      const url = window.location.href;
      const isLoggedIn = !url.includes('login') && 
                        (url.includes('dashboard') || url.includes('Dashboard'));
      const hasError = document.querySelector('.error, .aui-message-error');
      
      return {
        isLoggedIn,
        hasError: !!hasError,
        currentUrl: url,
        pageTitle: document.title
      };
    });
    
    console.log(`Current URL: ${dashboardAccess.currentUrl}`);
    console.log(`Page Title: ${dashboardAccess.pageTitle}`);
    console.log(`Is Logged In: ${dashboardAccess.isLoggedIn}`);
    
    if (!dashboardAccess.isLoggedIn) {
      console.log('❌ Not logged in - please complete login manually first');
      throw new Error('User needs to complete login manually first');
    }
    
    expect(dashboardAccess.isLoggedIn).toBe(true);
    console.log('✅ Dashboard access verified');
    
    // Test ITSM Project Access
    console.log('\n📝 Step 2: ITSM Project Access');
    await page.goto('https://jirauat.smedigitalapps.com/browse/ITSM');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const itsmAccess = await page.evaluate(() => {
      const url = window.location.href;
      const errorElement = document.querySelector('.error, .aui-message-error');
      const errorText = errorElement?.textContent?.toLowerCase() || '';
      
      return {
        canAccess: !errorText.includes('does not exist') && !errorText.includes('permission'),
        hasError: !!errorElement,
        errorText: errorText,
        currentUrl: url
      };
    });
    
    console.log(`ITSM URL: ${itsmAccess.currentUrl}`);
    console.log(`Can Access ITSM: ${itsmAccess.canAccess}`);
    if (itsmAccess.hasError) {
      console.log(`Error: ${itsmAccess.errorText}`);
    }
    
    expect(itsmAccess.canAccess).toBe(true);
    console.log('✅ ITSM project access verified');
    
    // Test ITSM Ticket Search
    console.log('\n📝 Step 3: ITSM Ticket Search');
    await page.goto('https://jirauat.smedigitalapps.com/issues/?jql=project%20%3D%20ITSM%20ORDER%20BY%20created%20DESC');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    const itsmTickets = await page.evaluate(() => {
      const issueTable = document.querySelector('.issue-table, .navigator-content, .split-view');
      const issueRows = document.querySelectorAll('[data-issuekey]');
      const noIssuesMessage = document.querySelector('.no-issues-message, .no-results');
      const pagingElement = document.querySelector('.showing, .results-count-total, .pagination-info');
      const pagingText = pagingElement?.textContent || '';
      
      return {
        hasTable: !!issueTable,
        issueCount: issueRows.length,
        hasNoIssuesMessage: !!noIssuesMessage,
        canSearch: !!issueTable || !!noIssuesMessage,
        pagingText: pagingText,
        currentUrl: window.location.href
      };
    });
    
    console.log(`ITSM Search URL: ${itsmTickets.currentUrl}`);
    console.log(`Found ${itsmTickets.issueCount} ITSM tickets`);
    console.log(`Paging info: ${itsmTickets.pagingText}`);
    
    expect(itsmTickets.canSearch).toBe(true);
    console.log('✅ ITSM search functionality verified');
    
    // Test DPSA Project Access
    console.log('\n📝 Step 4: DPSA Project Access');
    await page.goto('https://jirauat.smedigitalapps.com/browse/DPSA');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const dpsaAccess = await page.evaluate(() => {
      const url = window.location.href;
      const errorElement = document.querySelector('.error, .aui-message-error');
      const errorText = errorElement?.textContent?.toLowerCase() || '';
      
      return {
        canAccess: !errorText.includes('does not exist') && !errorText.includes('permission'),
        hasError: !!errorElement,
        errorText: errorText,
        currentUrl: url
      };
    });
    
    console.log(`DPSA URL: ${dpsaAccess.currentUrl}`);
    console.log(`Can Access DPSA: ${dpsaAccess.canAccess}`);
    if (dpsaAccess.hasError) {
      console.log(`Error: ${dpsaAccess.errorText}`);
    }
    
    expect(dpsaAccess.canAccess).toBe(true);
    console.log('✅ DPSA project access verified');
    
    // Test DPSA Ticket Search
    console.log('\n📝 Step 5: DPSA Ticket Search');
    await page.goto('https://jirauat.smedigitalapps.com/issues/?jql=project%20%3D%20DPSA%20ORDER%20BY%20created%20DESC');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    const dpsaTickets = await page.evaluate(() => {
      const issueTable = document.querySelector('.issue-table, .navigator-content, .split-view');
      const issueRows = document.querySelectorAll('[data-issuekey]');
      const noIssuesMessage = document.querySelector('.no-issues-message, .no-results');
      const pagingElement = document.querySelector('.showing, .results-count-total, .pagination-info');
      const pagingText = pagingElement?.textContent || '';
      
      return {
        hasTable: !!issueTable,
        issueCount: issueRows.length,
        hasNoIssuesMessage: !!noIssuesMessage,
        canSearch: !!issueTable || !!noIssuesMessage,
        pagingText: pagingText,
        currentUrl: window.location.href
      };
    });
    
    console.log(`DPSA Search URL: ${dpsaTickets.currentUrl}`);
    console.log(`Found ${dpsaTickets.issueCount} DPSA tickets`);
    console.log(`Paging info: ${dpsaTickets.pagingText}`);
    
    expect(dpsaTickets.canSearch).toBe(true);
    console.log('✅ DPSA search functionality verified');
    
    // Performance Test
    console.log('\n📝 Step 6: Platform Performance Test');
    const performanceStart = Date.now();
    await page.goto('https://jirauat.smedigitalapps.com/secure/Dashboard.jspa');
    await page.waitForLoadState('networkidle');
    const performanceEnd = Date.now();
    
    const loadTime = performanceEnd - performanceStart;
    console.log(`📊 Dashboard load time: ${loadTime}ms`);
    
    expect(loadTime).toBeLessThan(15000); // 15 seconds max
    console.log('✅ Platform performance acceptable');
    
    // Final Summary
    console.log('\n🎉 DIRECT JIRA VALIDATION COMPLETE!');
    console.log('================================================================================');
    console.log('✅ Dashboard Access: PASSED');
    console.log('✅ ITSM Project Access: PASSED');
    console.log(`✅ ITSM Tickets: ${itsmTickets.issueCount} found`);
    console.log('✅ DPSA Project Access: PASSED');
    console.log(`✅ DPSA Tickets: ${dpsaTickets.issueCount} found`);
    console.log(`✅ Platform Performance: ${loadTime}ms`);
    console.log('================================================================================');
    console.log('🎯 JIRA 10.3 UPGRADE VALIDATION: SUCCESS! 🎯');
    console.log('📧 Ready for Irina\'s review! 🔥');
    
    // Keep browser open to see results
    await page.waitForTimeout(3000);
  });
}); 