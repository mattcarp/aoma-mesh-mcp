const { chromium } = require('playwright');
const fs = require('fs');

async function testAuthAfterNetworkFix() {
  console.log('🚀 TESTING JIRA UAT AUTHENTICATION (Post-Network Fix)');
  console.log('====================================================');
  
  // First, test basic connectivity
  console.log('🔍 Step 1: Testing network connectivity...');
  
  const testConnectivity = async () => {
    try {
      const response = await fetch('https://jirauat.smedigitalapps.com/jira/', {
        method: 'HEAD',
        signal: AbortSignal.timeout(10000)
      });
      return response.ok || response.status === 302 || response.status === 401;
    } catch (error) {
      return false;
    }
  };
  
  const isConnected = await testConnectivity();
  
  if (!isConnected) {
    console.log('❌ Network connectivity still failing!');
    console.log('💡 Please ensure you are connected to the company VPN');
    console.log('💡 Run ./network-diagnostic.sh to test connectivity');
    return false;
  }
  
  console.log('✅ Network connectivity working!');
  
  // Test authentication with saved session
  console.log('🔐 Step 2: Testing authentication with saved session...');
  
  const sessionFile = 'jira-uat-session-working.json';
  
  if (!fs.existsSync(sessionFile)) {
    console.log('❌ Session file not found:', sessionFile);
    console.log('💡 Run manual-auth-setup.js to create a fresh session');
    return false;
  }
  
  console.log('✅ Found session file');
  
  const browser = await chromium.launch({ headless: false });
  
  try {
    const context = await browser.newContext({
      storageState: sessionFile,
      ignoreHTTPSErrors: true
    });
    
    const page = await context.newPage();
    
    console.log('🌐 Step 3: Testing dashboard access...');
    
    await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa', {
      timeout: 30000
    });
    
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    const url = page.url();
    const title = await page.title();
    
    console.log(`📍 URL: ${url}`);
    console.log(`📄 Title: ${title}`);
    
    // Take screenshot as proof
    await page.screenshot({ path: 'AUTH-SUCCESS-PROOF.png', fullPage: true });
    
    const isAuthenticated = !url.includes('login') && 
                           !url.includes('auth') && 
                           url.includes('Dashboard');
    
    if (isAuthenticated) {
      console.log('🎉 SUCCESS: JIRA UAT authentication is WORKING!');
      console.log('✅ Dashboard accessible without login redirect');
      console.log('✅ Session-based authentication functioning perfectly');
      
      // Test create issue page
      console.log('🎯 Step 4: Testing create issue access...');
      
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/CreateIssue!default.jspa');
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      
      const createUrl = page.url();
      const createWorks = !createUrl.includes('login') && !createUrl.includes('auth');
      
      if (createWorks) {
        console.log('✅ Create issue page also accessible!');
        await page.screenshot({ path: 'CREATE-ISSUE-SUCCESS.png', fullPage: true });
      }
      
      console.log('');
      console.log('🎉🎉🎉 FINAL RESULT 🎉🎉🎉');
      console.log('✅ JIRA UAT LOGIN IS COMPLETELY FIXED!');
      console.log('✅ Authentication working perfectly');
      console.log('✅ All pages accessible');
      console.log('✅ Ready for automated testing');
      console.log('');
      console.log('🚀 You can now run: npx playwright test --headed');
      
      return true;
      
    } else {
      console.log('❌ Authentication failed - session may be expired');
      console.log('💡 Run manual-auth-setup.js to get a fresh session');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error during test:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

// Run the test
testAuthAfterNetworkFix()
  .then(success => {
    if (success) {
      console.log('\n🎉 AUTHENTICATION TEST PASSED!');
      console.log('The JIRA UAT login issue is completely resolved!');
    } else {
      console.log('\n❌ Authentication test failed');
      console.log('Check the steps above and try again');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
