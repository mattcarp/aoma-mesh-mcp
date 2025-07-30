const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

async function ssoFocusedLogin() {
  console.log('🔐 SSO-FOCUSED JIRA UAT LOGIN');
  console.log('==============================');
  console.log('🎯 Prioritizes SSO authentication over traditional login');
  
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
        path: `sso-step-${step}-${name}.png`, 
        fullPage: true 
      });
      console.log(`📸 Screenshot: sso-step-${step}-${name}.png`);
      step++;
    };
    
    // Helper to wait for elements
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
    
    // Step 2: Look for SSO button and click it immediately
    console.log('\n🔐 STEP 2: Looking for SSO login option...');
    
    const ssoSelectors = [
      'button:has-text("Log in with SSO")',
      '#use-sso-button',
      'button:has-text("SSO")',
      'a:has-text("SSO")',
      'button:has-text("Single Sign")'
    ];
    
    let ssoClicked = false;
    for (const selector of ssoSelectors) {
      if (await waitForVisible(selector, 5000)) {
        console.log(`🔐 Found SSO button: ${selector}`);
        const ssoButton = page.locator(selector).first();
        await ssoButton.click();
        await page.waitForLoadState('networkidle', { timeout: 30000 });
        await takeScreenshot('after-sso-click');
        console.log('✅ Clicked SSO login button');
        ssoClicked = true;
        break;
      }
    }
    
    if (!ssoClicked) {
      console.log('❌ No SSO button found, falling back to Continue button...');
      
      // Fallback: Click Continue button
      if (await waitForVisible('button:has-text("Continue")')) {
        const continueButton = page.locator('button:has-text("Continue")').first();
        await continueButton.click();
        await page.waitForLoadState('networkidle', { timeout: 30000 });
        await takeScreenshot('after-continue-click');
        console.log('✅ Clicked Continue button as fallback');
      }
    }
    
    console.log(`📍 URL after SSO/Continue: ${page.url()}`);
    
    // Step 3: Handle SSO authentication flow
    console.log('\n🔐 STEP 3: Handle SSO authentication...');
    
    // Wait for SSO provider page or authentication form
    await page.waitForTimeout(5000);
    await takeScreenshot('sso-auth-page');
    
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);
    
    // Check if we're on an SSO provider page (Microsoft, Google, etc.)
    const ssoProviders = [
      'login.microsoftonline.com',
      'accounts.google.com',
      'okta.com',
      'auth0.com',
      'adfs',
      'sso'
    ];
    
    const isOnSSOProvider = ssoProviders.some(provider => currentUrl.includes(provider));
    
    if (isOnSSOProvider) {
      console.log('🔐 Detected SSO provider page!');
      console.log('👤 Please complete SSO authentication manually in the browser...');
      console.log('⏳ Waiting up to 180 seconds for SSO completion...');
      
      // Wait for SSO completion (return to JIRA)
      try {
        await page.waitForFunction(
          () => {
            const url = window.location.href;
            return url.includes('jirauat.smedigitalapps.com') && 
                   (url.includes('Dashboard') || url.includes('secure'));
          },
          { timeout: 180000 }
        );
        
        console.log('✅ SSO authentication completed!');
        await takeScreenshot('after-sso-completion');
        
      } catch (error) {
        console.log('⚠️ SSO authentication timeout - checking current state...');
        await takeScreenshot('sso-timeout-state');
      }
      
    } else {
      console.log('ℹ️ Not on external SSO provider - might be internal authentication');
      
      // Check if we need to enter credentials on JIRA's own SSO form
      if (await waitForVisible('input[name="username"], input[type="email"]', 10000)) {
        console.log('👤 Found username field on SSO form...');
        
        // Load environment for credentials
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
        
        loadEnvFile();
        const username = process.env.JIRA_UAT_USERNAME || process.env.JIRA_USERNAME;
        const password = process.env.JIRA_UAT_PWD || process.env.JIRA_PWD;
        
        if (username) {
          const usernameField = page.locator('input[name="username"], input[type="email"]').first();
          await usernameField.fill(username);
          console.log(`✅ Filled username: ${username}`);
          
          // Look for Continue or Next button
          const nextButton = page.locator('button:has-text("Continue"), button:has-text("Next"), button[type="submit"]').first();
          if (await nextButton.count() > 0) {
            await nextButton.click();
            await page.waitForLoadState('networkidle', { timeout: 30000 });
            console.log('✅ Clicked Next/Continue after username');
          }
          
          // Check for password field
          if (await waitForVisible('input[name="password"], input[type="password"]', 10000)) {
            const passwordField = page.locator('input[name="password"], input[type="password"]').first();
            await passwordField.fill(password);
            console.log('✅ Filled password');
            
            // Submit
            const submitButton = page.locator('button:has-text("Sign in"), button:has-text("Log in"), button[type="submit"]').first();
            if (await submitButton.count() > 0) {
              await submitButton.click();
              await page.waitForLoadState('networkidle', { timeout: 30000 });
              console.log('✅ Submitted SSO credentials');
            }
          }
        }
      } else {
        console.log('💡 Manual SSO completion may be required...');
        console.log('⏳ Waiting 120 seconds for manual completion...');
        
        try {
          await page.waitForFunction(
            () => {
              const url = window.location.href;
              return url.includes('Dashboard') && !url.includes('login');
            },
            { timeout: 120000 }
          );
          
          console.log('✅ Manual SSO completion successful!');
          
        } catch (error) {
          console.log('⚠️ Manual completion timeout');
        }
      }
    }
    
    // Step 4: Handle 2FA if required
    console.log('\n📱 STEP 4: Check for 2FA...');
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
    
    // Step 5: Final verification
    console.log('\n🔄 STEP 5: Final verification...');
    await page.waitForTimeout(5000);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await takeScreenshot('final-sso-result');
    
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
      console.log('🎉 SUCCESS: SSO login completed!');
      
      // Save the authentication state
      await context.storageState({ 
        path: 'jira-uat-session-sso.json' 
      });
      
      console.log('💾 Session saved to: jira-uat-session-sso.json');
      
      // Copy to standard location
      const sessionData = fs.readFileSync('jira-uat-session-sso.json');
      fs.writeFileSync('playwright/.auth/jira-uat-user.json', sessionData);
      
      console.log('💾 Also copied to: playwright/.auth/jira-uat-user.json');
      console.log('🚀 Ready to run automated tests!');
      
      return true;
      
    } else {
      console.log('❌ SSO login incomplete');
      console.log('💡 Manual completion may be needed');
      
      // Extended wait for manual completion
      console.log('⏳ Waiting 120 seconds for manual completion...');
      try {
        await page.waitForFunction(
          () => {
            const url = window.location.href;
            return url.includes('Dashboard') && !url.includes('login');
          },
          { timeout: 120000 }
        );
        
        console.log('✅ Manual completion successful!');
        
        await context.storageState({ 
          path: 'jira-uat-session-manual-sso.json' 
        });
        
        const sessionData = fs.readFileSync('jira-uat-session-manual-sso.json');
        fs.writeFileSync('playwright/.auth/jira-uat-user.json', sessionData);
        
        console.log('💾 Manual SSO session saved!');
        return true;
        
      } catch (error) {
        console.log('❌ Manual completion timeout');
        return false;
      }
    }
    
  } catch (error) {
    console.error('❌ Error during SSO login:', error.message);
    return false;
  } finally {
    console.log('⏳ Keeping browser open for 30 seconds...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    await browser.close();
  }
}

ssoFocusedLogin()
  .then(success => {
    if (success) {
      console.log('\n🎉 SSO LOGIN COMPLETE!');
      console.log('✅ JIRA UAT authentication successful via SSO');
      console.log('🚀 Run tests with: npx playwright test --headed');
    } else {
      console.log('\n❌ SSO login failed');
      console.log('💡 Check screenshots and complete manually');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
