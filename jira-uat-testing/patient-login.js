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

async function patientLogin() {
  console.log('⏳ PATIENT JIRA UAT LOGIN');
  console.log('==========================');
  console.log('🕐 Waits patiently for each field to appear');
  
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
        path: `patient-step-${step}-${name}.png`, 
        fullPage: true 
      });
      console.log(`📸 Screenshot: patient-step-${step}-${name}.png`);
      step++;
    };
    
    console.log('🌐 Opening JIRA UAT...');
    await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa', {
      timeout: 30000
    });
    
    await page.waitForLoadState('networkidle');
    await takeScreenshot('initial-page');
    
    console.log(`📍 Initial URL: ${page.url()}`);
    
    // Click login button
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
    
    // Wait patiently for username field and fill it
    console.log('⏳ Waiting patiently for username field...');
    try {
      const usernameField = page.locator('input[name="username"], input[name="os_username"], input[placeholder*="username" i]').first();
      await usernameField.waitFor({ state: 'visible', timeout: 15000 });
      
      console.log('👤 Found username field, clearing and filling...');
      await usernameField.clear();
      await usernameField.fill(username);
      console.log(`✅ Filled username: ${username}`);
      
      await takeScreenshot('username-filled');
      
    } catch (error) {
      console.log(`❌ Username field timeout: ${error.message}`);
      return false;
    }
    
    // Wait patiently for password field and fill it
    console.log('⏳ Waiting patiently for password field...');
    try {
      const passwordField = page.locator('input[name="password"], input[name="os_password"], input[type="password"]').first();
      await passwordField.waitFor({ state: 'visible', timeout: 15000 });
      
      console.log('🔐 Found password field, clearing and filling...');
      await passwordField.clear();
      await passwordField.fill(password);
      console.log('✅ Filled password');
      
      await takeScreenshot('password-filled');
      
    } catch (error) {
      console.log(`❌ Password field timeout: ${error.message}`);
      console.log('💡 Password field might appear after username submission...');
      
      // Try submitting username first
      console.log('🔄 Trying to submit username first...');
      await page.keyboard.press('Tab'); // Move to next field
      await page.keyboard.press('Enter'); // Submit
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      await takeScreenshot('after-username-submit');
      
      // Try password field again
      console.log('⏳ Waiting for password field after username submit...');
      try {
        const passwordField = page.locator('input[name="password"], input[name="os_password"], input[type="password"]').first();
        await passwordField.waitFor({ state: 'visible', timeout: 15000 });
        
        console.log('🔐 Found password field after username submit!');
        await passwordField.clear();
        await passwordField.fill(password);
        console.log('✅ Filled password');
        
        await takeScreenshot('password-filled-after-username');
        
      } catch (error2) {
        console.log(`❌ Still no password field: ${error2.message}`);
        console.log('💡 This might be SSO-only or require manual intervention');
        
        // Continue anyway in case it's SSO
      }
    }
    
    // Look for and check "Remember me" checkbox
    console.log('☑️ Looking for "Remember me" checkbox...');
    try {
      const rememberMeCheckbox = page.locator('input[type="checkbox"], input[name*="remember" i]').first();
      await rememberMeCheckbox.waitFor({ state: 'visible', timeout: 5000 });
      
      const isChecked = await rememberMeCheckbox.isChecked();
      if (!isChecked) {
        await rememberMeCheckbox.check();
        console.log('✅ Checked "Remember me" checkbox');
      } else {
        console.log('✅ "Remember me" already checked');
      }
      
      await takeScreenshot('remember-me-checked');
      
    } catch (error) {
      console.log('⚠️ No "Remember me" checkbox found (not critical)');
    }
    
    // Submit the form
    console.log('🚀 Submitting login form...');
    try {
      const submitButton = page.locator('button:has-text("Log in"), button[type="submit"], input[type="submit"]').first();
      await submitButton.waitFor({ state: 'visible', timeout: 10000 });
      await submitButton.click();
      console.log('✅ Clicked submit button');
      
    } catch (error) {
      console.log('🔄 No submit button found, trying Enter key...');
      await page.keyboard.press('Enter');
    }
    
    console.log('⏳ Waiting for login response...');
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    await takeScreenshot('after-submit');
    
    console.log(`📍 URL after submit: ${page.url()}`);
    
    // Check for login errors
    const errorMessages = await page.locator('text="Incorrect username or password", .error-message, .alert-error').count();
    if (errorMessages > 0) {
      console.log('❌ Login error detected - incorrect credentials');
      return false;
    }
    
    // Handle certificate modal
    console.log('🔍 Checking for certificate modal...');
    try {
      const certButton = page.locator('button:has-text("OK"), button:has-text("Accept"), button:has-text("Continue")').first();
      await certButton.waitFor({ state: 'visible', timeout: 10000 });
      
      console.log('📜 Found certificate modal, clicking OK...');
      await certButton.click();
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      await takeScreenshot('after-cert-modal');
      console.log('✅ Handled certificate modal');
      
    } catch (error) {
      console.log('ℹ️ No certificate modal found');
    }
    
    // Handle 2FA
    console.log('🔍 Checking for 2FA...');
    try {
      const twoFAField = page.locator('input[name*="code" i], input[placeholder*="code" i], input[type="text"][maxlength="6"]').first();
      await twoFAField.waitFor({ state: 'visible', timeout: 10000 });
      
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
      
    } catch (error) {
      console.log('ℹ️ No 2FA field found - checking if login completed...');
    }
    
    // Give extra time for any redirects
    console.log('⏳ Waiting for final page load...');
    await page.waitForTimeout(5000);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    // Final verification
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
      console.log('🎉 SUCCESS: Patient login completed!');
      
      // Save the authentication state
      await context.storageState({ 
        path: 'jira-uat-session-patient.json' 
      });
      
      console.log('💾 Session saved to: jira-uat-session-patient.json');
      
      // Copy to standard location
      const sessionData = fs.readFileSync('jira-uat-session-patient.json');
      fs.writeFileSync('playwright/.auth/jira-uat-user.json', sessionData);
      
      console.log('💾 Also copied to: playwright/.auth/jira-uat-user.json');
      console.log('🚀 Ready to run automated tests!');
      
      return true;
      
    } else {
      console.log('❌ Patient login incomplete');
      console.log('💡 May need manual completion');
      console.log('🔍 Waiting 60 seconds for manual completion...');
      
      // Wait for manual completion
      try {
        await page.waitForFunction(
          () => {
            const url = window.location.href;
            return url.includes('Dashboard') && !url.includes('login');
          },
          { timeout: 60000 }
        );
        
        console.log('✅ Manual completion detected!');
        
        // Save session after manual completion
        await context.storageState({ 
          path: 'jira-uat-session-manual.json' 
        });
        
        const sessionData = fs.readFileSync('jira-uat-session-manual.json');
        fs.writeFileSync('playwright/.auth/jira-uat-user.json', sessionData);
        
        console.log('💾 Manual session saved!');
        return true;
        
      } catch (error) {
        console.log('❌ Manual completion timeout');
        return false;
      }
    }
    
  } catch (error) {
    console.error('❌ Error during patient login:', error.message);
    return false;
  } finally {
    console.log('⏳ Keeping browser open for 30 seconds...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    await browser.close();
  }
}

patientLogin()
  .then(success => {
    if (success) {
      console.log('\n🎉 PATIENT LOGIN COMPLETE!');
      console.log('✅ JIRA UAT authentication successful');
      console.log('🚀 Run tests with: npx playwright test --headed');
    } else {
      console.log('\n❌ Patient login failed');
      console.log('💡 Check screenshots and complete manually if needed');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
