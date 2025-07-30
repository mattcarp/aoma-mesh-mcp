const { chromium } = require('@playwright/test');

async function verifyRealAuth() {
  console.log('🔍 VERIFYING REAL JIRA UAT AUTHENTICATION');
  console.log('==========================================');
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--start-maximized']
  });
  
  try {
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      viewport: null,
      // Try to use the saved session
      storageState: 'playwright/.auth/jira-uat-user.json'
    });
    
    const page = await context.newPage();
    
    console.log('🌐 Testing JIRA UAT with saved session...');
    await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa', {
      timeout: 30000
    });
    
    await page.waitForLoadState('networkidle');
    
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);
    
    // Take screenshot
    await page.screenshot({ 
      path: 'verify-auth-test.png', 
      fullPage: true 
    });
    
    // Check for login indicators
    const loginButton = await page.locator('text="Log In"').count();
    const loginForm = await page.locator('form[action*="login"]').count();
    const loginPage = currentUrl.includes('login');
    
    console.log(`🔍 Login button present: ${loginButton > 0}`);
    console.log(`🔍 Login form present: ${loginForm > 0}`);
    console.log(`🔍 URL contains 'login': ${loginPage}`);
    
    // Check for authenticated indicators
    const userMenu = await page.locator('#header-details-user-fullname, .aui-dropdown2-trigger-text, [data-test-id="user-menu"]').count();
    const dashboardTitle = await page.locator('h1:has-text("Dashboard"), title:has-text("Dashboard")').count();
    const jiraHeader = await page.locator('#header, .aui-header').count();
    
    console.log(`🔍 User menu present: ${userMenu > 0}`);
    console.log(`🔍 Dashboard title present: ${dashboardTitle > 0}`);
    console.log(`🔍 JIRA header present: ${jiraHeader > 0}`);
    
    // Try to access a protected page
    console.log('🔍 Testing access to Create Issue page...');
    await page.goto('https://jirauat.smedigitalapps.com/jira/secure/CreateIssue!default.jspa', {
      timeout: 30000
    });
    
    await page.waitForLoadState('networkidle');
    
    const createUrl = page.url();
    console.log(`📍 Create Issue URL: ${createUrl}`);
    
    await page.screenshot({ 
      path: 'verify-create-issue-test.png', 
      fullPage: true 
    });
    
    const createPageLogin = createUrl.includes('login');
    const createIssueForm = await page.locator('form[name="jiraform"], #create-issue-dialog, .create-issue').count();
    
    console.log(`🔍 Create page redirected to login: ${createPageLogin}`);
    console.log(`🔍 Create issue form present: ${createIssueForm > 0}`);
    
    // Final assessment
    const isAuthenticated = !loginPage && !createPageLogin && (userMenu > 0 || jiraHeader > 0);
    const hasAccess = !createPageLogin && createIssueForm > 0;
    
    console.log('\n📊 AUTHENTICATION ASSESSMENT:');
    console.log('================================');
    
    if (isAuthenticated) {
      console.log('✅ AUTHENTICATED: Session appears valid');
      if (hasAccess) {
        console.log('✅ FULL ACCESS: Can access protected pages');
        console.log('🎉 SUCCESS: Real authentication confirmed!');
        return true;
      } else {
        console.log('⚠️ LIMITED ACCESS: Dashboard works but create issue may not');
        console.log('💡 May need fresh login for full access');
        return false;
      }
    } else {
      console.log('❌ NOT AUTHENTICATED: Session is invalid or expired');
      console.log('💡 Need to perform fresh login with 2FA');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error during verification:', error.message);
    return false;
  } finally {
    console.log('⏳ Keeping browser open for 10 seconds...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    await browser.close();
  }
}

verifyRealAuth()
  .then(success => {
    if (success) {
      console.log('\n🎉 REAL AUTHENTICATION CONFIRMED!');
      console.log('✅ Ready to run automated tests');
    } else {
      console.log('\n❌ AUTHENTICATION FAILED OR EXPIRED');
      console.log('💡 Need fresh login with 2FA from your phone');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
