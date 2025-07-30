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

async function completeAutomatedLogin() {
  console.log('🤖 COMPLETE AUTOMATED JIRA UAT LOGIN');
  console.log('===================================');
  
  // Load .env file
  loadEnvFile();
  
  // Get credentials from environment - UAT specific variables
  const username = process.env.JIRA_UAT_USERNAME || process.env.JIRA_USERNAME;  // mcarpent (not email)
  const password = process.env.JIRA_UAT_PWD || process.env.JIRA_PWD || process.env.JIRA_PASSWORD;
  
  console.log(`📧 Username from env: ${username ? username.substring(0, 15) + '...' : 'NOT SET'}`);
  console.log(`🔐 Password from env: ${password ? '***' + password.substring(password.length-3) : 'NOT SET'}`);
  
  if (!username || !password || username === 'your-jira-username' || password === 'your-jira-api-token') {
    console.log('❌ Please set your actual JIRA credentials in .env file:');
    console.log('   JIRA_USERNAME=your.email@sonymusic.com');
    console.log('   JIRA_PASSWORD=your_actual_password');
    console.log('   Or export them as environment variables');
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
    
    console.log('🌐 Opening JIRA UAT...');
    
    await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa', {
      timeout: 30000
    });
    
    await page.waitForLoadState('networkidle');
    
    console.log('🔍 Looking for Login button...');
    
    // Take screenshot to see current state
    await page.screenshot({ path: 'before-login-click.png', fullPage: true });
    
    // Find and click the Login button (it's at top right)
    const loginSelectors = [
      'a[href*="login.jsp"]',  // Direct link to login page
      'text="Log In"',
      '.aui-skip-link:has-text("Log in")',
      'a:has-text("Log in")',
      'a:has-text("Log In")'
    ];
    
    let loginClicked = false;
    for (const selector of loginSelectors) {
      try {
        const loginButton = page.locator(selector).first();
        const count = await loginButton.count();
        if (count > 0) {
          console.log(`📍 Found login button with: ${selector} (${count} elements)`);
          
          // Scroll to make sure it's visible
          await loginButton.scrollIntoViewIfNeeded();
          
          // Wait a moment for any animations
          await page.waitForTimeout(1000);
          
          // Click with force to bypass viewport issues
          await loginButton.click({ force: true });
          console.log(`🖱️ Clicked Login button with: ${selector}`);
          loginClicked = true;
          break;
        }
      } catch (error) {
        console.log(`⚠️ Failed with ${selector}: ${error.message}`);
      }
    }
    
    if (!loginClicked) {
      console.log('❌ Could not find or click login button');
      // Let's see what links are available
      const allLinks = await page.locator('a').all();
      console.log('🔍 Available links:');
      for (let i = 0; i < Math.min(allLinks.length, 10); i++) {
        const link = allLinks[i];
        const href = await link.getAttribute('href');
        const text = await link.textContent();
        console.log(`   Link ${i}: "${text}" -> ${href}`);
      }
      return false;
    }
    
    // Wait for login page to load
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    console.log('📍 Current URL after login click:', page.url());
    
    // Take screenshot of login page
    await page.screenshot({ 
      path: 'LOGIN-PAGE-READY.png', 
      fullPage: true 
    });
    
    console.log('🔐 Filling in credentials...');
    
    // Fill username - try multiple selectors
    const usernameSelectors = [
      'input[name="username"]',
      'input[placeholder*="username"]',
      'input[placeholder*="Username"]',
      'input[type="text"]',
      '#username',
      '.username'
    ];
    
    let usernameFilled = false;
    for (const selector of usernameSelectors) {
      try {
        const usernameField = page.locator(selector);
        if (await usernameField.count() > 0) {
          await usernameField.fill(username);
          console.log(`✅ Filled username with selector: ${selector}`);
          usernameFilled = true;
          break;
        }
      } catch (error) {
        // Try next selector
      }
    }
    
    if (!usernameFilled) {
      console.log('❌ Could not find username field');
      return false;
    }
    
    // Fill password - try multiple selectors (JIRA specific)
    const passwordSelectors = [
      'input[name="os_password"]',      // JIRA standard
      'input[name="password"]',
      'input[type="password"]',
      'input[id="login-form-password"]', // JIRA form ID
      'input[placeholder*="password"]',
      'input[placeholder*="Password"]',
      '#password',
      '.password',
      'input[name="pwd"]'               // Alternative
    ];
    
    let passwordFilled = false;
    for (const selector of passwordSelectors) {
      try {
        const passwordField = page.locator(selector);
        if (await passwordField.count() > 0) {
          await passwordField.fill(password);
          console.log(`✅ Filled password with selector: ${selector}`);
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
      'button[type="submit"]',
      'input[type="submit"]',
      'button:has-text("Log in")',
      'button:has-text("Login")',
      'button:has-text("Sign in")',
      '.submit-button',
      '#login-submit'
    ];
    
    let submitted = false;
    for (const selector of submitSelectors) {
      try {
        const submitButton = page.locator(selector);
        if (await submitButton.count() > 0) {
          await submitButton.click();
          console.log(`✅ Clicked submit with selector: ${selector}`);
          submitted = true;
          break;
        }
      } catch (error) {
        // Try next selector
      }
    }
    
    if (!submitted) {
      console.log('🔄 Trying to submit with Enter key...');
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
          console.log(`✅ Clicked cert modal OK button: ${selector}`);
          await page.waitForLoadState('networkidle', { timeout: 10000 });
          break;
        }
      }
    } catch (error) {
      console.log('ℹ️ No cert modal found (that\'s fine)');
    }
    
    // Check if 2FA is required
    console.log('🔍 Checking for 2FA prompt...');
    const twoFASelectors = [
      'input[name*="code"]',
      'input[placeholder*="code"]',
      'input[placeholder*="Code"]',
      'input[type="text"][maxlength="6"]',
      '.two-factor input',
      '#verification-code'
    ];
    
    let needs2FA = false;
    for (const selector of twoFASelectors) {
      const twoFAField = page.locator(selector);
      if (await twoFAField.count() > 0) {
        needs2FA = true;
        console.log('📱 2FA required! Please check your phone...');
        console.log('⏳ Waiting for you to enter 2FA code and submit...');
        console.log('💡 I\'ll wait up to 60 seconds for you to complete 2FA');
        
        // Wait for 2FA to be completed (URL change or login button disappears)
        await page.waitForFunction(
          () => {
            const url = window.location.href;
            const loginBtn = document.querySelector('text="Log In"');
            return url.includes('Dashboard') || !loginBtn;
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
    
    // Take screenshot after login attempt
    await page.screenshot({ 
      path: 'AFTER-LOGIN-ATTEMPT.png', 
      fullPage: true 
    });
    
    const finalUrl = page.url();
    const finalTitle = await page.title();
    
    console.log(`📍 Final URL: ${finalUrl}`);
    console.log(`📄 Final Title: ${finalTitle}`);
    
    // Check if login was successful
    const loginButton = page.locator('text="Log In"');
    const loginButtonExists = await loginButton.count() > 0;
    
    if (!loginButtonExists && finalUrl.includes('Dashboard')) {
      console.log('🎉 SUCCESS: Login completed successfully!');
      console.log('✅ No login button visible');
      console.log('✅ On dashboard page');
      
      // Save the authentication state
      await context.storageState({ 
        path: 'jira-uat-session-authenticated.json' 
      });
      
      console.log('💾 Authentication saved to: jira-uat-session-authenticated.json');
      
      // Copy to standard location
      const fs = require('fs');
      const sessionData = fs.readFileSync('jira-uat-session-authenticated.json');
      fs.writeFileSync('playwright/.auth/jira-uat-user.json', sessionData);
      
      console.log('💾 Also copied to: playwright/.auth/jira-uat-user.json');
      
      console.log('🎉 COMPLETE AUTOMATED LOGIN SUCCESSFUL!');
      console.log('🚀 You can now run automated tests!');
      
      return true;
      
    } else {
      console.log('❌ Login may have failed');
      if (loginButtonExists) {
        console.log('❌ Login button still visible');
      }
      if (!finalUrl.includes('Dashboard')) {
        console.log('❌ Not on dashboard page');
      }
      console.log('💡 Check the screenshot: AFTER-LOGIN-ATTEMPT.png');
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

completeAutomatedLogin()
  .then(success => {
    if (success) {
      console.log('\n🎉 AUTOMATED LOGIN COMPLETE!');
      console.log('✅ JIRA UAT authentication is now working');
      console.log('🚀 Run tests with: npx playwright test --headed');
    } else {
      console.log('\n❌ Automated login failed');
      console.log('💡 Check screenshots and try again');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
