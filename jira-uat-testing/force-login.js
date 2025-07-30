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

async function forceLogin() {
  console.log('💪 FORCE JIRA UAT LOGIN');
  console.log('========================');
  console.log('🔧 Forces interaction with hidden elements');
  
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
        path: `force-step-${step}-${name}.png`, 
        fullPage: true 
      });
      console.log(`📸 Screenshot: force-step-${step}-${name}.png`);
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
    
    // Wait for page to fully load
    console.log('⏳ Waiting for page to fully load...');
    await page.waitForTimeout(5000);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle');
    
    // Force show hidden elements with JavaScript
    console.log('🔧 Force showing hidden elements...');
    await page.evaluate(() => {
      // Make all hidden inputs visible
      const hiddenInputs = document.querySelectorAll('input[type="text"], input[type="password"], input[name="username"], input[name="password"]');
      hiddenInputs.forEach(input => {
        input.style.display = 'block';
        input.style.visibility = 'visible';
        input.style.opacity = '1';
        input.style.position = 'relative';
        input.style.zIndex = '9999';
        input.removeAttribute('hidden');
      });
      
      // Also try to trigger any JavaScript that might show the form
      const forms = document.querySelectorAll('form');
      forms.forEach(form => {
        form.style.display = 'block';
        form.style.visibility = 'visible';
      });
    });
    
    await takeScreenshot('after-force-show');
    
    // Try to fill username with force
    console.log('👤 Force filling username...');
    const usernameSelectors = [
      '#username-field',
      'input[name="username"]',
      'input[name="os_username"]',
      'input[id*="username"]',
      'input[placeholder*="username" i]'
    ];
    
    let usernameFilled = false;
    for (const selector of usernameSelectors) {
      try {
        console.log(`🔍 Trying username selector: ${selector}`);
        const field = page.locator(selector);
        const count = await field.count();
        console.log(`   Found ${count} elements`);
        
        if (count > 0) {
          // Force the field to be visible and interactable
          await page.evaluate((sel) => {
            const element = document.querySelector(sel);
            if (element) {
              element.style.display = 'block';
              element.style.visibility = 'visible';
              element.style.opacity = '1';
              element.style.position = 'relative';
              element.removeAttribute('hidden');
              element.removeAttribute('disabled');
              element.focus();
            }
          }, selector);
          
          // Clear and fill with force
          await field.fill('', { force: true });
          await field.fill(username, { force: true });
          console.log(`✅ Force filled username with: ${selector}`);
          usernameFilled = true;
          break;
        }
      } catch (error) {
        console.log(`⚠️ Failed username ${selector}: ${error.message}`);
      }
    }
    
    if (!usernameFilled) {
      console.log('❌ Could not force fill username');
      return false;
    }
    
    await takeScreenshot('username-force-filled');
    
    // Try to fill password with force
    console.log('🔐 Force filling password...');
    const passwordSelectors = [
      'input[name="password"]',
      'input[name="os_password"]',
      'input[type="password"]',
      'input[id*="password"]'
    ];
    
    let passwordFilled = false;
    for (const selector of passwordSelectors) {
      try {
        console.log(`🔍 Trying password selector: ${selector}`);
        const field = page.locator(selector);
        const count = await field.count();
        console.log(`   Found ${count} elements`);
        
        if (count > 0) {
          // Force the field to be visible and interactable
          await page.evaluate((sel) => {
            const element = document.querySelector(sel);
            if (element) {
              element.style.display = 'block';
              element.style.visibility = 'visible';
              element.style.opacity = '1';
              element.style.position = 'relative';
              element.removeAttribute('hidden');
              element.removeAttribute('disabled');
              element.focus();
            }
          }, selector);
          
          // Clear and fill with force
          await field.fill('', { force: true });
          await field.fill(password, { force: true });
          console.log(`✅ Force filled password with: ${selector}`);
          passwordFilled = true;
          break;
        }
      } catch (error) {
        console.log(`⚠️ Failed password ${selector}: ${error.message}`);
      }
    }
    
    if (!passwordFilled) {
      console.log('⚠️ Could not force fill password - might appear after username');
    }
    
    await takeScreenshot('password-force-filled');
    
    // Force check "Remember me" checkbox
    console.log('☑️ Force checking "Remember me"...');
    try {
      const checkboxSelectors = [
        'input[type="checkbox"]',
        'input[name*="remember" i]',
        'input[id*="remember" i]'
      ];
      
      for (const selector of checkboxSelectors) {
        const checkbox = page.locator(selector);
        if (await checkbox.count() > 0) {
          await checkbox.check({ force: true });
          console.log(`✅ Force checked "Remember me" with: ${selector}`);
          break;
        }
      }
    } catch (error) {
      console.log('⚠️ Could not find "Remember me" checkbox');
    }
    
    await takeScreenshot('remember-me-force-checked');
    
    // Force submit the form
    console.log('🚀 Force submitting form...');
    const submitSelectors = [
      'button:has-text("Log in")',
      'button[type="submit"]',
      'input[type="submit"]',
      'button:has-text("Continue")',
      '.login-button'
    ];
    
    let submitted = false;
    for (const selector of submitSelectors) {
      try {
        const button = page.locator(selector);
        if (await button.count() > 0) {
          await button.click({ force: true });
          console.log(`✅ Force clicked submit: ${selector}`);
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
    await takeScreenshot('after-force-submit');
    
    console.log(`📍 URL after submit: ${page.url()}`);
    
    // Handle certificate modal
    console.log('🔍 Checking for certificate modal...');
    try {
      const certButton = page.locator('button:has-text("OK"), button:has-text("Accept"), button:has-text("Continue")').first();
      await certButton.waitFor({ state: 'visible', timeout: 10000 });
      
      console.log('📜 Found certificate modal, clicking...');
      await certButton.click({ force: true });
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      await takeScreenshot('after-cert-modal');
      
    } catch (error) {
      console.log('ℹ️ No certificate modal found');
    }
    
    // Handle 2FA
    console.log('🔍 Checking for 2FA...');
    try {
      const twoFAField = page.locator('input[name*="code" i], input[placeholder*="code" i], input[type="text"][maxlength="6"]').first();
      await twoFAField.waitFor({ state: 'visible', timeout: 10000 });
      
      console.log('📱 2FA REQUIRED!');
      console.log('📱 Please check your phone and enter the 2FA code...');
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
      console.log('ℹ️ No 2FA required or already completed');
    }
    
    // Final verification
    await takeScreenshot('final-result');
    const finalUrl = page.url();
    console.log(`📍 Final URL: ${finalUrl}`);
    
    // Check authentication
    const userMenu = await page.locator('#header-details-user-fullname, .aui-dropdown2-trigger-text').count();
    const loginButtonFinal = await page.locator('text="Log In"').count();
    
    console.log(`🔍 User menu present: ${userMenu > 0}`);
    console.log(`🔍 Login button still visible: ${loginButtonFinal > 0}`);
    
    const isAuthenticated = finalUrl.includes('Dashboard') && 
                           !finalUrl.includes('login') && 
                           loginButtonFinal === 0;
    
    if (isAuthenticated) {
      console.log('🎉 SUCCESS: Force login completed!');
      
      // Save the authentication state
      await context.storageState({ 
        path: 'jira-uat-session-force.json' 
      });
      
      console.log('💾 Session saved to: jira-uat-session-force.json');
      
      // Copy to standard location
      const sessionData = fs.readFileSync('jira-uat-session-force.json');
      fs.writeFileSync('playwright/.auth/jira-uat-user.json', sessionData);
      
      console.log('💾 Also copied to: playwright/.auth/jira-uat-user.json');
      console.log('🚀 Ready to run automated tests!');
      
      return true;
      
    } else {
      console.log('❌ Force login incomplete');
      console.log('💡 Manual completion may be needed');
      
      // Wait for manual completion
      console.log('⏳ Waiting 60 seconds for manual completion...');
      try {
        await page.waitForFunction(
          () => {
            const url = window.location.href;
            return url.includes('Dashboard') && !url.includes('login');
          },
          { timeout: 60000 }
        );
        
        console.log('✅ Manual completion successful!');
        
        await context.storageState({ 
          path: 'jira-uat-session-manual-force.json' 
        });
        
        const sessionData = fs.readFileSync('jira-uat-session-manual-force.json');
        fs.writeFileSync('playwright/.auth/jira-uat-user.json', sessionData);
        
        console.log('💾 Manual session saved!');
        return true;
        
      } catch (error) {
        console.log('❌ Manual completion timeout');
        return false;
      }
    }
    
  } catch (error) {
    console.error('❌ Error during force login:', error.message);
    return false;
  } finally {
    console.log('⏳ Keeping browser open for 30 seconds...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    await browser.close();
  }
}

forceLogin()
  .then(success => {
    if (success) {
      console.log('\n🎉 FORCE LOGIN COMPLETE!');
      console.log('✅ JIRA UAT authentication successful');
      console.log('🚀 Run tests with: npx playwright test --headed');
    } else {
      console.log('\n❌ Force login failed');
      console.log('💡 Check screenshots and complete manually');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
