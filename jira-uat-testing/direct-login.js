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

async function directLogin() {
  console.log('🎯 DIRECT JIRA UAT LOGIN');
  console.log('========================');
  
  // Load .env file
  loadEnvFile();
  
  // Get credentials from environment (try multiple variable names)
  const username = process.env.JIRA_EMAIL || process.env.JIRA_USERNAME;
  const password = process.env.JIRA_PWD || process.env.JIRA_PASSWORD;
  
  console.log(`📧 Username: ${username ? username.substring(0, 15) + '...' : 'NOT SET'}`);
  console.log(`🔐 Password: ${password ? '***' + password.substring(password.length-3) : 'NOT SET'}`);
  
  if (!username || !password) {
    console.log('❌ Missing credentials');
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
    
    console.log('🌐 Going directly to JIRA login page...');
    
    // Go directly to the login page
    await page.goto('https://jirauat.smedigitalapps.com/jira/login.jsp', {
      timeout: 30000
    });
    
    await page.waitForLoadState('networkidle');
    
    console.log('📍 Current URL:', page.url());
    
    // Take screenshot of login page
    await page.screenshot({ 
      path: 'direct-login-page.png', 
      fullPage: true 
    });
    
    console.log('🔐 Filling in credentials...');
    
    // Fill username - try multiple selectors
    const usernameSelectors = [
      'input[name="os_username"]',
      'input[name="username"]',
      'input[id="login-form-username"]',
      'input[placeholder*="username"]',
      'input[type="text"]',
      '#username'
    ];
    
    let usernameFilled = false;
    for (const selector of usernameSelectors) {
      try {
        const usernameField = page.locator(selector);
        if (await usernameField.count() > 0) {
          await usernameField.fill(username);
          console.log(`✅ Filled username with: ${selector}`);
          usernameFilled = true;
          break;
        }
      } catch (error) {
        // Try next selector
      }
    }
    
    if (!usernameFilled) {
      console.log('❌ Could not find username field');
      console.log('🔍 Available input fields:');
      const inputs = await page.locator('input').all();
      for (let i = 0; i < inputs.length; i++) {
        const input = inputs[i];
        const name = await input.getAttribute('name');
        const id = await input.getAttribute('id');
        const type = await input.getAttribute('type');
        const placeholder = await input.getAttribute('placeholder');
        console.log(`   Input ${i}: name="${name}" id="${id}" type="${type}" placeholder="${placeholder}"`);
      }
      return false;
    }
    
    // Fill password
    const passwordSelectors = [
      'input[name="os_password"]',
      'input[name="password"]',
      'input[id="login-form-password"]',
      'input[type="password"]',
      '#password'
    ];
    
    let passwordFilled = false;
    for (const selector of passwordSelectors) {
      try {
        const passwordField = page.locator(selector);
        if (await passwordField.count() > 0) {
          await passwordField.fill(password);
          console.log(`✅ Filled password with: ${selector}`);
          passwordFilled = true;
          break;
        }
      } catch (error) {
        // Try next selector
      }
    }
    
    if (!passwordFilled) {
      console.log('❌ Could not find password field');
      return false;
    }
    
    // Submit the form
    const submitSelectors = [
      'input[name="login"]',
      'input[id="login-form-submit"]',
      'button[type="submit"]',
      'input[type="submit"]',
      'input[value="Log In"]',
      '.aui-button-primary'
    ];
    
    let submitted = false;
    for (const selector of submitSelectors) {
      try {
        const submitButton = page.locator(selector);
        if (await submitButton.count() > 0) {
          await submitButton.click();
          console.log(`✅ Clicked submit with: ${selector}`);
          submitted = true;
          break;
        }
      } catch (error) {
        // Try next selector
      }
    }
    
    if (!submitted) {
      console.log('🔄 Trying Enter key...');
      await page.keyboard.press('Enter');
    }
    
    console.log('⏳ Waiting for login to complete...');
    
    // Wait for redirect after login
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    // Handle certificate modal if it appears
    console.log('🔍 Checking for certificate modal...');
    try {
      const certModalSelectors = [
        'button:has-text("OK")',
        'button:has-text("Accept")',
        'button:has-text("Continue")',
        '.modal button',
        '[role="dialog"] button'
      ];
      
      for (const selector of certModalSelectors) {
        const modalButton = page.locator(selector);
        if (await modalButton.count() > 0) {
          await modalButton.click();
          console.log(`✅ Clicked cert modal: ${selector}`);
          await page.waitForLoadState('networkidle', { timeout: 10000 });
          break;
        }
      }
    } catch (error) {
      console.log('ℹ️ No cert modal found');
    }
    
    // Check if 2FA is required
    console.log('🔍 Checking for 2FA...');
    const twoFASelectors = [
      'input[name*="code"]',
      'input[placeholder*="code"]',
      'input[type="text"][maxlength="6"]',
      '.two-factor input'
    ];
    
    let needs2FA = false;
    for (const selector of twoFASelectors) {
      const twoFAField = page.locator(selector);
      if (await twoFAField.count() > 0) {
        needs2FA = true;
        console.log('📱 2FA required! Please complete on your phone...');
        console.log('⏳ Waiting up to 60 seconds for 2FA completion...');
        
        // Wait for 2FA completion
        await page.waitForFunction(
          () => {
            const url = window.location.href;
            return url.includes('Dashboard') || url.includes('secure/');
          },
          { timeout: 60000 }
        );
        
        console.log('✅ 2FA completed!');
        break;
      }
    }
    
    if (!needs2FA) {
      console.log('ℹ️ No 2FA required');
    }
    
    // Take final screenshot
    await page.screenshot({ 
      path: 'after-direct-login.png', 
      fullPage: true 
    });
    
    const finalUrl = page.url();
    console.log(`📍 Final URL: ${finalUrl}`);
    
    // Check if login was successful
    if (finalUrl.includes('Dashboard') || finalUrl.includes('secure/')) {
      console.log('🎉 SUCCESS: Login completed!');
      
      // Save the authentication state
      await context.storageState({ 
        path: 'jira-uat-session-direct.json' 
      });
      
      console.log('💾 Session saved to: jira-uat-session-direct.json');
      
      // Copy to standard location
      const sessionData = fs.readFileSync('jira-uat-session-direct.json');
      fs.writeFileSync('playwright/.auth/jira-uat-user.json', sessionData);
      
      console.log('💾 Also copied to: playwright/.auth/jira-uat-user.json');
      console.log('🚀 Ready to run automated tests!');
      
      return true;
      
    } else {
      console.log('❌ Login may have failed');
      console.log('💡 Check screenshot: after-direct-login.png');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  } finally {
    console.log('⏳ Keeping browser open for 10 seconds...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    await browser.close();
  }
}

directLogin()
  .then(success => {
    if (success) {
      console.log('\n🎉 DIRECT LOGIN COMPLETE!');
      console.log('✅ JIRA UAT authentication working');
      console.log('🚀 Run tests with: npx playwright test --headed');
    } else {
      console.log('\n❌ Direct login failed');
      console.log('💡 Check screenshots and try again');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
