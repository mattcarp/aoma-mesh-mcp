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

async function properFlowLogin() {
  console.log('🔄 PROPER FLOW JIRA UAT LOGIN');
  console.log('==============================');
  console.log('📋 Follows the correct multi-step flow');
  
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
        path: `flow-step-${step}-${name}.png`, 
        fullPage: true 
      });
      console.log(`📸 Screenshot: flow-step-${step}-${name}.png`);
      step++;
    };
    
    // Helper to wait for elements to become visible
    const waitForVisible = async (selector, timeout = 15000) => {
      try {
        await page.locator(selector).waitFor({ state: 'visible', timeout });
        return true;
      } catch (error) {
        console.log(`⚠️ Element not visible: ${selector}`);
        return false;
      }
    };
    
    console.log('🌐 Opening JIRA UAT...');
    await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa', {
      timeout: 30000
    });
    
    await page.waitForLoadState('networkidle');
    await takeScreenshot('initial-page');
    
    console.log(`📍 Initial URL: ${page.url()}`);
    
    // Step 1: Click initial login button
    console.log('\n🔄 STEP 1: Click initial login button...');
    const initialLoginButton = page.locator('text="Log In"').first();
    if (await initialLoginButton.count() > 0) {
      await initialLoginButton.click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });
      await takeScreenshot('after-initial-login-click');
      console.log('✅ Clicked initial login button');
    }
    
    console.log(`📍 URL after initial click: ${page.url()}`);
    
    // Step 2: Look for and click Continue button (this seems to be the key)
    console.log('\n🔄 STEP 2: Click Continue button to proceed...');
    if (await waitForVisible('button:has-text("Continue")')) {
      const continueButton = page.locator('button:has-text("Continue")').first();
      await continueButton.click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });
      await takeScreenshot('after-continue-click');
      console.log('✅ Clicked Continue button');
    } else {
      console.log('❌ No Continue button found');
    }
    
    console.log(`📍 URL after Continue: ${page.url()}`);
    
    // Step 3: Wait for username field to become visible and fill it
    console.log('\n🔄 STEP 3: Fill username field...');
    if (await waitForVisible('#username-field, input[name="username"]')) {
      const usernameField = page.locator('#username-field, input[name="username"]').first();
      await usernameField.clear();
      await usernameField.fill(username);
      console.log(`✅ Filled username: ${username}`);
      await takeScreenshot('username-filled');
      
      // Click Continue after username
      if (await waitForVisible('button:has-text("Continue")')) {
        const continueAfterUsername = page.locator('button:has-text("Continue")').first();
        await continueAfterUsername.click();
        await page.waitForLoadState('networkidle', { timeout: 30000 });
        await takeScreenshot('after-username-continue');
        console.log('✅ Clicked Continue after username');
      }
    } else {
      console.log('❌ Username field not visible');
    }
    
    console.log(`📍 URL after username: ${page.url()}`);
    
    // Step 4: Wait for password field to become visible and fill it
    console.log('\n🔄 STEP 4: Fill password field...');
    if (await waitForVisible('input[name="password"], input[type="password"]')) {
      const passwordField = page.locator('input[name="password"], input[type="password"]').first();
      await passwordField.clear();
      await passwordField.fill(password);
      console.log('✅ Filled password');
      await takeScreenshot('password-filled');
      
      // Check remember me if visible
      const rememberMeCheckbox = page.locator('input[name="rememberMe"], input[type="checkbox"]').first();
      if (await rememberMeCheckbox.count() > 0) {
        try {
          await rememberMeCheckbox.check();
          console.log('✅ Checked "Remember me"');
        } catch (error) {
          console.log('⚠️ Could not check "Remember me"');
        }
      }
      
      // Submit password
      const submitSelectors = [
        'button:has-text("Log in")',
        'button[type="submit"]',
        '#login-button'
      ];
      
      let submitted = false;
      for (const selector of submitSelectors) {
        if (await waitForVisible(selector, 5000)) {
          const submitButton = page.locator(selector).first();
          await submitButton.click();
          console.log(`✅ Clicked submit: ${selector}`);
          submitted = true;
          break;
        }
      }
      
      if (!submitted) {
        console.log('🔄 No submit button found, trying Enter key...');
        await page.keyboard.press('Enter');
      }
      
      await page.waitForLoadState('networkidle', { timeout: 30000 });
      await takeScreenshot('after-password-submit');
      
    } else {
      console.log('❌ Password field not visible');
    }
    
    console.log(`📍 URL after password: ${page.url()}`);
    
    // Step 5: Handle certificate modal
    console.log('\n🔄 STEP 5: Handle certificate modal...');
    if (await waitForVisible('button:has-text("OK"), button:has-text("Accept"), button:has-text("Continue")', 10000)) {
      const certButton = page.locator('button:has-text("OK"), button:has-text("Accept"), button:has-text("Continue")').first();
      await certButton.click();
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      await takeScreenshot('after-cert-modal');
      console.log('✅ Handled certificate modal');
    } else {
      console.log('ℹ️ No certificate modal found');
    }
    
    // Step 6: Handle 2FA
    console.log('\n🔄 STEP 6: Handle 2FA...');
    if (await waitForVisible('input[name*="code" i], input[placeholder*="code" i], input[type="text"][maxlength="6"]', 10000)) {
      console.log('📱 2FA REQUIRED!');
      console.log('📱 Please check your phone for the 2FA code...');
      console.log('📱 Enter the code in the browser and submit...');
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
    } else {
      console.log('ℹ️ No 2FA required');
    }
    
    // Step 7: Final verification
    console.log('\n🔄 STEP 7: Final verification...');
    await page.waitForTimeout(5000);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await takeScreenshot('final-result');
    
    const finalUrl = page.url();
    console.log(`📍 Final URL: ${finalUrl}`);
    
    // Check authentication status
    const userMenu = await page.locator('#header-details-user-fullname, .aui-dropdown2-trigger-text, [data-test-id="user-menu"]').count();
    const loginButtonFinal = await page.locator('text="Log In"').count();
    const dashboardElements = await page.locator('h1:has-text("Dashboard"), .dashboard, #dashboard').count();
    
    console.log(`🔍 User menu present: ${userMenu > 0}`);
    console.log(`🔍 Login button still visible: ${loginButtonFinal > 0}`);
    console.log(`🔍 Dashboard elements present: ${dashboardElements > 0}`);
    
    const isAuthenticated = finalUrl.includes('Dashboard') && 
                           !finalUrl.includes('login') && 
                           loginButtonFinal === 0;
    
    if (isAuthenticated) {
      console.log('🎉 SUCCESS: Proper flow login completed!');
      
      // Save the authentication state
      await context.storageState({ 
        path: 'jira-uat-session-proper-flow.json' 
      });
      
      console.log('💾 Session saved to: jira-uat-session-proper-flow.json');
      
      // Copy to standard location
      const sessionData = fs.readFileSync('jira-uat-session-proper-flow.json');
      fs.writeFileSync('playwright/.auth/jira-uat-user.json', sessionData);
      
      console.log('💾 Also copied to: playwright/.auth/jira-uat-user.json');
      console.log('🚀 Ready to run automated tests!');
      
      return true;
      
    } else {
      console.log('❌ Proper flow login incomplete');
      console.log('💡 Manual completion may be needed');
      
      // Wait for manual completion
      console.log('⏳ Waiting 90 seconds for manual completion...');
      try {
        await page.waitForFunction(
          () => {
            const url = window.location.href;
            return url.includes('Dashboard') && !url.includes('login');
          },
          { timeout: 90000 }
        );
        
        console.log('✅ Manual completion successful!');
        
        await context.storageState({ 
          path: 'jira-uat-session-manual-flow.json' 
        });
        
        const sessionData = fs.readFileSync('jira-uat-session-manual-flow.json');
        fs.writeFileSync('playwright/.auth/jira-uat-user.json', sessionData);
        
        console.log('💾 Manual session saved!');
        return true;
        
      } catch (error) {
        console.log('❌ Manual completion timeout');
        return false;
      }
    }
    
  } catch (error) {
    console.error('❌ Error during proper flow login:', error.message);
    return false;
  } finally {
    console.log('⏳ Keeping browser open for 30 seconds...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    await browser.close();
  }
}

properFlowLogin()
  .then(success => {
    if (success) {
      console.log('\n🎉 PROPER FLOW LOGIN COMPLETE!');
      console.log('✅ JIRA UAT authentication successful');
      console.log('🚀 Run tests with: npx playwright test --headed');
    } else {
      console.log('\n❌ Proper flow login failed');
      console.log('💡 Check screenshots and complete manually');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
