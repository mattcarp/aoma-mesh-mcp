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

async function guided2FALogin() {
  console.log('🔐 GUIDED 2FA LOGIN - STEP BY STEP');
  console.log('===================================');
  console.log('📱 I will guide you through each step and tell you exactly when to enter your 2FA code');
  
  // Load .env file
  loadEnvFile();
  
  // Get credentials
  const username = process.env.JIRA_UAT_USERNAME || process.env.JIRA_USERNAME;
  const password = process.env.JIRA_UAT_PWD || process.env.JIRA_PWD;
  
  console.log(`👤 Username: ${username}`);
  console.log(`🔐 Password: ${password ? '***' + password.substring(password.length-3) : 'NOT SET'}`);
  
  if (!username || !password) {
    console.log('❌ Missing credentials in .env file');
    return false;
  }
  
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
    
    let step = 1;
    const takeScreenshot = async (name) => {
      await page.screenshot({ 
        path: `guided-${step}-${name}.png`, 
        fullPage: true 
      });
      console.log(`📸 Screenshot: guided-${step}-${name}.png`);
      step++;
    };
    
    console.log('\n🔄 STEP 1: Opening JIRA UAT login page...');
    await page.goto('https://jirauat.smedigitalapps.com/jira/login.jsp', {
      timeout: 30000
    });
    
    await page.waitForLoadState('networkidle');
    await takeScreenshot('login-page');
    
    console.log(`📍 Current URL: ${page.url()}`);
    
    // Check what's on the page
    const pageTitle = await page.title();
    console.log(`📄 Page title: "${pageTitle}"`);
    
    // Look for login elements
    console.log('\n🔍 STEP 2: Analyzing login page...');
    
    const hasUsernameField = await page.locator('input[name="username"], #username-field').count() > 0;
    const hasPasswordField = await page.locator('input[name="password"], input[type="password"]').count() > 0;
    const hasSSO = await page.locator('text="Log in with SSO"').count() > 0;
    const hasLoginButton = await page.locator('button:has-text("Log in"), button[type="submit"]').count() > 0;
    
    console.log(`   👤 Username field present: ${hasUsernameField}`);
    console.log(`   🔐 Password field present: ${hasPasswordField}`);
    console.log(`   🔐 SSO option present: ${hasSSO}`);
    console.log(`   🚀 Login button present: ${hasLoginButton}`);
    
    if (hasSSO) {
      console.log('\n🔐 STEP 3: Trying SSO login first...');
      console.log('   📱 This might redirect you to external authentication');
      
      try {
        const ssoButton = page.locator('text="Log in with SSO"');
        await ssoButton.click();
        
        await page.waitForLoadState('networkidle', { timeout: 15000 });
        await takeScreenshot('after-sso-click');
        
        const newUrl = page.url();
        console.log(`   📍 URL after SSO: ${newUrl}`);
        
        if (!newUrl.includes('jirauat.smedigitalapps.com')) {
          console.log('   🎉 SUCCESS! Redirected to external SSO provider');
          console.log('   👤 Please complete SSO authentication in the browser...');
          console.log('   ⏳ I will wait for you to complete it...');
          
          // Wait for return to JIRA
          await page.waitForFunction(
            () => {
              const url = window.location.href;
              return url.includes('jirauat.smedigitalapps.com');
            },
            { timeout: 300000 } // 5 minutes
          );
          
          console.log('   ✅ Returned to JIRA after SSO');
          await takeScreenshot('after-sso-return');
        }
      } catch (error) {
        console.log(`   ⚠️ SSO failed: ${error.message}`);
        console.log('   🔄 Falling back to username/password...');
      }
    }
    
    // Check if we need username/password
    const currentUrl = page.url();
    if (currentUrl.includes('login')) {
      console.log('\n👤 STEP 4: Filling username and password...');
      
      // Fill username
      const usernameField = page.locator('input[name="username"], #username-field').first();
      if (await usernameField.count() > 0) {
        await usernameField.fill(username);
        console.log('   ✅ Username filled');
      } else {
        console.log('   ❌ Username field not found');
      }
      
      // Fill password  
      const passwordField = page.locator('input[name="password"], input[type="password"]').first();
      if (await passwordField.count() > 0) {
        await passwordField.fill(password);
        console.log('   ✅ Password filled');
      } else {
        console.log('   ❌ Password field not found');
      }
      
      // Check remember me
      const rememberMe = page.locator('input[type="checkbox"]').first();
      if (await rememberMe.count() > 0) {
        await rememberMe.check();
        console.log('   ✅ "Remember me" checked');
      }
      
      await takeScreenshot('credentials-filled');
      
      // Submit
      console.log('\n🚀 STEP 5: Submitting login form...');
      const submitButton = page.locator('button:has-text("Log in"), button[type="submit"]').first();
      if (await submitButton.count() > 0) {
        await submitButton.click();
        console.log('   ✅ Login form submitted');
      } else {
        console.log('   ❌ Submit button not found');
        await page.keyboard.press('Enter');
        console.log('   🔄 Tried Enter key instead');
      }
      
      await page.waitForLoadState('networkidle', { timeout: 30000 });
      await takeScreenshot('after-submit');
    }
    
    // Check for certificate modal
    console.log('\n📜 STEP 6: Checking for certificate modal...');
    try {
      const certModal = page.locator('button:has-text("OK"), button:has-text("Accept"), button:has-text("Continue")').first();
      await certModal.waitFor({ state: 'visible', timeout: 10000 });
      
      console.log('   📜 CERTIFICATE MODAL FOUND!');
      console.log('   🖱️ Clicking the big OK button...');
      
      await certModal.click();
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      await takeScreenshot('after-cert-modal');
      
      console.log('   ✅ Certificate modal handled');
      
    } catch (error) {
      console.log('   ℹ️ No certificate modal found');
    }
    
    // Check for 2FA
    console.log('\n📱 STEP 7: Checking for 2FA requirement...');
    
    const twoFASelectors = [
      'input[name*="code" i]',
      'input[placeholder*="code" i]', 
      'input[type="text"][maxlength="6"]',
      'input[type="text"][maxlength="8"]',
      'input[id*="2fa" i]',
      'input[id*="verification" i]'
    ];
    
    let twoFAField = null;
    for (const selector of twoFASelectors) {
      const field = page.locator(selector);
      if (await field.count() > 0) {
        twoFAField = field.first();
        console.log(`   📱 2FA field found: ${selector}`);
        break;
      }
    }
    
    if (twoFAField) {
      console.log('\n🚨 2FA REQUIRED!');
      console.log('================');
      console.log('📱 Please check your phone for the 2FA code');
      console.log('🔢 It should be a 6 or 8 digit number');
      console.log('');
      console.log('⏳ I am waiting for you to enter the code...');
      console.log('💡 Enter the code in the browser and press Enter');
      console.log('🎯 I will detect when you complete it');
      
      await takeScreenshot('2fa-required');
      
      // Wait for 2FA completion
      console.log('\n⏳ Waiting for 2FA completion...');
      console.log('   (Timeout: 3 minutes)');
      
      await page.waitForFunction(
        () => {
          const url = window.location.href;
          return url.includes('Dashboard') && !url.includes('login');
        },
        { timeout: 180000 } // 3 minutes
      );
      
      console.log('🎉 2FA COMPLETED SUCCESSFULLY!');
      await takeScreenshot('2fa-success');
      
    } else {
      console.log('   ℹ️ No 2FA field detected');
    }
    
    // Final verification
    console.log('\n🔍 STEP 8: Final authentication verification...');
    
    const finalUrl = page.url();
    console.log(`   📍 Final URL: ${finalUrl}`);
    
    // Check authentication indicators
    const userMenu = await page.locator('#header-details-user-fullname, .aui-dropdown2-trigger-text').count();
    const loginButton = await page.locator('text="Log In"').count();
    const dashboardTitle = await page.locator('h1:has-text("Dashboard"), .dashboard-title').count();
    
    console.log(`   🔍 User menu present: ${userMenu > 0}`);
    console.log(`   🔍 Login button still visible: ${loginButton > 0}`);
    console.log(`   🔍 Dashboard elements: ${dashboardTitle > 0}`);
    
    const isAuthenticated = finalUrl.includes('Dashboard') && 
                           !finalUrl.includes('login') && 
                           loginButton === 0;
    
    if (isAuthenticated) {
      console.log('\n🎉 AUTHENTICATION SUCCESSFUL!');
      console.log('==============================');
      
      // Save the authentication state
      await context.storageState({ 
        path: 'jira-uat-session-guided-2fa.json' 
      });
      
      console.log('💾 Session saved to: jira-uat-session-guided-2fa.json');
      
      // Copy to standard location
      const sessionData = fs.readFileSync('jira-uat-session-guided-2fa.json');
      fs.writeFileSync('playwright/.auth/jira-uat-user.json', sessionData);
      
      console.log('💾 Also copied to: playwright/.auth/jira-uat-user.json');
      console.log('🚀 Ready to run hundreds of automated tests!');
      
      return true;
      
    } else {
      console.log('\n❌ Authentication incomplete');
      console.log('💡 Manual completion may be needed');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error during guided login:', error.message);
    return false;
  } finally {
    console.log('\n⏳ Keeping browser open for 30 seconds for inspection...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    await browser.close();
  }
}

guided2FALogin()
  .then(success => {
    if (success) {
      console.log('\n🎉 GUIDED 2FA LOGIN COMPLETE!');
      console.log('✅ Full JIRA UAT authentication achieved');
      console.log('🧪 Ready to run comprehensive test suite');
    } else {
      console.log('\n❌ Guided login failed');
      console.log('💡 Check screenshots for debugging');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal guided login error:', error);
    process.exit(1);
  });
