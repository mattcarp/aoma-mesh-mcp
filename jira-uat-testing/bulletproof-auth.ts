import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

async function bulletproofJiraAuth() {
  console.log('🚀 BULLETPROOF JIRA UAT AUTHENTICATION TEST');
  console.log('============================================');
  
  const authFile = path.join(__dirname, 'playwright/.auth/jira-uat-user.json');
  
  // Ensure auth directory exists
  const authDir = path.dirname(authFile);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
    console.log('📁 Created auth directory');
  }
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
  });
  
  try {
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    const page = await context.newPage();
    
    console.log('🔍 Step 1: Navigating to JIRA UAT...');
    
    // Navigate to JIRA UAT dashboard
    await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa', {
      timeout: 60000,
      waitUntil: 'networkidle'
    });
    
    console.log('📍 Current URL:', page.url());
    console.log('📄 Page title:', await page.title());
    
    // Take initial screenshot
    await page.screenshot({ 
      path: 'step-1-initial-page.png', 
      fullPage: true 
    });
    
    // Check if we're already logged in
    const currentUrl = page.url();
    const isAlreadyLoggedIn = !currentUrl.includes('login') && 
                             !currentUrl.includes('auth') && 
                             !currentUrl.includes('saml');
    
    if (isAlreadyLoggedIn) {
      console.log('✅ Already authenticated! Testing access...');
      
      // Test dashboard access
      await page.screenshot({ 
        path: 'dashboard-auth.png', 
        fullPage: true 
      });
      
      // Save current authentication state
      await context.storageState({ path: authFile });
      console.log('💾 Saved authentication state to:', authFile);
      
      // Test create issue access
      console.log('🎯 Testing create issue access...');
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/CreateIssue!default.jspa');
      await page.waitForLoadState('networkidle');
      
      await page.screenshot({ 
        path: 'create-issue-auth.png', 
        fullPage: true 
      });
      
      const createUrl = page.url();
      const canCreateIssue = !createUrl.includes('login') && !createUrl.includes('auth');
      
      if (canCreateIssue) {
        console.log('🎉 SUCCESS: JIRA UAT authentication is working perfectly!');
        console.log('✅ Dashboard accessible');
        console.log('✅ Create issue accessible');
        console.log('✅ Session saved for future tests');
        return true;
      }
    }
    
    console.log('🔐 Authentication required. Please log in manually...');
    console.log('⏳ Waiting for you to complete login (including 2FA if needed)...');
    console.log('💡 I will detect when login is complete automatically');
    
    // Wait for successful authentication
    await page.waitForFunction(
      () => {
        const url = window.location.href;
        const title = document.title;
        
        // Check if we're successfully authenticated
        return (url.includes('Dashboard.jspa') || url.includes('/secure/')) &&
               !url.includes('login') &&
               !url.includes('auth') &&
               !title.toLowerCase().includes('log in');
      },
      { timeout: 300000 } // 5 minutes
    );
    
    console.log('✅ Login detected! Verifying authentication...');
    
    // Take screenshot after login
    await page.screenshot({ 
      path: 'after-login.png', 
      fullPage: true 
    });
    
    // Save authentication state
    await context.storageState({ path: authFile });
    console.log('💾 Authentication state saved successfully!');
    
    // Test the saved authentication
    console.log('🧪 Testing saved authentication...');
    
    const newContext = await browser.newContext({
      storageState: authFile,
      ignoreHTTPSErrors: true
    });
    
    const testPage = await newContext.newPage();
    
    await testPage.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
    await testPage.waitForLoadState('networkidle');
    
    const testUrl = testPage.url();
    const authWorks = !testUrl.includes('login') && !testUrl.includes('auth');
    
    if (authWorks) {
      console.log('🎉 SUCCESS: Authentication saved and working!');
      console.log('✅ Future tests will use this saved session');
      
      await testPage.screenshot({ 
        path: 'saved-auth-test.png', 
        fullPage: true 
      });
      
      await newContext.close();
      return true;
    } else {
      console.log('❌ Authentication save failed');
      await newContext.close();
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error during authentication:', error);
    return false;
  } finally {
    await browser.close();
  }
}

// Run the test
bulletproofJiraAuth()
  .then(success => {
    if (success) {
      console.log('\n🎉 AUTHENTICATION SETUP COMPLETE!');
      console.log('✅ You can now run Playwright tests without manual login');
      console.log('🚀 Try: npx playwright test --headed');
    } else {
      console.log('\n❌ Authentication setup failed');
      console.log('💡 Please try running this script again');
    }
  })
  .catch(console.error);
