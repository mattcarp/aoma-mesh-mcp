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

async function multiStepLogin() {
  console.log('🔄 MULTI-STEP JIRA UAT LOGIN');
  console.log('=============================');
  console.log('📝 Step 1: Username → Step 2: Password → Step 3: 2FA');
  
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
        path: `multi-step-${step}-${name}.png`, 
        fullPage: true 
      });
      console.log(`📸 Screenshot: multi-step-${step}-${name}.png`);
      step++;
    };
    
    // Helper function to wait and handle any modals
    const handleModals = async () => {
      await page.waitForTimeout(2000); // Wait for any modals to appear
      
      const modalSelectors = [
        'button:has-text("OK")',
        'button:has-text("Accept")',
        'button:has-text("Continue")',
        'button:has-text("Proceed")',
        'button:has-text("Yes")',
        '.modal button',
        '[role="dialog"] button'
      ];
      
      for (const selector of modalSelectors) {
        try {
          const button = page.locator(selector);
          if (await button.count() > 0 && await button.isVisible()) {
            console.log(`📜 Found modal button: ${selector}`);
            await button.click();
            console.log('✅ Clicked modal button');
            await page.waitForLoadState('networkidle', { timeout: 10000 });
            return true;
          }
        } catch (error) {
          // Continue
        }
      }
      return false;
    };
    
    console.log('🌐 Opening JIRA UAT...');
    await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa', {
      timeout: 30000
    });
    
    await page.waitForLoadState('networkidle');
    await takeScreenshot('initial-page');
    
    console.log(`📍 Initial URL: ${page.url()}`);
    
    // STEP 1: Click login button
    console.log('\n🔄 STEP 1: Clicking login button...');
    const loginButton = page.locator('text="Log In"').first();
    if (await loginButton.count() > 0) {
      await loginButton.click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });
      await takeScreenshot('after-login-click');
      console.log('✅ Clicked login button');
    } else {
      console.log('❌ No login button found');
      return false;
    }
    
    console.log(`📍 URL after login click: ${page.url()}`);
    
    // Handle any modals that appear
    await handleModals();
    
    // STEP 2: Fill username and continue
    console.log('\n🔄 STEP 2: Filling username...');
    const usernameField = page.locator('input[placeholder*="username" i], input[name="username"], input[name="os_username"]').first();
    if (await usernameField.count() > 0) {
      await usernameField.fill(username);
      console.log(`✅ Filled username: ${username}`);
      
      // Look for Continue/Next button after username
      const continueSelectors = [
        'button:has-text("Continue")',
        'button:has-text("Next")',
        'button:has-text("Submit")',
        'button[type="submit"]',
        'input[type="submit"]'
      ];
      
      let continueClicked = false;
      for (const selector of continueSelectors) {
        try {
          const button = page.locator(selector);
          if (await button.count() > 0 && await button.isVisible()) {
            console.log(`🖱️ Clicking continue button: ${selector}`);
            await button.click();
            await page.waitForLoadState('networkidle', { timeout: 30000 });
            await takeScreenshot('after-username-continue');
            continueClicked = true;
            break;
          }
        } catch (error) {
          // Continue
        }
      }
      
      if (!continueClicked) {
        console.log('🔄 No continue button found, trying Enter key...');
        await page.keyboard.press('Enter');
        await page.waitForLoadState('networkidle', { timeout: 30000 });
        await takeScreenshot('after-username-enter');
      }
      
    } else {
      console.log('❌ No username field found');
      return false;
    }
    
    console.log(`📍 URL after username: ${page.url()}`);
    
    // Handle any modals that appear after username
    await handleModals();
    
    // STEP 3: Look for password field (might appear now)
    console.log('\n🔄 STEP 3: Looking for password field...');
    await page.waitForTimeout(3000); // Wait for password field to appear
    
    const passwordField = page.locator('input[type="password"], input[name="password"], input[name="os_password"]').first();
    if (await passwordField.count() > 0) {
      console.log('✅ Found password field!');
      await passwordField.fill(password);
      console.log('✅ Filled password');
      
      // Submit password
      const submitSelectors = [
        'button:has-text("Log in")',
        'button:has-text("Sign in")',
        'button:has-text("Continue")',
        'button[type="submit"]',
        'input[type="submit"]'
      ];
      
      let submitClicked = false;
      for (const selector of submitSelectors) {
        try {
          const button = page.locator(selector);
          if (await button.count() > 0 && await button.isVisible()) {
            console.log(`🖱️ Clicking submit button: ${selector}`);
            await button.click();
            await page.waitForLoadState('networkidle', { timeout: 30000 });
            await takeScreenshot('after-password-submit');
            submitClicked = true;
            break;
          }
        } catch (error) {
          // Continue
        }
      }
      
      if (!submitClicked) {
        console.log('🔄 No submit button found, trying Enter key...');
        await page.keyboard.press('Enter');
        await page.waitForLoadState('networkidle', { timeout: 30000 });
        await takeScreenshot('after-password-enter');
      }
      
    } else {
      console.log('⚠️ No password field found yet');
      console.log('💡 This might be SSO or require manual intervention');
      console.log('📱 Please complete login manually if needed...');
    }
    
    console.log(`📍 URL after password: ${page.url()}`);
    
    // Handle any modals that appear after password
    await handleModals();
    
    // STEP 4: Handle 2FA
    console.log('\n🔄 STEP 4: Checking for 2FA...');
    await page.waitForTimeout(3000); // Wait for 2FA to appear
    
    const twoFASelectors = [
      'input[name*="code"]',
      'input[placeholder*="code"]',
      'input[placeholder*="verification"]',
      'input[type="text"][maxlength="6"]',
      'input[type="text"][maxlength="8"]'
    ];
    
    let found2FA = false;
    for (const selector of twoFASelectors) {
      try {
        const field = page.locator(selector);
        if (await field.count() > 0 && await field.isVisible()) {
          found2FA = true;
          console.log(`📱 2FA REQUIRED! Found field: ${selector}`);
          console.log('📱 Please check your phone for the 2FA code...');
          console.log('📱 Enter the code and submit...');
          console.log('⏳ Waiting up to 120 seconds for completion...');
          
          await takeScreenshot('2fa-required');
          
          // Wait for 2FA completion
          await page.waitForFunction(
            () => {
              const url = window.location.href;
              return url.includes('Dashboard') && !url.includes('login');
            },
            { timeout: 120000 }
          );
          
          console.log('✅ 2FA completed!');
          break;
        }
      } catch (error) {
        // Continue
      }
    }
    
    if (!found2FA) {
      console.log('ℹ️ No 2FA field found');
      console.log('💡 Waiting a bit more in case login is still processing...');
      await page.waitForTimeout(10000);
    }
    
    // Final verification
    await takeScreenshot('final-result');
    const finalUrl = page.url();
    console.log(`📍 Final URL: ${finalUrl}`);
    
    // Check authentication status
    const userMenu = await page.locator('#header-details-user-fullname, .aui-dropdown2-trigger-text').count();
    const loginButtonFinal = await page.locator('text="Log In"').count();
    
    console.log(`🔍 User menu present: ${userMenu > 0}`);
    console.log(`🔍 Login button still visible: ${loginButtonFinal > 0}`);
    
    if (finalUrl.includes('Dashboard') && !finalUrl.includes('login') && userMenu > 0) {
      console.log('🎉 SUCCESS: Multi-step authentication completed!');
      
      // Save the authentication state
      await context.storageState({ 
        path: 'jira-uat-session-multi-step.json' 
      });
      
      console.log('💾 Session saved to: jira-uat-session-multi-step.json');
      
      // Copy to standard location
      const sessionData = fs.readFileSync('jira-uat-session-multi-step.json');
      fs.writeFileSync('playwright/.auth/jira-uat-user.json', sessionData);
      
      console.log('💾 Also copied to: playwright/.auth/jira-uat-user.json');
      console.log('🚀 Ready to run automated tests!');
      
      return true;
      
    } else {
      console.log('❌ Multi-step login incomplete');
      console.log('💡 May need manual completion or different approach');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error during multi-step login:', error.message);
    return false;
  } finally {
    console.log('⏳ Keeping browser open for 30 seconds for manual completion if needed...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    await browser.close();
  }
}

multiStepLogin()
  .then(success => {
    if (success) {
      console.log('\n🎉 MULTI-STEP LOGIN COMPLETE!');
      console.log('✅ Real JIRA UAT authentication with 2FA');
      console.log('🚀 Run tests with: npx playwright test --headed');
    } else {
      console.log('\n❌ Multi-step login failed');
      console.log('💡 Check screenshots and complete manually if needed');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
