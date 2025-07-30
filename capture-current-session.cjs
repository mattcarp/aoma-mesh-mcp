const { chromium } = require('playwright');
const fs = require('fs');

async function captureCurrentSession() {
  console.log('💾 CAPTURING YOUR AUTHENTICATED SESSION');
  console.log('=====================================');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Go to JIRA dashboard to establish session
    console.log('🔗 Going to JIRA dashboard...');
    await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
    await page.waitForTimeout(3000);
    
    // Check if we're actually logged in
    const isLoggedIn = await page.evaluate(() => {
      return !window.location.href.includes('login') && 
             !document.body.textContent.toLowerCase().includes('sign in') &&
             (document.querySelector('.aui-nav') !== null || 
              document.querySelector('[data-test-id]') !== null);
    });
    
    if (isLoggedIn) {
      console.log('✅ Confirmed: Successfully authenticated!');
      
      // Capture the session
      const cookies = await page.context().cookies();
      const timestamp = new Date().toISOString();
      
      // Save main session file
      fs.writeFileSync('uat-jira-session-fresh.json', JSON.stringify({
        cookies,
        timestamp,
        url: page.url(),
        title: await page.title()
      }, null, 2));
      
      // Save to Playwright auth directory
      fs.writeFileSync('jira-uat-testing/playwright/.auth/jira-uat-user.json', JSON.stringify({
        cookies,
        origins: []
      }, null, 2));
      
      console.log('💾 Session saved to:');
      console.log('   - uat-jira-session-fresh.json');
      console.log('   - jira-uat-testing/playwright/.auth/jira-uat-user.json');
      console.log('🎯 Ready for automated testing!');
      
    } else {
      console.log('❌ Not logged in - please complete login first');
    }
    
    await page.waitForTimeout(2000);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

captureCurrentSession(); 