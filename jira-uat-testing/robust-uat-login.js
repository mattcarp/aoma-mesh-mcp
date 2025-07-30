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

async function robustUATLogin() {
  console.log('🛡️ ROBUST JIRA UAT LOGIN');
  console.log('=========================');
  console.log('💪 Handles: Multiple page orders, cert modal, 2FA');
  
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
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--start-maximized', '--disable-web-security']
  });
  
  try {
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      viewport: null
    });
    
    const page = await context.newPage();
    
    let step = 1;
    
    // Helper function to take screenshots
    const takeScreenshot = async (name) => {
      await page.screenshot({ 
        path: `robust-step-${step}-${name}.png`, 
        fullPage: true 
      });
      console.log(`📸 Screenshot: robust-step-${step}-${name}.png`);
      step++;
    };
    
    // Helper function to handle certificate modal
    const handleCertModal = async () => {
      console.log('🔍 Checking for certificate modal...');
      const certModalSelectors = [
        'button:has-text("OK")',
        'button:has-text("Accept")',
        'button:has-text("Continue")',
        'button:has-text("Proceed")',
        'button:has-text("Yes")',
        '.modal button:first-child',
        '[role="dialog"] button',
        '.ui-dialog button',
        '.certificate-modal button'
      ];
      
      for (const selector of certModalSelectors) {
        try {
          const modalButton = page.locator(selector);
          if (await modalButton.count() > 0) {
            console.log(`✅ Found cert modal button: ${selector}`);
            await modalButton.click();
            console.log('🖱️ Clicked certificate OK button');
            await page.waitForLoadState('networkidle', { timeout: 10000 });
            await takeScreenshot('after-cert-modal');
            return true;
          }
        } catch (error) {
          // Continue to next selector
        }
      }
      console.log('ℹ️ No certificate modal found');
      return false;
    };
    
    // Helper function to fill username field
    const fillUsername = async () => {
      console.log('🔍 Looking for username field...');
      const usernameSelectors = [
        'input[name="username"]',
        'input[name="os_username"]',
        'input[name="user"]',
        'input[name="login"]',
        'input[name="email"]',
        'input[id*="username"]',
        'input[id*="user"]',
        'input[id*="login"]',
        'input[placeholder*="username" i]',
        'input[placeholder*="user" i]',
        'input[placeholder*="login" i]',
        'input[placeholder*="email" i]',
        'input[type="text"]:not([name*="search"]):not([name*="query"])',
        'input[type="email"]'
      ];
      
      for (const selector of usernameSelectors) {
        try {
          const field = page.locator(selector);
          if (await field.count() > 0 && await field.isVisible()) {
            console.log(`✅ Found username field: ${selector}`);
            await field.fill(username);
            console.log(`✅ Filled username: ${username}`);
            return true;
          }
        } catch (error) {
          // Continue to next selector
        }
      }
      console.log('❌ No username field found');
      return false;
    };
    
    // Helper function to fill password field
    const fillPassword = async () => {
      console.log('🔍 Looking for password field...');
      const passwordSelectors = [
        'input[name="password"]',
        'input[name="os_password"]',
        'input[name="pwd"]',
        'input[name="pass"]',
        'input[id*="password"]',
        'input[id*="pwd"]',
        'input[placeholder*="password" i]',
        'input[placeholder*="pwd" i]',
        'input[type="password"]'
      ];
      
      for (const selector of passwordSelectors) {
        try {
          const field = page.locator(selector);
          if (await field.count() > 0 && await field.isVisible()) {
            console.log(`✅ Found password field: ${selector}`);
            await field.fill(password);
            console.log('✅ Filled password');
            return true;
          }
        } catch (error) {
          // Continue to next selector
        }
      }
      console.log('❌ No password field found');
      return false;
    };
    
    // Helper function to submit form
    const submitForm = async () => {
      console.log('🔍 Looking for submit button...');
      const submitSelectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        'button:has-text("Log in" i)',
        'button:has-text("Login" i)',
        'button:has-text("Sign in" i)',
        'button:has-text("Continue" i)',
        'button:has-text("Submit" i)',
        'input[value*="Log in" i]',
        'input[value*="Login" i]',
        'input[value*="Sign in" i]',
        '.login-button',
        '.submit-button',
        '#login-button',
        '#submit-button'
      ];
      
      for (const selector of submitSelectors) {
        try {
          const button = page.locator(selector);
          if (await button.count() > 0 && await button.isVisible()) {
            console.log(`✅ Found submit button: ${selector}`);
            await button.click();
            console.log('🖱️ Clicked submit button');
            return true;
          }
        } catch (error) {
          // Continue to next selector
        }
      }
      
      // Try Enter key as fallback
      console.log('🔄 Trying Enter key...');
      await page.keyboard.press('Enter');
      return true;
    };
    
    // Helper function to handle 2FA
    const handle2FA = async () => {
      console.log('🔍 Checking for 2FA...');
      const twoFASelectors = [
        'input[name*="code" i]',
        'input[name*="token" i]',
        'input[name*="otp" i]',
        'input[name*="verification" i]',
        'input[placeholder*="code" i]',
        'input[placeholder*="token" i]',
        'input[placeholder*="verification" i]',
        'input[placeholder*="authenticator" i]',
        'input[type="text"][maxlength="6"]',
        'input[type="text"][maxlength="8"]',
        'input[type="number"][maxlength="6"]',
        'input[id*="code"]',
        'input[id*="token"]',
        'input[id*="otp"]'
      ];
      
      for (const selector of twoFASelectors) {
        try {
          const field = page.locator(selector);
          if (await field.count() > 0 && await field.isVisible()) {
            console.log(`📱 2FA REQUIRED! Found field: ${selector}`);
            console.log('📱 Please check your phone for the 2FA code...');
            console.log('⏳ Waiting up to 90 seconds for you to enter 2FA and submit...');
            
            // Wait for either URL change or form submission
            await page.waitForFunction(
              () => {
                const url = window.location.href;
                return url.includes('Dashboard') || 
                       url.includes('secure/') || 
                       !document.querySelector('input[name*="code"], input[placeholder*="code"]');
              },
              { timeout: 90000 }
            );
            
            console.log('✅ 2FA completed!');
            return true;
          }
        } catch (error) {
          // Continue to next selector
        }
      }
      console.log('ℹ️ No 2FA required');
      return false;
    };
    
    // Start the login process
    console.log('🌐 Opening JIRA UAT...');
    await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa', {
      timeout: 30000
    });
    
    await page.waitForLoadState('networkidle');
    await takeScreenshot('initial-page');
    
    console.log(`📍 Initial URL: ${page.url()}`);
    
    // Main login loop - handle different page orders
    let maxAttempts = 10;
    let attempt = 0;
    
    while (attempt < maxAttempts) {
      attempt++;
      console.log(`\n🔄 Login attempt ${attempt}/${maxAttempts}`);
      
      const currentUrl = page.url();
      console.log(`📍 Current URL: ${currentUrl}`);
      
      // Check if we're already logged in
      if (currentUrl.includes('Dashboard') && !currentUrl.includes('login')) {
        console.log('🎉 Already logged in!');
        break;
      }
      
      // Handle certificate modal (can appear at any time)
      await handleCertModal();
      
      // Try to fill username if field exists
      const usernameFilled = await fillUsername();
      
      // Try to fill password if field exists
      const passwordFilled = await fillPassword();
      
      // If we filled credentials, submit the form
      if (usernameFilled || passwordFilled) {
        await submitForm();
        await page.waitForLoadState('networkidle', { timeout: 30000 });
        await takeScreenshot(`after-submit-attempt-${attempt}`);
      }
      
      // Handle 2FA if it appears
      await handle2FA();
      
      // Handle certificate modal again (might appear after login)
      await handleCertModal();
      
      // Check if we need to click any login/continue buttons
      const loginButtons = [
        'button:has-text("Log in" i)',
        'button:has-text("Continue" i)',
        'a:has-text("Log in" i)',
        '#login-button',
        '#use-sso-button'
      ];
      
      for (const selector of loginButtons) {
        try {
          const button = page.locator(selector);
          if (await button.count() > 0 && await button.isVisible()) {
            console.log(`🖱️ Clicking button: ${selector}`);
            await button.click();
            await page.waitForLoadState('networkidle', { timeout: 15000 });
            break;
          }
        } catch (error) {
          // Continue
        }
      }
      
      // Wait a bit before next attempt
      await page.waitForTimeout(2000);
    }
    
    // Final check
    await takeScreenshot('final-result');
    const finalUrl = page.url();
    console.log(`📍 Final URL: ${finalUrl}`);
    
    if (finalUrl.includes('Dashboard') && !finalUrl.includes('login')) {
      console.log('🎉 SUCCESS: Login completed!');
      
      // Save the authentication state
      await context.storageState({ 
        path: 'jira-uat-session-robust.json' 
      });
      
      console.log('💾 Session saved to: jira-uat-session-robust.json');
      
      // Copy to standard location
      const sessionData = fs.readFileSync('jira-uat-session-robust.json');
      fs.writeFileSync('playwright/.auth/jira-uat-user.json', sessionData);
      
      console.log('💾 Also copied to: playwright/.auth/jira-uat-user.json');
      console.log('🚀 Ready to run automated tests!');
      
      return true;
      
    } else {
      console.log('❌ Login may have failed');
      console.log('💡 Check the screenshots for details');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  } finally {
    console.log('⏳ Keeping browser open for 15 seconds for inspection...');
    await new Promise(resolve => setTimeout(resolve, 15000));
    await browser.close();
  }
}

robustUATLogin()
  .then(success => {
    if (success) {
      console.log('\n🎉 ROBUST UAT LOGIN COMPLETE!');
      console.log('✅ JIRA UAT authentication working');
      console.log('🚀 Run tests with: npx playwright test --headed');
    } else {
      console.log('\n❌ Robust login failed');
      console.log('💡 Check screenshots and try manual login');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
