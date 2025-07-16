import { chromium } from 'playwright';
import { readFile } from 'fs/promises';

/**
 * Quick Enterprise Test - Uses Existing Session
 * 
 * This bypasses the session capture and directly uses our existing session
 * to run comprehensive tests immediately.
 */

async function quickEnterpriseTest() {
  console.log('🚀 Quick Enterprise Test - Using Existing Session');
  
  try {
    // Load our existing session
    console.log('📂 Loading existing session data...');
    const sessionData = JSON.parse(await readFile('jira-uat-session-1752610130300.json', 'utf-8'));
    
    // Convert to Playwright storageState format
    const storageState = {
      cookies: sessionData.cookies,
      origins: [{
        origin: 'https://jirauat.smedigitalapps.com',
        localStorage: Object.entries(sessionData.localStorage || {}).map(([name, value]) => ({ 
          name, 
          value: String(value) 
        }))
      }]
    };
    
    console.log(`✅ Session loaded: ${sessionData.cookies.length} cookies, captured at ${sessionData.timestamp}`);
    
    // Launch browser with session
    const browser = await chromium.launch({ 
      headless: false,  // So you can see what's happening
      slowMo: 500       // Slow down for visibility
    });
    
    const context = await browser.newContext({
      storageState,
      viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    
    // Test 1: Dashboard Performance
    console.log('🎯 Test 1: Dashboard Access and Performance');
    const startTime = Date.now();
    
    await page.goto('https://jirauat.smedigitalapps.com/jira/dashboard.jspa');
    await page.waitForLoadState('domcontentloaded');
    
    const dashboardTime = Date.now() - startTime;
    const title = await page.title();
    
    console.log(`✅ Dashboard loaded in ${dashboardTime}ms`);
    console.log(`📋 Page title: ${title}`);
    
    // Check if we're actually logged in
    const isLoggedIn = !title.toLowerCase().includes('log in') && !page.url().includes('login');
    console.log(`🔐 Authentication status: ${isLoggedIn ? 'LOGGED IN ✅' : 'NOT LOGGED IN ❌'}`);
    
    if (!isLoggedIn) {
      console.log('❌ Session expired or invalid - need to re-capture');
      await browser.close();
      return;
    }
    
    // Test 2: ITSM Project Access
    console.log('🎯 Test 2: ITSM Project Access');
    const itsmStart = Date.now();
    
    await page.goto('https://jirauat.smedigitalapps.com/browse/ITSM');
    await page.waitForLoadState('domcontentloaded');
    
    const itsmTime = Date.now() - itsmStart;
    const itsmTitle = await page.title();
    const hasErrors = await page.locator('.error, .aui-message-error').count();
    
    console.log(`✅ ITSM project loaded in ${itsmTime}ms`);
    console.log(`📋 ITSM title: ${itsmTitle}`);
    console.log(`❌ Error count: ${hasErrors}`);
    
    // Test 3: DPSA Project Access  
    console.log('🎯 Test 3: DPSA Project Access');
    const dpsaStart = Date.now();
    
    await page.goto('https://jirauat.smedigitalapps.com/browse/DPSA');
    await page.waitForLoadState('domcontentloaded');
    
    const dpsaTime = Date.now() - dpsaStart;
    const dpsaTitle = await page.title();
    const dpsaErrors = await page.locator('.error, .aui-message-error').count();
    
    console.log(`✅ DPSA project loaded in ${dpsaTime}ms`);
    console.log(`📋 DPSA title: ${dpsaTitle}`);
    console.log(`❌ Error count: ${dpsaErrors}`);
    
    // Test 4: Issue Navigator with Real Query
    console.log('🎯 Test 4: Issue Navigator Data-Driven Test');
    const navStart = Date.now();
    
    const query = 'project in (ITSM, DPSA) ORDER BY created DESC';
    const encodedQuery = encodeURIComponent(query);
    await page.goto(`https://jirauat.smedigitalapps.com/issues/?jql=${encodedQuery}`);
    
    // Wait for results
    await page.waitForSelector('.issue-table, .navigator-results, .no-results', { timeout: 30000 });
    
    const navTime = Date.now() - navStart;
    const resultCount = await page.locator('.issue-table tbody tr, .issue-row').count();
    const hasNoResults = await page.locator('.no-results, .navigator-no-results').count() > 0;
    
    console.log(`✅ Issue Navigator loaded in ${navTime}ms`);
    console.log(`🎫 Found ${resultCount} issues ${hasNoResults ? '(or no results message)' : ''}`);
    
    // Test 5: Performance Metrics
    console.log('🎯 Test 5: Performance Metrics Collection');
    
    const performanceMetrics = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      
      return {
        domContentLoaded: nav.domContentLoadedEventEnd - nav.fetchStart,
        loadComplete: nav.loadEventEnd - nav.fetchStart,
        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
        resourceCount: performance.getEntriesByType('resource').length
      };
    });
    
    console.log('⚡ Performance Metrics:');
    console.log(`   🏁 DOM Content Loaded: ${performanceMetrics.domContentLoaded}ms`);
    console.log(`   🎨 First Paint: ${performanceMetrics.firstPaint}ms`);
    console.log(`   🖼️ First Contentful Paint: ${performanceMetrics.firstContentfulPaint}ms`);
    console.log(`   🌐 Network Requests: ${performanceMetrics.resourceCount}`);
    
    // Summary Report
    console.log('\n🎉 QUICK ENTERPRISE TEST SUMMARY:');
    console.log('=====================================');
    console.log(`✅ Dashboard: ${dashboardTime}ms`);
    console.log(`✅ ITSM: ${itsmTime}ms ${hasErrors > 0 ? '❌ HAS ERRORS' : '✅ NO ERRORS'}`);
    console.log(`✅ DPSA: ${dpsaTime}ms ${dpsaErrors > 0 ? '❌ HAS ERRORS' : '✅ NO ERRORS'}`);
    console.log(`✅ Issue Navigator: ${navTime}ms (${resultCount} results)`);
    console.log(`✅ Session Working: ${isLoggedIn ? 'YES' : 'NO'}`);
    
    const avgTime = (dashboardTime + itsmTime + dpsaTime + navTime) / 4;
    console.log(`📊 Average Load Time: ${avgTime.toFixed(0)}ms`);
    
    if (avgTime < 10000) {
      console.log('🎯 PERFORMANCE: EXCELLENT (< 10s)');
    } else if (avgTime < 20000) {
      console.log('⚠️ PERFORMANCE: ACCEPTABLE (< 20s)');
    } else {
      console.log('🚨 PERFORMANCE: NEEDS IMPROVEMENT (> 20s)');
    }
    
    console.log('\n🦁 Ready to unleash more comprehensive tests!');
    
    // Keep browser open for 10 seconds so you can see the results
    console.log('⏰ Keeping browser open for 10 seconds...');
    await page.waitForTimeout(10000);
    
    await browser.close();
    
  } catch (error) {
    console.error('❌ Quick enterprise test failed:', error);
    throw error;
  }
}

// Run the test
quickEnterpriseTest().catch(console.error); 