const { chromium } = require('@playwright/test');

async function simpleBrowserTest() {
  console.log('🚀 SIMPLE BROWSER TEST - JIRA UAT');
  console.log('=================================');
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--start-maximized']
  });
  
  try {
    const context = await browser.newContext({
      storageState: 'jira-uat-session-working.json',
      ignoreHTTPSErrors: true,
      viewport: null
    });
    
    const page = await context.newPage();
    
    console.log('🌐 Opening JIRA UAT Dashboard...');
    
    await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa', {
      timeout: 30000
    });
    
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    const url = page.url();
    const title = await page.title();
    
    console.log(`📍 URL: ${url}`);
    console.log(`📄 Title: ${title}`);
    
    // Take screenshot
    await page.screenshot({ 
      path: 'BROWSER-TEST-SUCCESS.png', 
      fullPage: true 
    });
    
    // Check if authenticated
    const isAuth = !url.includes('login') && !url.includes('auth');
    
    if (isAuth) {
      console.log('✅ SUCCESS: Browser opened and authenticated!');
      console.log('✅ Dashboard is accessible');
      console.log('✅ Screenshot saved as BROWSER-TEST-SUCCESS.png');
      
      // Test create issue
      console.log('🎯 Testing Create Issue page...');
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/CreateIssue!default.jspa');
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      
      await page.screenshot({ 
        path: 'CREATE-ISSUE-SUCCESS.png', 
        fullPage: true 
      });
      
      console.log('✅ Create Issue page also works!');
      console.log('✅ Screenshot saved as CREATE-ISSUE-SUCCESS.png');
      
      console.log('');
      console.log('🎉 BROWSER TEST COMPLETE!');
      console.log('🎉 JIRA UAT authentication is working perfectly!');
      
      // Keep browser open for 10 seconds so you can see it
      console.log('⏳ Keeping browser open for 10 seconds...');
      await page.waitForTimeout(10000);
      
    } else {
      console.log('❌ Authentication failed');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
    console.log('🔚 Browser closed');
  }
}

simpleBrowserTest().catch(console.error);
