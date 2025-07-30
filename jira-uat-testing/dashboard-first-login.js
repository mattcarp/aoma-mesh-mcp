const { chromium } = require('@playwright/test');
const fs = require('fs');

async function dashboardFirstLogin() {
  console.log('🏠 DASHBOARD-FIRST LOGIN APPROACH');
  console.log('==================================');
  console.log('🎯 Going to dashboard first, let JIRA redirect us properly');
  
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
        path: `dashboard-${step}-${name}.png`, 
        fullPage: true 
      });
      console.log(`📸 Screenshot: dashboard-${step}-${name}.png`);
      step++;
    };
    
    // APPROACH: Go directly to dashboard, let JIRA handle the auth flow
    console.log('🏠 Going directly to JIRA Dashboard...');
    await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa', {
      timeout: 30000
    });
    
    await page.waitForLoadState('networkidle');
    await takeScreenshot('dashboard-redirect');
    
    console.log(`📍 Current URL: ${page.url()}`);
    
    // Wait for any redirects to complete
    await page.waitForTimeout(5000);
    
    // Check what page we're on
    const currentUrl = page.url();
    
    if (currentUrl.includes('login')) {
      console.log('🔄 Redirected to login page - this is good!');
      
      // Now try to find and click any available login options
      await takeScreenshot('redirected-login-page');
      
      // Look for SSO button first
      console.log('🔍 Looking for SSO option...');
      
      // Wait for page to be fully loaded
      await page.waitForTimeout(3000);
      
      // Try clicking SSO if available
      const ssoButton = page.locator('text="Log in with SSO"');
      const ssoCount = await ssoButton.count();
      
      if (ssoCount > 0) {
        console.log('🔐 Found SSO button, clicking...');
        try {
          // Scroll to SSO button
          await ssoButton.scrollIntoViewIfNeeded();
          await page.waitForTimeout(1000);
          
          // Click SSO button
          await ssoButton.click();
          console.log('✅ Clicked SSO button');
          
          await page.waitForLoadState('networkidle', { timeout: 30000 });
          await takeScreenshot('after-sso-click');
          
          const ssoUrl = page.url();
          console.log(`📍 URL after SSO: ${ssoUrl}`);
          
          // Check if we're on an external SSO provider
          const isExternalSSO = !ssoUrl.includes('jirauat.smedigitalapps.com') ||
                               ssoUrl.includes('login.microsoftonline.com') ||
                               ssoUrl.includes('accounts.google.com') ||
                               ssoUrl.includes('okta.com');
          
          if (isExternalSSO) {
            console.log('🎉 SUCCESS! Redirected to external SSO provider');
            console.log('👤 Please complete SSO authentication...');
            console.log('⏳ Waiting up to 5 minutes for completion...');
            
            // Wait for return to JIRA
            await page.waitForFunction(
              () => {
                const url = window.location.href;
                return url.includes('jirauat.smedigitalapps.com') && 
                       url.includes('Dashboard');
              },
              { timeout: 300000 }
            );
            
            console.log('🎉 SSO completed! Back on JIRA Dashboard');
            await takeScreenshot('sso-success');
            
            // Save session
            await context.storageState({ 
              path: 'jira-uat-session-dashboard-sso.json' 
            });
            
            const sessionData = fs.readFileSync('jira-uat-session-dashboard-sso.json');
            fs.writeFileSync('playwright/.auth/jira-uat-user.json', sessionData);
            
            console.log('💾 Dashboard SSO session saved!');
            return true;
          }
        } catch (error) {
          console.log(`⚠️ SSO click failed: ${error.message}`);
        }
      }
      
      // If SSO didn't work, try traditional login
      console.log('🔄 Trying traditional login...');
      
      // Load credentials
      function loadEnvFile() {
        const envPath = require('path').join(__dirname, '../.env');
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
      
      if (username && password) {
        console.log(`👤 Using credentials: ${username}`);
        
        // Fill username
        const usernameField = page.locator('input[name="username"], #username-field');
        if (await usernameField.count() > 0) {
          await usernameField.fill(username);
          console.log('✅ Filled username');
          
          // Fill password
          const passwordField = page.locator('input[name="password"], input[type="password"]');
          if (await passwordField.count() > 0) {
            await passwordField.fill(password);
            console.log('✅ Filled password');
            
            // Check remember me
            const rememberMe = page.locator('input[type="checkbox"]');
            if (await rememberMe.count() > 0) {
              await rememberMe.check();
              console.log('✅ Checked remember me');
            }
            
            await takeScreenshot('credentials-filled');
            
            // Submit
            const submitButton = page.locator('button:has-text("Log in"), button[type="submit"]');
            if (await submitButton.count() > 0) {
              await submitButton.click();
              console.log('✅ Clicked submit');
              
              await page.waitForLoadState('networkidle', { timeout: 30000 });
              await takeScreenshot('after-submit');
              
              const afterSubmitUrl = page.url();
              console.log(`📍 URL after submit: ${afterSubmitUrl}`);
              
              // Check for 2FA
              const twoFAField = page.locator('input[name*="code"], input[placeholder*="code"]');
              if (await twoFAField.count() > 0) {
                console.log('📱 2FA required - waiting for manual entry...');
                await takeScreenshot('2fa-required');
                
                await page.waitForFunction(
                  () => {
                    const url = window.location.href;
                    return url.includes('Dashboard') && !url.includes('login');
                  },
                  { timeout: 120000 }
                );
                
                console.log('✅ 2FA completed!');
              }
              
              // Check if we're authenticated
              const finalUrl = page.url();
              if (finalUrl.includes('Dashboard') && !finalUrl.includes('login')) {
                console.log('🎉 Traditional login successful!');
                
                await context.storageState({ 
                  path: 'jira-uat-session-dashboard-traditional.json' 
                });
                
                const sessionData = fs.readFileSync('jira-uat-session-dashboard-traditional.json');
                fs.writeFileSync('playwright/.auth/jira-uat-user.json', sessionData);
                
                console.log('💾 Traditional login session saved!');
                return true;
              }
            }
          }
        }
      }
      
    } else if (currentUrl.includes('Dashboard')) {
      console.log('🎉 Already authenticated! No login needed');
      
      await context.storageState({ 
        path: 'jira-uat-session-already-auth.json' 
      });
      
      const sessionData = fs.readFileSync('jira-uat-session-already-auth.json');
      fs.writeFileSync('playwright/.auth/jira-uat-user.json', sessionData);
      
      console.log('💾 Existing session saved!');
      return true;
      
    } else {
      console.log('🤔 Unexpected redirect...');
      await takeScreenshot('unexpected-page');
    }
    
    // If we get here, try manual completion
    console.log('💡 Waiting for manual completion...');
    await page.waitForFunction(
      () => {
        const url = window.location.href;
        return url.includes('Dashboard') && !url.includes('login');
      },
      { timeout: 180000 }
    );
    
    console.log('✅ Manual completion successful!');
    
    await context.storageState({ 
      path: 'jira-uat-session-manual-dashboard.json' 
    });
    
    const sessionData = fs.readFileSync('jira-uat-session-manual-dashboard.json');
    fs.writeFileSync('playwright/.auth/jira-uat-user.json', sessionData);
    
    console.log('💾 Manual session saved!');
    return true;
    
  } catch (error) {
    console.error('❌ Dashboard approach error:', error.message);
    return false;
  } finally {
    console.log('⏳ Keeping browser open for 60 seconds...');
    await new Promise(resolve => setTimeout(resolve, 60000));
    await browser.close();
  }
}

dashboardFirstLogin()
  .then(success => {
    if (success) {
      console.log('\n🎉 DASHBOARD APPROACH SUCCESS!');
      console.log('✅ JIRA UAT authentication completed');
      console.log('🚀 Ready for automated testing!');
    } else {
      console.log('\n❌ Dashboard approach failed');
      console.log('💡 Will try next approach...');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal dashboard error:', error);
    process.exit(1);
  });
