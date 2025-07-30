const { chromium } = require('@playwright/test');
const fs = require('fs');

async function ssoLogin() {
  console.log('🔐 JIRA UAT SSO LOGIN');
  console.log('=====================');
  
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
    
    console.log('📍 Current URL:', page.url());
    
    // Take screenshot of initial page
    await page.screenshot({ 
      path: 'sso-step-1-initial.png', 
      fullPage: true 
    });
    
    // Check if we need to click "Log in with SSO"
    const ssoButton = page.locator('#use-sso-button');
    const ssoButtonExists = await ssoButton.count() > 0;
    
    if (ssoButtonExists) {
      console.log('🔍 Found SSO button, clicking...');
      await ssoButton.click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });
      
      await page.screenshot({ 
        path: 'sso-step-2-after-sso-click.png', 
        fullPage: true 
      });
      
      console.log('📍 URL after SSO click:', page.url());
    }
    
    // Check if there's a regular login button to click first
    const loginButton = page.locator('#login-button, button:has-text("Log in")');
    const loginButtonExists = await loginButton.count() > 0;
    
    if (loginButtonExists) {
      console.log('🔍 Found login button, clicking...');
      await loginButton.click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });
      
      await page.screenshot({ 
        path: 'sso-step-3-after-login-click.png', 
        fullPage: true 
      });
      
      console.log('📍 URL after login click:', page.url());
    }
    
    // Now look for username/password fields (might appear after SSO redirect)
    console.log('🔍 Looking for login fields...');
    
    const usernameSelectors = [
      'input[name="username"]',
      'input[name="os_username"]',
      'input[type="email"]',
      'input[placeholder*="username"]',
      'input[placeholder*="Username"]',
      'input[placeholder*="email"]',
      'input[placeholder*="Email"]'
    ];
    
    let usernameField = null;
    for (const selector of usernameSelectors) {
      const field = page.locator(selector);
      if (await field.count() > 0) {
        usernameField = field;
        console.log(`✅ Found username field: ${selector}`);
        break;
      }
    }
    
    const passwordSelectors = [
      'input[name="password"]',
      'input[name="os_password"]',
      'input[type="password"]'
    ];
    
    let passwordField = null;
    for (const selector of passwordSelectors) {
      const field = page.locator(selector);
      if (await field.count() > 0) {
        passwordField = field;
        console.log(`✅ Found password field: ${selector}`);
        break;
      }
    }
    
    if (usernameField && passwordField) {
      console.log('🔐 Filling credentials...');
      await usernameField.fill('mcarpent');
      await passwordField.fill('Dooley1_Jude2');
      
      // Submit
      const submitButton = page.locator('button[type="submit"], input[type="submit"], button:has-text("Log in"), button:has-text("Sign in")');
      if (await submitButton.count() > 0) {
        await submitButton.click();
        console.log('✅ Submitted login form');
      } else {
        await page.keyboard.press('Enter');
        console.log('✅ Pressed Enter to submit');
      }
      
      await page.waitForLoadState('networkidle', { timeout: 30000 });
      
      await page.screenshot({ 
        path: 'sso-step-4-after-credentials.png', 
        fullPage: true 
      });
      
    } else {
      console.log('ℹ️ No username/password fields found - this might be pure SSO');
      console.log('📱 Please complete login manually in the browser...');
      console.log('⏳ Waiting 60 seconds for manual login...');
      
      // Wait for manual login completion
      await page.waitForFunction(
        () => {
          const url = window.location.href;
          return url.includes('Dashboard') && !url.includes('login');
        },
        { timeout: 60000 }
      );
    }
    
    // Check for 2FA
    console.log('🔍 Checking for 2FA...');
    const twoFASelectors = [
      'input[name*="code"]',
      'input[placeholder*="code"]',
      'input[type="text"][maxlength="6"]'
    ];
    
    let needs2FA = false;
    for (const selector of twoFASelectors) {
      const field = page.locator(selector);
      if (await field.count() > 0) {
        needs2FA = true;
        console.log('📱 2FA required! Complete on your phone...');
        console.log('⏳ Waiting for 2FA completion...');
        
        await page.waitForFunction(
          () => {
            const url = window.location.href;
            return url.includes('Dashboard') && !url.includes('login');
          },
          { timeout: 60000 }
        );
        break;
      }
    }
    
    // Final screenshot and session save
    await page.screenshot({ 
      path: 'sso-step-5-final.png', 
      fullPage: true 
    });
    
    const finalUrl = page.url();
    console.log(`📍 Final URL: ${finalUrl}`);
    
    if (finalUrl.includes('Dashboard') && !finalUrl.includes('login')) {
      console.log('🎉 SUCCESS: SSO Login completed!');
      
      // Save session
      await context.storageState({ 
        path: 'jira-uat-session-sso.json' 
      });
      
      console.log('💾 Session saved to: jira-uat-session-sso.json');
      
      // Copy to standard location
      const sessionData = fs.readFileSync('jira-uat-session-sso.json');
      fs.writeFileSync('playwright/.auth/jira-uat-user.json', sessionData);
      
      console.log('💾 Also copied to: playwright/.auth/jira-uat-user.json');
      console.log('🚀 Ready to run automated tests!');
      
      return true;
    } else {
      console.log('❌ Login may have failed');
      console.log('💡 Check screenshots for details');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  } finally {
    console.log('⏳ Keeping browser open for 15 seconds...');
    await new Promise(resolve => setTimeout(resolve, 15000));
    await browser.close();
  }
}

ssoLogin()
  .then(success => {
    if (success) {
      console.log('\n🎉 SSO LOGIN COMPLETE!');
      console.log('✅ JIRA UAT authentication working');
      console.log('🚀 Run tests with: npx playwright test --headed');
    } else {
      console.log('\n❌ SSO login failed');
      console.log('💡 Check screenshots and try again');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
