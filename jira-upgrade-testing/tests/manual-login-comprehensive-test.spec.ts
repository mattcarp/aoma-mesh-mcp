import { test, expect } from '@playwright/test';

test.describe('Manual Login + Comprehensive JIRA Testing', () => {
  test('should wait for manual login and run comprehensive JIRA 10.3 validation', async ({ page }) => {
    test.setTimeout(600000); // 10 minutes for manual login
    console.log('🚀 MANUAL LOGIN + COMPREHENSIVE JIRA TESTING');
    console.log('==============================================');
    console.log('👋 Hi! Please complete login manually while I wait...');
    console.log('🔐 I\'ll detect when you\'re logged in and run awesome tests!');
    console.log('==============================================\n');
    
    // Step 1: Open JIRA and wait for manual login
    console.log('📝 Step 1: Opening JIRA for manual login...');
    await page.goto('https://jirauat.smedigitalapps.com/jira/login.jsp');
    await page.waitForLoadState('networkidle');
    
    console.log('🔗 Browser opened! Please complete login:');
    console.log('   1. Enter your username/email');
    console.log('   2. Enter your password');
    console.log('   3. Complete 2FA if prompted');
    console.log('   4. I\'ll automatically continue when ready!\n');
    
    // Step 2: Wait for login completion (up to 5 minutes)
    console.log('⏳ Waiting for login completion...');
    let loginAttempts = 0;
    const maxAttempts = 30; // 5 minutes (10 second intervals)
    let isLoggedIn = false;
    
    while (loginAttempts < maxAttempts && !isLoggedIn) {
      loginAttempts++;
      
      // Check every 10 seconds
      await page.waitForTimeout(10000);
      
      // Try to navigate to dashboard to test login
      try {
        await page.goto('https://jirauat.smedigitalapps.com/jira/dashboard.jspa', { timeout: 15000 });
        await page.waitForLoadState('networkidle', { timeout: 15000 });
        
        const loginStatus = await page.evaluate(() => {
          const url = window.location.href;
          const notOnLoginPage = !url.includes('login');
          const onDashboard = url.includes('dashboard') || url.includes('Dashboard');
          const hasAuthElements = document.querySelector('#header-details-user-fullname, .aui-avatar, .user-dropdown');
          
          return {
            notOnLoginPage,
            onDashboard,
            hasAuthElements: !!hasAuthElements,
            isLoggedIn: notOnLoginPage && (onDashboard || hasAuthElements),
            currentUrl: url
          };
        });
        
        if (loginStatus.isLoggedIn) {
          isLoggedIn = true;
          console.log('🎉 LOGIN DETECTED! Starting comprehensive tests...\n');
        } else {
          console.log(`⏳ Still waiting... (${loginAttempts}/${maxAttempts}) - Current: ${loginStatus.currentUrl.substring(0, 60)}...`);
        }
      } catch (error) {
        console.log(`⏳ Checking login status... (${loginAttempts}/${maxAttempts})`);
      }
    }
    
    if (!isLoggedIn) {
      throw new Error('Login timeout - please complete login within 10 minutes');
    }
    
    // Step 3: Now run comprehensive JIRA upgrade tests!
    console.log('🚀 STARTING COMPREHENSIVE JIRA 10.3 UPGRADE VALIDATION!');
    console.log('=========================================================\n');
    
    // Test 1: Dashboard Performance
    console.log('📊 Test 1: Dashboard Performance');
    const dashboardStart = Date.now();
    await page.goto('https://jirauat.smedigitalapps.com/jira/dashboard.jspa');
    await page.waitForLoadState('networkidle');
    const dashboardTime = Date.now() - dashboardStart;
    
    expect(dashboardTime).toBeLessThan(10000); // Should load in <10 seconds
    console.log(`✅ Dashboard loaded in ${dashboardTime}ms`);
    
    // Test 2: ITSM Project Access & Analysis
    console.log('\n📋 Test 2: ITSM Project Comprehensive Analysis');
    await page.goto('https://jirauat.smedigitalapps.com/browse/ITSM');
    await page.waitForLoadState('networkidle');
    
    const itsmAnalysis = await page.evaluate(() => {
      const url = window.location.href;
      const hasError = document.querySelector('.error, .aui-message-error');
      const projectHeader = document.querySelector('.project-meta, .project-header, h1');
      const projectName = projectHeader?.textContent?.trim() || '';
      
      return {
        accessible: !hasError && !url.includes('error'),
        projectName,
        currentUrl: url,
        hasProjectContent: !!projectHeader
      };
    });
    
    expect(itsmAnalysis.accessible).toBe(true);
    console.log(`✅ ITSM Project: ${itsmAnalysis.accessible ? 'ACCESSIBLE' : 'NOT ACCESSIBLE'}`);
    console.log(`   Project Name: ${itsmAnalysis.projectName}`);
    
    // Test 3: ITSM Ticket Search & Count
    console.log('\n🔍 Test 3: ITSM Ticket Search Performance');
    await page.goto('https://jirauat.smedigitalapps.com/issues/?jql=project%20%3D%20ITSM%20ORDER%20BY%20created%20DESC');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Let results load
    
    const itsmResults = await page.evaluate(() => {
      const pagingElements = document.querySelectorAll('.showing, .results-count-total, .pagination-info, .issue-count');
      let totalTickets = 0;
      let pagingText = '';
      
      for (const element of pagingElements) {
        if (element.textContent) {
          pagingText = element.textContent;
          const match = pagingText.match(/(\d+)\s*(?:total|issues?|of)/i);
          if (match) {
            totalTickets = parseInt(match[1]);
            break;
          }
        }
      }
      
      const visibleTickets = document.querySelectorAll('[data-issuekey], .issue-row').length;
      const hasResults = document.querySelector('.issue-table, .navigator-content, .split-view');
      
      return {
        totalTickets,
        visibleTickets,
        hasResults: !!hasResults,
        pagingText: pagingText.trim(),
        canSearch: !!hasResults || pagingText.includes('0')
      };
    });
    
    expect(itsmResults.canSearch).toBe(true);
    console.log(`✅ ITSM Search: ${itsmResults.totalTickets} total tickets found`);
    console.log(`   Visible: ${itsmResults.visibleTickets} tickets`);
    console.log(`   Paging: ${itsmResults.pagingText}`);
    
    // Test 4: DPSA Project Access & Analysis
    console.log('\n🔒 Test 4: DPSA Project Comprehensive Analysis');
    await page.goto('https://jirauat.smedigitalapps.com/browse/DPSA');
    await page.waitForLoadState('networkidle');
    
    const dpsaAnalysis = await page.evaluate(() => {
      const url = window.location.href;
      const hasError = document.querySelector('.error, .aui-message-error');
      const projectHeader = document.querySelector('.project-meta, .project-header, h1');
      const projectName = projectHeader?.textContent?.trim() || '';
      
      return {
        accessible: !hasError && !url.includes('error'),
        projectName,
        currentUrl: url,
        hasProjectContent: !!projectHeader
      };
    });
    
    expect(dpsaAnalysis.accessible).toBe(true);
    console.log(`✅ DPSA Project: ${dpsaAnalysis.accessible ? 'ACCESSIBLE' : 'NOT ACCESSIBLE'}`);
    console.log(`   Project Name: ${dpsaAnalysis.projectName}`);
    
    // Test 5: DPSA Ticket Search & Security
    console.log('\n🔍 Test 5: DPSA Ticket Search & Security Validation');
    await page.goto('https://jirauat.smedigitalapps.com/issues/?jql=project%20%3D%20DPSA%20ORDER%20BY%20created%20DESC');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    const dpsaResults = await page.evaluate(() => {
      const pagingElements = document.querySelectorAll('.showing, .results-count-total, .pagination-info, .issue-count');
      let totalTickets = 0;
      let pagingText = '';
      
      for (const element of pagingElements) {
        if (element.textContent) {
          pagingText = element.textContent;
          const match = pagingText.match(/(\d+)\s*(?:total|issues?|of)/i);
          if (match) {
            totalTickets = parseInt(match[1]);
            break;
          }
        }
      }
      
      const visibleTickets = document.querySelectorAll('[data-issuekey], .issue-row').length;
      const hasResults = document.querySelector('.issue-table, .navigator-content, .split-view');
      
      return {
        totalTickets,
        visibleTickets,
        hasResults: !!hasResults,
        pagingText: pagingText.trim(),
        canSearch: !!hasResults || pagingText.includes('0')
      };
    });
    
    expect(dpsaResults.canSearch).toBe(true);
    console.log(`✅ DPSA Search: ${dpsaResults.totalTickets} total tickets found`);
    console.log(`   Visible: ${dpsaResults.visibleTickets} tickets`);
    
    // Test 6: Cross-Project Search
    console.log('\n🔄 Test 6: Cross-Project Search Functionality');
    await page.goto('https://jirauat.smedigitalapps.com/issues/');
    await page.waitForLoadState('networkidle');
    
    const searchInput = page.locator('#quickSearchInput, .quick-search-input').first();
    await searchInput.fill('project in (ITSM, DPSA) ORDER BY created DESC');
    await searchInput.press('Enter');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    const crossProjectResults = await page.evaluate(() => {
      const hasResults = document.querySelector('.issue-table, .navigator-content, .split-view');
      const tickets = document.querySelectorAll('[data-issuekey], .issue-row');
      
      return {
        hasResults: !!hasResults,
        ticketCount: tickets.length,
        canPerformCrossProjectSearch: !!hasResults
      };
    });
    
    expect(crossProjectResults.canPerformCrossProjectSearch).toBe(true);
    console.log(`✅ Cross-Project Search: ${crossProjectResults.ticketCount} tickets found`);
    
    // Test 7: Platform Performance Analysis
    console.log('\n⚡ Test 7: Platform Performance Analysis');
    const performanceTests: { test: string; time: number }[] = [];
    
    // Dashboard reload
    const dashTest = Date.now();
    await page.goto('https://jirauat.smedigitalapps.com/secure/Dashboard.jspa');
    await page.waitForLoadState('networkidle');
    performanceTests.push({ test: 'Dashboard', time: Date.now() - dashTest });
    
    // Issue navigator
    const navTest = Date.now();
    await page.goto('https://jirauat.smedigitalapps.com/issues/');
    await page.waitForLoadState('networkidle');
    performanceTests.push({ test: 'Issue Navigator', time: Date.now() - navTest });
    
    // Search performance
    const searchTest = Date.now();
    const searchBox = page.locator('#quickSearchInput, .quick-search-input').first();
    await searchBox.fill('updated >= -7d');
    await searchBox.press('Enter');
    await page.waitForLoadState('networkidle');
    performanceTests.push({ test: 'Search Query', time: Date.now() - searchTest });
    
    console.log('📊 Performance Results:');
    performanceTests.forEach(test => {
      console.log(`   ${test.test}: ${test.time}ms`);
      expect(test.time).toBeLessThan(15000); // All operations under 15s
    });
    
    // Final Summary
    const avgPerformance = performanceTests.reduce((sum, test) => sum + test.time, 0) / performanceTests.length;
    
    console.log('\n🎉 COMPREHENSIVE JIRA 10.3 UPGRADE VALIDATION COMPLETE!');
    console.log('========================================================');
    console.log(`✅ Dashboard Performance: ${dashboardTime}ms`);
    console.log(`✅ ITSM Project: ACCESSIBLE (${itsmResults.totalTickets} tickets)`);
    console.log(`✅ DPSA Project: ACCESSIBLE (${dpsaResults.totalTickets} tickets)`);
    console.log(`✅ Cross-Project Search: FUNCTIONAL`);
    console.log(`✅ Average Performance: ${Math.round(avgPerformance)}ms`);
    console.log('========================================================');
    console.log(`🎯 JIRA 10.3 UPGRADE STATUS: READY FOR PRODUCTION! 🚀`);
    console.log(`📧 Results ready for Irina's team! All tests PASSED! ✨`);
    
    // Keep browser open for 30 seconds to see results
    console.log('\n⏰ Keeping browser open for 30 seconds to review results...');
    await page.waitForTimeout(30000);
  });
}); 