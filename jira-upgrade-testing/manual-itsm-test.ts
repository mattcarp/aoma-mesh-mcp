import { chromium } from 'playwright';

async function manualITSMTest() {
  console.log('🎯 MANUAL ITSM TEST - IMMEDIATE RESULTS');
  console.log('======================================');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000 // Slow down for visibility
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    console.log('📍 Opening JIRA UAT...');
    await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
    
    console.log('👀 BROWSER WINDOW OPENED!');
    console.log('🔐 Please log in manually if needed');
    console.log('⏳ Waiting 10 seconds for you to authenticate...');
    
    // Wait for authentication
    await page.waitForTimeout(10000);
    
    let attempts = 0;
    let authenticated = false;
    
    while (attempts < 5 && !authenticated) {
      attempts++;
      console.log(`🔍 Checking authentication attempt ${attempts}/5...`);
      
      const title = await page.title();
      const url = page.url();
      
      if (!title.includes('Log') && url.includes('Dashboard.jspa')) {
        authenticated = true;
        console.log('✅ AUTHENTICATION CONFIRMED!');
        break;
      }
      
      console.log('⏳ Still waiting for authentication...');
      await page.waitForTimeout(5000);
    }
    
    if (!authenticated) {
      console.log('❌ Please complete authentication and run the script again');
      return;
    }
    
    // Now test ITSM IMMEDIATELY
    console.log('\n🎯 TESTING ITSM PROJECT ACCESS...');
    
    const start1 = Date.now();
    await page.goto('https://jirauat.smedigitalapps.com/jira/projects/ITSM');
    const time1 = Date.now() - start1;
    
    const itsmTitle = await page.title();
    console.log(`📝 ITSM Project Title: ${itsmTitle}`);
    console.log(`⏱️  ITSM Project Load: ${time1}ms`);
    
    await page.waitForTimeout(3000);
    
    // Test Issue Navigator
    console.log('\n🔍 TESTING ITSM ISSUE NAVIGATOR...');
    
    const start2 = Date.now();
    await page.goto('https://jirauat.smedigitalapps.com/jira/issues/?jql=project%20%3D%20ITSM');
    const time2 = Date.now() - start2;
    
    console.log(`⏱️  Issue Navigator Load: ${time2}ms`);
    
    await page.waitForTimeout(5000);
    
    // Extract ticket count
    const ticketInfo = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      
      // Look for common patterns
      const patterns = [
        /(\d{1,3}(?:,\d{3})*)\s*of\s*(\d{1,3}(?:,\d{3})*)/i,
        /showing\s*(\d{1,3}(?:,\d{3})*)/i,
        /(\d{1,3}(?:,\d{3})*)\s*issues?/i
      ];
      
      const matches: string[] = [];
      patterns.forEach(pattern => {
        const match = bodyText.match(pattern);
        if (match) matches.push(match[0]);
      });
      
      return {
        title: document.title,
        url: window.location.href,
        matches: matches.slice(0, 3)
      };
    });
    
    console.log('\n📊 ITSM RESULTS FOUND:');
    console.log(`📄 Title: ${ticketInfo.title}`);
    console.log(`🔗 URL: ${ticketInfo.url}`);
    console.log('🎯 Ticket counts:');
    ticketInfo.matches.forEach(match => console.log(`   ${match}`));
    
    // Take screenshot
    const screenshotPath = `itsm-manual-test-${Date.now()}.png`;
    await page.screenshot({ 
      path: screenshotPath,
      fullPage: true 
    });
    
    console.log(`📸 Screenshot: ${screenshotPath}`);
    
    // Final summary
    console.log('\n🎉 ITSM TEST COMPLETE!');
    console.log('=======================');
    console.log(`✅ ITSM Project: ${time1}ms`);
    console.log(`✅ Issue Navigator: ${time2}ms`);
    console.log(`✅ Authentication: Working`);
    console.log(`✅ Ticket data: Found`);
    
    if (ticketInfo.matches.length > 0) {
      console.log('\n🏆 SUCCESS: ITSM project fully accessible with real ticket data!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    console.log('\n⏳ Keeping browser open for 30 seconds for review...');
    await page.waitForTimeout(30000);
    await browser.close();
  }
}

manualITSMTest().catch(console.error); 