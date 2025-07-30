const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Function to load environment variables from .env file
function loadEnvFile() {
  const envPath = path.join(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envLines = envContent.split('\n');
    
    for (const line of envLines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      }
    }
  }
}

async function freshCleanLogin() {
  console.log('🧹 FRESH CLEAN JIRA UAT LOGIN');
  console.log('==============================');
  console.log('🚫 NO cached sessions, NO stored auth');
  console.log('📱 WILL require 2FA from your phone!');
  
  // Load .env file
  loadEnvFile();
  
  // Get credentials
  const username = process.env.JIRA_UAT_USERNAME || process.env.JIRA_USERNAME;
  const password = process.env.JIRA_UAT_PWD || process.env.JIRA_PWD;
  
  console.log(`👤 Username: ${username}`);
  console.log(`🔐 Password: ${password ? '***' + password.substring(password.length-3) : 'NOT SET'}`);
  
  if (!username || !password) {
    console.log('❌ Missing credentials');
    return false;
  }
  
  // Launch browser with COMPLETELY clean state
  const browser = await chromium.launch({ 
    headless: false,
    args: [
      '--start-maximized',
      '--disable-web-security',
      '--no-first-run',
      '--disable-default-apps',
      '--disable-popup-blocking',
      '--disable-translate',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-device-discovery-notifications'
    ]
  });
  
  try {
    // Create FRESH context with NO stored state
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      viewport: null,
      // NO storageState - completely fresh!
    });
    
    const page = await context.newPage();
    
    let step = 1;
    
    // Helper function to take screenshots
    const takeScreenshot = async (name) => {
      await page.screenshot({ 
        path: `fresh-step-${step}-${name}.png`, 
        fullPage: true 
      });
      console.log(`📸 Screenshot: fresh-step-${step}-${name}.png`);
      step++;
    };
    
    console.log('🌐 Opening JIRA UAT (fresh browser, no cache)...');
    await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa', {
      timeout: 30000
    });
    
    await page.waitForLoadState('networkidle');
    await takeScreenshot('initial-fresh-page');
    
    const currentUrl = page.url();
    console.log(`📍 Fresh URL: ${currentUrl}`);
    
    // This should definitely show login page now
    const loginButton = await page.locator('text="Log In"').count();
    const loginForm = await page.locator('form[action*="login"]').count();
    
    console.log(`🔍 Login button visible: ${loginButton > 0}`);
    console.log(`🔍 Login form visible: ${loginForm > 0}`);
    
    if (loginButton === 0 && loginForm === 0) {
      console.log('🤔 Still no login required - checking for user menu...');
      const userMenu = await page.locator('#header-details-user-fullname, .aui-dropdown2-trigger-text').count();
      if (userMenu > 0) {
        console.log('😱 SOMEHOW STILL LOGGED IN! This is mysterious...');
        console.log('💡 Maybe VPN + corporate network keeps you authenticated?');
        return false;
      }
    }
    
    // Look for and click login button
    console.log('🔍 Looking for login button to click...');
    const loginSelectors = [
      'text="Log In"',
      'text="Log in"',
      'button:has-text("Log in")',
      'a:has-text("Log in")',
      '#login-button',
      '.login-button'
    ];
    
    let loginClicked = false;
    for (const selector of loginSelectors) {
      try {
        const button = page.locator(selector);
        if (await button.count() > 0) {
          console.log(`🖱️ Clicking login button: ${selector}`);
          await button.click();
          await page.waitForLoadState('networkidle', { timeout: 30000 });
          await takeScreenshot('after-login-click');
          loginClicked = true;
          break;
        }
      } catch (error) {
        console.log(`⚠️ Failed to click ${selector}: ${error.message}`);
      }
    }
    
    if (!loginClicked) {
      console.log('❌ Could not find login button to click');
      return false;
    }
    
    console.log(`📍 URL after login click: ${page.url()}`);
    
    // Now look for username field
    console.log('🔍 Looking for username field...');
    const usernameSelectors = [
      'input[name="username"]',
      'input[name="os_username"]',
      'input[placeholder*="username" i]',
      'input[placeholder*="user" i]',
      'input[type="text"]:not([name*="search"])'
    ];
    
    let usernameFilled = false;
    for (const selector of usernameSelectors) {
      try {
        const field = page.locator(selector);
        if (await field.count() > 0 && await field.isVisible()) {
          console.log(`✅ Found username field: ${selector}`);
          await field.fill(username);
          console.log(`✅ Filled username: ${username}`);
          usernameFilled = true;
          break;
        }
      } catch (error) {
        console.log(`⚠️ Failed username field ${selector}: ${error.message}`);
      }
    }
    
    if (!usernameFilled) {
      console.log('❌ Could not find username field');
      console.log('💡 This might be pure SSO - waiting for manual interaction...');
      console.log('📱 Please complete login manually and 2FA on your phone...');
      console.log('⏳ Waiting up to 120 seconds...');
      
      // Wait for manual completion
      await page.waitForFunction(
        () => {
          const url = window.location.href;
          return url.includes('Dashboard') && !url.includes('login');
        },
        { timeout: 120000 }
      );
      
      await takeScreenshot('manual-completion');
      
    } else {
      // Look for password field
      console.log('🔍 Looking for password field...');
      const passwordSelectors = [
        'input[name="password"]',
        'input[name="os_password"]',
        'input[type="password"]'
      ];
      
      let passwordFilled = false;
      for (const selector of passwordSelectors) {
        try {
          const field = page.locator(selector);
          if (await field.count() > 0 && await field.isVisible()) {
            console.log(`✅ Found password field: ${selector}`);
            await field.fill(password);
            console.log('✅ Filled password');
            passwordFilled = true;
            break;
          }
        } catch (error) {
          console.log(`⚠️ Failed password field ${selector}: ${error.message}`);
        }
      }
      
      if (passwordFilled) {
        // Submit form
        console.log('🔍 Submitting login form...');
        const submitSelectors = [
          'button[type="submit"]',
          'input[type="submit"]',
          'button:has-text("Log in")',
          'button:has-text("Sign in")'
        ];
        
        let submitted = false;
        for (const selector of submitSelectors) {
          try {
            const button = page.locator(selector);
            if (await button.count() > 0) {
              await button.click();
              console.log(`✅ Clicked submit: ${selector}`);
              submitted = true;
              break;
            }
          } catch (error) {
            // Continue
          }
        }
        
        if (!submitted) {
          console.log('🔄 Trying Enter key...');
          await page.keyboard.press('Enter');
        }
        
        await page.waitForLoadState('networkidle', { timeout: 30000 });
        await takeScreenshot('after-submit');
      }
      
      // Handle certificate modal
      console.log('🔍 Checking for certificate modal...');
      const certSelectors = [
        'button:has-text("OK")',
        'button:has-text("Accept")',
        'button:has-text("Continue")'
      ];
      
      for (const selector of certSelectors) {
        try {
          const button = page.locator(selector);
          if (await button.count() > 0) {
            console.log(`📜 Found cert modal, clicking: ${selector}`);
            await button.click();
            await page.waitForLoadState('networkidle', { timeout: 15000 });
            await takeScreenshot('after-cert-modal');
            break;
          }
        } catch (error) {
          // Continue
        }
      }
      
      // Handle 2FA
      console.log('🔍 Checking for 2FA...');
      const twoFASelectors = [
        'input[name*="code"]',
        'input[placeholder*="code"]',
        'input[type="text"][maxlength="6"]'
      ];
      
      for (const selector of twoFASelectors) {
        try {
          const field = page.locator(selector);
          if (await field.count() > 0) {
            console.log(`📱 2FA REQUIRED! Found field: ${selector}`);
            console.log('📱 Please enter your 2FA code from your phone...');
            console.log('⏳ Waiting up to 90 seconds for completion...');
            
            await page.waitForFunction(
              () => {
                const url = window.location.href;
                return url.includes('Dashboard') && !url.includes('login');
              },
              { timeout: 90000 }
            );
            
            console.log('✅ 2FA completed!');
            break;
          }
        } catch (error) {
          // Continue
        }
      }
    }
    
    // Final verification
    await takeScreenshot('final-result');
    const finalUrl = page.url();
    console.log(`📍 Final URL: ${finalUrl}`);
    
    // Check if we're really authenticated
    const userMenu = await page.locator('#header-details-user-fullname, .aui-dropdown2-trigger-text').count();
    const loginButtonFinal = await page.locator('text="Log In"').count();
    
    console.log(`🔍 User menu present: ${userMenu > 0}`);
    console.log(`🔍 Login button still visible: ${loginButtonFinal > 0}`);
    
    if (finalUrl.includes('Dashboard') && !finalUrl.includes('login') && userMenu > 0) {
      console.log('🎉 SUCCESS: Fresh authentication completed!');
      
      // Save the authentication state
      await context.storageState({ 
        path: 'jira-uat-session-fresh-clean.json' 
      });
      
      console.log('💾 Session saved to: jira-uat-session-fresh-clean.json');
      
      // Copy to standard location
      const sessionData = fs.readFileSync('jira-uat-session-fresh-clean.json');
      fs.writeFileSync('playwright/.auth/jira-uat-user.json', sessionData);
      
      console.log('💾 Also copied to: playwright/.auth/jira-uat-user.json');
      console.log('🚀 Ready to run automated tests!');
      
      return true;
      
    } else {
      console.log('❌ Fresh login failed or incomplete');
      console.log('💡 Check the screenshots for details');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error during fresh login:', error.message);
    return false;
  } finally {
    console.log('⏳ Keeping browser open for 20 seconds for inspection...');
    await new Promise(resolve => setTimeout(resolve, 20000));
    await browser.close();
  }
}

freshCleanLogin()
  .then(success => {
    if (success) {
      console.log('\n🎉 FRESH CLEAN LOGIN COMPLETE!');
      console.log('✅ Real JIRA UAT authentication with 2FA');
      console.log('🚀 Run tests with: npx playwright test --headed');
    } else {
      console.log('\n❌ Fresh clean login failed');
      console.log('💡 May need manual intervention or different approach');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
