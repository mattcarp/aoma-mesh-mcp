const { chromium } = require('@playwright/test');

async function freshAuthCapture() {
  console.log('🔐 FRESH AUTHENTICATION CAPTURE');
  console.log('===============================');
  console.log('This will open JIRA UAT and wait for you to log in manually');
  console.log('');
  
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
    
    console.log('');
    console.log('🔐 PLEASE LOG IN MANUALLY NOW!');
    console.log('==============================');
    console.log('1. Click the "Log In" button in the upper right');
    console.log('2. Complete the SAML/SSO login process');
    console.log('3. Handle any 2FA if required');
    console.log('4. Wait until you see your name/avatar in the upper right');
    console.log('5. Then press ENTER in this terminal');
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
      path: 'AFTER-MANUAL-LOGIN.png', 
      fullPage: true 
    });
    
    const url = page.url();
    const title = await page.title();
    
    console.log(`📍 URL: ${url}`);
    console.log(`📄 Title: ${title}`);
    
    // Check for user menu elements that indicate successful login
    const userMenuSelectors = [
      '#header-details-user-fullname',
      '.aui-dropdown2-trigger-arrowless',
      '[data-test-id="global.header.user-menu"]',
      '.user-menu',
      'button[aria-label*="user"]',
      'button[title*="user"]'
    ];
    
    let foundUserMenu = false;
    let userMenuSelector = '';
    
    for (const selector of userMenuSelectors) {
      const element = page.locator(selector);
      if (await element.count() > 0) {
        foundUserMenu = true;
        userMenuSelector = selector;
        console.log(`✅ Found user menu: ${selector}`);
        break;
      }
    }
    
    // Also check if "Log In" button is gone
    const loginButton = page.locator('text="Log In"');
    const loginButtonExists = await loginButton.count() > 0;
    
    if (!loginButtonExists && foundUserMenu) {
      console.log('✅ SUCCESS: Authentication confirmed!');
      console.log('✅ Login button is gone');
      console.log('✅ User menu found');
      
      // Save the authentication state
      await context.storageState({ 
        path: 'jira-uat-session-fresh.json' 
      });
      
      console.log('💾 Fresh authentication saved to: jira-uat-session-fresh.json');
      
      // Copy to the standard location
      const fs = require('fs');
      const sessionData = fs.readFileSync('jira-uat-session-fresh.json');
      fs.writeFileSync('playwright/.auth/jira-uat-user.json', sessionData);
      
      console.log('💾 Also copied to: playwright/.auth/jira-uat-user.json');
      
      // Test the saved session
      console.log('🧪 Testing saved session...');
      
      const testContext = await browser.newContext({
        storageState: 'jira-uat-session-fresh.json',
        ignoreHTTPSErrors: true
      });
      
      const testPage = await testContext.newPage();
      
      await testPage.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
      await testPage.waitForLoadState('networkidle');
      
      await testPage.screenshot({ 
        path: 'FRESH-SESSION-TEST.png', 
        fullPage: true 
      });
      
      const testLoginButton = testPage.locator('text="Log In"');
      const testLoginExists = await testLoginButton.count() > 0;
      
      if (!testLoginExists) {
        console.log('🎉 SUCCESS: Fresh session works perfectly!');
        console.log('✅ No login button in test page');
        console.log('✅ Authentication is now properly saved');
        
        await testContext.close();
        return true;
      } else {
        console.log('❌ Session test failed - still seeing login button');
        await testContext.close();
        return false;
      }
      
    } else {
      console.log('❌ Authentication not detected');
      if (loginButtonExists) {
        console.log('❌ Login button still visible');
      }
      if (!foundUserMenu) {
        console.log('❌ No user menu found');
      }
      console.log('💡 Please complete the login process and try again');
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

freshAuthCapture()
  .then(success => {
    if (success) {
      console.log('\n🎉 FRESH AUTHENTICATION CAPTURED!');
      console.log('✅ JIRA UAT login is now properly authenticated');
      console.log('🚀 Run: node simple-browser-test.js to verify');
    } else {
      console.log('\n❌ Authentication capture failed');
      console.log('💡 Please try again and ensure you complete the login');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
