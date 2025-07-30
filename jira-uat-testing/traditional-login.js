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

async function traditionalLogin() {
  console.log('📝 TRADITIONAL JIRA UAT LOGIN');
  console.log('==============================');
  console.log('👤 Username + Password + Remember Me + 2FA');
  
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
        path: `traditional-step-${step}-${name}.png`, 
        fullPage: true 
      });
      console.log(`📸 Screenshot: traditional-step-${step}-${name}.png`);
      step++;
    };
    
    console.log('🌐 Opening JIRA UAT...');
    await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa', {
      timeout: 30000
    });
    
    await page.waitForLoadState('networkidle');
    await takeScreenshot('initial-page');
    
    console.log(`📍 Initial URL: ${page.url()}`);
    
    // Click login button to get to login form
    console.log('🔍 Looking for login button...');
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
    
    // Now we should be on the traditional login form
    console.log('📝 Filling traditional login form...');
    
    // Fill username
    console.log('👤 Filling username...');
    const usernameSelectors = [
      'input[name="username"]',
      'input[name="os_username"]',
      'input[placeholder*="username" i]',
      'input[type="text"]'
    ];
    
    let usernameFilled = false;
    for (const selector of usernameSelectors) {
      try {
        const field = page.locator(selector);
        if (await field.count() > 0 && await field.isVisible()) {
          await field.clear(); // Clear any existing value
          await field.fill(username);
          console.log(`✅ Filled username with: ${selector}`);
          usernameFilled = true;
          break;
        }
      } catch (error) {
        console.log(`⚠️ Failed username field ${selector}: ${error.message}`);
      }
    }
    
    if (!usernameFilled) {
      console.log('❌ Could not find username field');
      return false;
    }
    
    // Fill password
    console.log('🔐 Filling password...');
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
          await field.clear(); // Clear any existing value
          await field.fill(password);
          console.log(`✅ Filled password with: ${selector}`);
          passwordFilled = true;
          break;
        }
      } catch (error) {
        console.log(`⚠️ Failed password field ${selector}: ${error.message}`);
      }
    }
    
    if (!passwordFilled) {
      console.log('❌ Could not find password field');
      return false;
    }
    
    // Check "Remember me" checkbox
    console.log('☑️ Checking "Remember me" checkbox...');
    const rememberMeSelectors = [
      'input[name*="remember" i]',
      'input[id*="remember" i]',
      'input[type="checkbox"]',
      'label:has-text("Remember me") input',
      '.remember-me input'
    ];
    
    let rememberMeChecked = false;
    for (const selector of rememberMeSelectors) {
      try {
        const checkbox = page.locator(selector);
        if (await checkbox.count() > 0 && await checkbox.isVisible()) {
          const isChecked = await checkbox.isChecked();
          if (!isChecked) {
            await checkbox.check();
            console.log(`✅ Checked "Remember me" with: ${selector}`);
            rememberMeChecked = true;
          } else {
            console.log(`✅ "Remember me" already checked: ${selector}`);
            rememberMeChecked = true;
          }
          break;
        }
      } catch (error) {
        console.log(`⚠️ Failed remember me ${selector}: ${error.message}`);
      }
    }
    
    if (!rememberMeChecked) {
      console.log('⚠️ Could not find "Remember me" checkbox (not critical)');
    }
    
    await takeScreenshot('form-filled');
    
    // Submit the form
    console.log('🚀 Submitting login form...');
    const submitSelectors = [
      'button:has-text("Log in")',
      'button[type="submit"]',
      'input[type="submit"]',
      'input[value*="Log in" i]',
      '.login-button',
      '#login-submit'
    ];
    
    let submitted = false;
    for (const selector of submitSelectors) {
      try {
        const button = page.locator(selector);
        if (await button.count() > 0 && await button.isVisible()) {
          await button.click();
          console.log(`✅ Clicked submit button: ${selector}`);
          submitted = true;
          break;
        }
      } catch (error) {
        console.log(`⚠️ Failed submit ${selector}: ${error.message}`);
      }
    }
    
    if (!submitted) {
      console.log('🔄 No submit button found, trying Enter key...');
      await page.keyboard.press('Enter');
    }
    
    console.log('⏳ Waiting for login response...');
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    await takeScreenshot('after-submit');
    
    console.log(`📍 URL after submit: ${page.url()}`);
    
    // Check for errors
    const errorSelectors = [
      'text="Incorrect username or password"',
      '.error-message',
      '.alert-error',
      '[role="alert"]'
    ];
    
    let hasError = false;
    for (const selector of errorSelectors) {
      try {
        const error = page.locator(selector);
        if (await error.count() > 0) {
          const errorText = await error.textContent();
          console.log(`❌ Login error: ${errorText}`);
          hasError = true;
          break;
        }
      } catch (error) {
        // Continue
      }
    }
    
    if (hasError) {
      console.log('❌ Login failed due to credential error');
      return false;
    }
    
    // Handle certificate modal
    console.log('🔍 Checking for certificate modal...');
    await page.waitForTimeout(3000);
    
    const certSelectors = [
      'button:has-text("OK")',
      'button:has-text("Accept")',
      'button:has-text("Continue")',
      'button:has-text("Proceed")'
    ];
    
    for (const selector of certSelectors) {
      try {
        const button = page.locator(selector);
        if (await button.count() > 0 && await button.isVisible()) {
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
    await page.waitForTimeout(3000);
    
    const twoFASelectors = [
      'input[name*="code" i]',
      'input[placeholder*="code" i]',
      'input[placeholder*="verification" i]',
      'input[type="text"][maxlength="6"]',
      'input[type="text"][maxlength="8"]',
      'input[type="number"][maxlength="6"]'
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
      console.log('ℹ️ No 2FA field found - checking if login completed...');
      await page.waitForTimeout(5000);
    }
    
    // Final verification
    await takeScreenshot('final-result');
    const finalUrl = page.url();
    console.log(`📍 Final URL: ${finalUrl}`);
    
    // Check authentication status
    const userMenu = await page.locator('#header-details-user-fullname, .aui-dropdown2-trigger-text, [data-test-id="user-menu"]').count();
    const loginButtonFinal = await page.locator('text="Log In"').count();
    const dashboardElements = await page.locator('h1:has-text("Dashboard"), .dashboard').count();
    
    console.log(`🔍 User menu present: ${userMenu > 0}`);
    console.log(`🔍 Login button still visible: ${loginButtonFinal > 0}`);
    console.log(`🔍 Dashboard elements present: ${dashboardElements > 0}`);
    
    const isAuthenticated = finalUrl.includes('Dashboard') && 
                           !finalUrl.includes('login') && 
                           (userMenu > 0 || dashboardElements > 0) &&
                           loginButtonFinal === 0;
    
    if (isAuthenticated) {
      console.log('🎉 SUCCESS: Traditional login completed!');
      
      // Save the authentication state
      await context.storageState({ 
        path: 'jira-uat-session-traditional.json' 
      });
      
      console.log('💾 Session saved to: jira-uat-session-traditional.json');
      
      // Copy to standard location
      const sessionData = fs.readFileSync('jira-uat-session-traditional.json');
      fs.writeFileSync('playwright/.auth/jira-uat-user.json', sessionData);
      
      console.log('💾 Also copied to: playwright/.auth/jira-uat-user.json');
      console.log('🚀 Ready to run automated tests!');
      
      return true;
      
    } else {
      console.log('❌ Traditional login incomplete or failed');
      console.log('💡 Check screenshots for details');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error during traditional login:', error.message);
    return false;
  } finally {
    console.log('⏳ Keeping browser open for 30 seconds for manual completion if needed...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    await browser.close();
  }
}

traditionalLogin()
  .then(success => {
    if (success) {
      console.log('\n🎉 TRADITIONAL LOGIN COMPLETE!');
      console.log('✅ Real JIRA UAT authentication with Remember Me');
      console.log('🚀 Run tests with: npx playwright test --headed');
    } else {
      console.log('\n❌ Traditional login failed');
      console.log('💡 Check screenshots and complete manually if needed');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
