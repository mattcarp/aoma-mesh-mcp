import { chromium } from 'playwright';
import * as fs from 'fs';

async function runITSMAutomatedTests() {
  console.log('🎯 ITSM AUTOMATED TESTS - USING SAVED AUTH');
  console.log('==========================================');
  
  // Check if auth state exists
  const authFile = 'jira-auth-state.json';
  if (!fs.existsSync(authFile)) {
    console.log('❌ No authentication state found!');
    console.log('Please run: npx tsx auth-setup-once.ts first');
    return;
  }
  
  console.log('✅ Found saved authentication state');
  const storageState = JSON.parse(fs.readFileSync(authFile, 'utf8'));
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 200 
  });
  
  // REUSE the authentication state - no login needed!
  const context = await browser.newContext({
    storageState: storageState
  });
  
  const page = await context.newPage();
  
  try {
    const results = {
      timestamp: new Date().toISOString(),
      tests: [] as any[]
    };
    
    // Test 1: ITSM Project Access
    console.log('\n📍 Test 1: ITSM Project Access...');
    const start1 = Date.now();
    await page.goto('https://jirauat.smedigitalapps.com/jira/projects/ITSM');
    const time1 = Date.now() - start1;
    
    const title1 = await page.title();
    const success1 = !title1.includes('Log');
    
    results.tests.push({
      name: 'ITSM Project Access',
      loadTime: time1,
      success: success1,
      title: title1
    });
    
    console.log(`⏱️  Load Time: ${time1}ms`);
    console.log(`📝 Title: ${title1}`);
    console.log(`✅ Success: ${success1}`);
    
    if (!success1) {
      throw new Error('Authentication expired - please run auth-setup-once.ts again');
    }
    
    // Test 2: ITSM Issue Navigator
    console.log('\n📍 Test 2: ITSM Issue Navigator...');
    const start2 = Date.now();
    await page.goto('https://jirauat.smedigitalapps.com/jira/issues/?jql=project%20%3D%20ITSM');
    const time2 = Date.now() - start2;
    
    await page.waitForTimeout(5000); // Wait for results to load
    
    const title2 = await page.title();
    const success2 = !title2.includes('Log');
    
    console.log(`⏱️  Load Time: ${time2}ms`);
    console.log(`📝 Title: ${title2}`);
    console.log(`✅ Success: ${success2}`);
    
    // Extract ticket count information
    const ticketInfo = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      
      // Look for ITSM ticket patterns
      const patterns = [
        /(\d{1,3}(?:,\d{3})*)\s*of\s*(\d{1,3}(?:,\d{3})*)/i,
        /showing\s*(\d{1,3}(?:,\d{3})*)/i,
        /(\d{1,3}(?:,\d{3})*)\s*issues?/i,
        /total.*?(\d{1,3}(?:,\d{3})*)/i
      ];
      
      const matches: string[] = [];
      patterns.forEach(pattern => {
        const match = bodyText.match(pattern);
        if (match) matches.push(match[0]);
      });
      
      return {
        url: window.location.href,
        bodySnippet: bodyText.substring(0, 500),
        ticketMatches: matches.slice(0, 5)
      };
    });
    
    results.tests.push({
      name: 'ITSM Issue Navigator',
      loadTime: time2,
      success: success2,
      title: title2,
      ticketInfo: ticketInfo
    });
    
    console.log('\n📊 TICKET INFORMATION FOUND:');
    console.log(`🔗 URL: ${ticketInfo.url}`);
    console.log('🎯 Ticket patterns found:');
    ticketInfo.ticketMatches.forEach(match => console.log(`   ${match}`));
    
    // Test 3: Basic Search
    console.log('\n📍 Test 3: Basic ITSM Search...');
    const start3 = Date.now();
    await page.goto('https://jirauat.smedigitalapps.com/jira/issues/?jql=project%3DITSM%20AND%20status%3DOpen');
    const time3 = Date.now() - start3;
    
    await page.waitForTimeout(3000);
    
    const title3 = await page.title();
    const success3 = !title3.includes('Log');
    
    console.log(`⏱️  Load Time: ${time3}ms`);
    console.log(`📝 Title: ${title3}`);
    console.log(`✅ Success: ${success3}`);
    
    results.tests.push({
      name: 'ITSM Open Issues Search',
      loadTime: time3,
      success: success3,
      title: title3
    });
    
    // Test 4: Dashboard Performance
    console.log('\n📍 Test 4: Dashboard Performance...');
    const start4 = Date.now();
    await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
    const time4 = Date.now() - start4;
    
    const title4 = await page.title();
    const success4 = !title4.includes('Log');
    
    console.log(`⏱️  Load Time: ${time4}ms`);
    console.log(`📝 Title: ${title4}`);
    console.log(`✅ Success: ${success4}`);
    
    results.tests.push({
      name: 'Dashboard Performance',
      loadTime: time4,
      success: success4,
      title: title4
    });
    
    // Take final screenshot
    await page.screenshot({ 
      path: `itsm-automated-results-${Date.now()}.png`,
      fullPage: true 
    });
    
    // Save detailed results
    const resultsFile = `itsm-test-results-${Date.now()}.json`;
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
    
    // Final summary
    const totalTests = results.tests.length;
    const passedTests = results.tests.filter(t => t.success).length;
    const avgLoadTime = Math.round(results.tests.reduce((sum, t) => sum + t.loadTime, 0) / totalTests);
    
    console.log('\n🎉 ITSM AUTOMATED TEST RESULTS');
    console.log('===============================');
    console.log(`✅ Tests Passed: ${passedTests}/${totalTests}`);
    console.log(`⏱️  Average Load Time: ${avgLoadTime}ms`);
    console.log(`📄 Results saved: ${resultsFile}`);
    console.log('🔑 Authentication: PERSISTENT (no login required!)');
    
    if (passedTests === totalTests) {
      console.log('\n🏆 ALL TESTS PASSED! ITSM system fully accessible!');
    } else {
      console.log('\n⚠️  Some tests failed - check authentication or system status');
    }
    
  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
    if (error.message.includes('Authentication expired')) {
      console.log('\n💡 Solution: Run auth-setup-once.ts to refresh authentication');
    }
  } finally {
    await browser.close();
  }
}

runITSMAutomatedTests().catch(console.error); 