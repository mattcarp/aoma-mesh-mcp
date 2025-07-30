const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function manualAuthSetup() {
  console.log('🚀 MANUAL JIRA UAT AUTHENTICATION SETUP');
  console.log('=====================================');
  console.log('');
  console.log('This script will:');
  console.log('1. Open JIRA UAT in a browser');
  console.log('2. Wait for you to log in manually');
  console.log('3. Save your session for automated tests');
  console.log('');
  
  const authFile = path.join(__dirname, 'playwright/.auth/jira-uat-user.json');
  
  // Ensure auth directory exists
  const authDir = path.dirname(authFile);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
    console.log('📁 Created auth directory');
  }
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--start-maximized']
  });
  
  try {
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      viewport: null // Use full screen
    });
    
    const page = await context.newPage();
    
    console.log('🌐 Opening JIRA UAT...');
    
    // Navigate to JIRA UAT
    await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa', {
      timeout: 60000
    });
    
    console.log('');
    console.log('🔐 PLEASE LOG IN MANUALLY NOW');
    console.log('==============================');
    console.log('1. Complete the login process in the browser');
    console.log('2. Handle any 2FA if required');
    console.log('3. Wait until you see the JIRA dashboard');
    console.log('4. Then press ENTER in this terminal');
    console.log('');
    
    // Wait for user input
    await new Promise((resolve) => {
      process.stdin.once('data', () => {
        resolve();
      });
    });
    
    console.log('✅ Checking authentication status...');
    
    // Check current state
    const currentUrl = page.url();
    const title = await page.title();
    
    console.log(`📍 Current URL: ${currentUrl}`);
    console.log(`📄 Page title: ${title}`);
    
    // Verify we're authenticated
    const isAuthenticated = !currentUrl.includes('login') && 
                           !currentUrl.includes('auth') && 
                           currentUrl.includes('jirauat.smedigitalapps.com');
    
    if (!isAuthenticated) {
      console.log('❌ It looks like you might not be logged in yet.');
      console.log('💡 Please complete the login and try again.');
      return false;
    }
    
    console.log('✅ Authentication detected!');
    
    // Save the authentication state
    await context.storageState({ path: authFile });
    console.log(`💾 Authentication saved to: ${authFile}`);
    
    // Test the saved authentication
    console.log('🧪 Testing saved authentication...');
    
    const testContext = await browser.newContext({
      storageState: authFile,
      ignoreHTTPSErrors: true
    });
    
    const testPage = await testContext.newPage();
    
    await testPage.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
    await testPage.waitForLoadState('networkidle');
    
    const testUrl = testPage.url();
    const authWorks = !testUrl.includes('login') && !testUrl.includes('auth');
    
    if (authWorks) {
      console.log('🎉 SUCCESS! Authentication is working perfectly!');
      console.log('✅ Saved session can access JIRA UAT');
      console.log('✅ Future tests will use this authentication');
      console.log('');
      console.log('🚀 You can now run tests with:');
      console.log('   pnpm test verify-auth-works.spec.ts --headed');
      
      await testContext.close();
      return true;
    } else {
      console.log('❌ Authentication test failed');
      await testContext.close();
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error during setup:', error);
    return false;
  } finally {
    await browser.close();
  }
}

// Run the setup
manualAuthSetup()
  .then(success => {
    if (success) {
      console.log('\n🎉 AUTHENTICATION SETUP COMPLETE!');
      console.log('✅ JIRA UAT login is now fixed and ready for testing!');
    } else {
      console.log('\n❌ Setup incomplete - please try again');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
