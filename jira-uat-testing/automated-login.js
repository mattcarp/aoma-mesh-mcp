const { chromium } = require('@playwright/test');

async function automatedLogin() {
  console.log('🤖 AUTOMATED JIRA UAT LOGIN');
  console.log('===========================');
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--start-maximized']
  });
  
  try {
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      viewport: null
    });
    
    const page = await context.newPage();
    
    console.log('🌐 Opening JIRA UAT...');
    
    await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa', {
      timeout: 30000
    });
    
    await page.waitForLoadState('networkidle');
    
    console.log('🔍 Looking for Login button...');
    
    // Find and click the Login button - try multiple selectors
    const loginSelectors = [
      'text="Log In"',
      'a:has-text("Log In")',
      'button:has-text("Log In")',
      '[href*="login"]',
      'a[title*="Log"]',
      '.login-link'
    ];
    
    let loginClicked = false;
    
    for (const selector of loginSelectors) {
      try {
        const loginButton = page.locator(selector);
        if (await loginButton.count() > 0) {
          console.log(`✅ Found login button: ${selector}`);
          await loginButton.click();
          console.log('🖱️ Clicked login button!');
          loginClicked = true;
          break;
        }
      } catch (error) {
        // Try next selector
      }
    }
    
    if (!loginClicked) {
      console.log('❌ Could not find login button, trying to click by text...');
      await page.click('text=Log In');
      console.log('🖱️ Clicked "Log In" text!');
    }
    
    // Wait for login page to load
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    console.log('📍 Current URL after login click:', page.url());
    
    // Take screenshot of login page
    await page.screenshot({ 
      path: 'LOGIN-PAGE.png', 
      fullPage: true 
    });
    
    console.log('📸 Screenshot saved: LOGIN-PAGE.png');
    
    console.log('');
    console.log('🔐 PLEASE COMPLETE LOGIN NOW!');
    console.log('============================');
    console.log('1. Complete the SAML/SSO login process');
    console.log('2. Handle any 2FA if required');
    console.log('3. Wait until you see the dashboard with your name/avatar');
    console.log('4. Then press ENTER in this terminal');
    console.log('');
    
    // Wait for user to complete login
    await new Promise((resolve) => {
      process.stdin.once('data', () => {
        resolve();
      });
    });
    
    console.log('✅ Checking authentication status...');
    
    // Take screenshot after login
    await page.screenshot({ 
      path: 'AFTER-LOGIN-COMPLETE.png', 
      fullPage: true 
    });
    
    const url = page.url();
    const title = await page.title();
    
    console.log(`📍 URL: ${url}`);
    console.log(`📄 Title: ${title}`);
    
    // Check if login button is gone
    const loginButton = page.locator('text="Log In"');
    const loginButtonExists = await loginButton.count() > 0;
    
    if (!loginButtonExists) {
      console.log('✅ SUCCESS: Login button is gone - authentication successful!');
      
      // Save the authentication state
      await context.storageState({ 
        path: 'jira-uat-session-authenticated.json' 
      });
      
      console.log('💾 Authentication saved to: jira-uat-session-authenticated.json');
      
      // Copy to standard location
      const fs = require('fs');
      const sessionData = fs.readFileSync('jira-uat-session-authenticated.json');
      fs.writeFileSync('playwright/.auth/jira-uat-user.json', sessionData);
      
      console.log('💾 Also copied to: playwright/.auth/jira-uat-user.json');
      
      console.log('🎉 AUTHENTICATION COMPLETE!');
      console.log('🚀 You can now run automated tests!');
      
      return true;
      
    } else {
      console.log('❌ Login button still visible - authentication may have failed');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  } finally {
    console.log('⏳ Keeping browser open for 5 more seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    await browser.close();
  }
}

automatedLogin()
  .then(success => {
    if (success) {
      console.log('\n🎉 AUTOMATED LOGIN SUCCESSFUL!');
      console.log('✅ JIRA UAT authentication is now working');
      console.log('🚀 Run tests with: npx playwright test --headed');
    } else {
      console.log('\n❌ Login process incomplete');
      console.log('💡 Please try again');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
