const { chromium } = require('@playwright/test');
const fs = require('fs');

async function hybridFreshAuth() {
  console.log('🔄 HYBRID FRESH AUTHENTICATION');
  console.log('===============================');
  console.log('🎯 Force fresh login from current partial session');
  
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
        path: `hybrid-${step}-${name}.png`, 
        fullPage: true 
      });
      console.log(`📸 Screenshot: hybrid-${step}-${name}.png`);
      step++;
    };
    
    // Start with dashboard to see current state
    console.log('🏠 Checking current authentication state...');
    await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa', {
      timeout: 30000
    });
    
    await page.waitForLoadState('networkidle');
    await takeScreenshot('current-state');
    
    console.log(`📍 Current URL: ${page.url()}`);
    
    // Check if there's a "Log In" button visible (indicating partial auth)
    const loginButton = page.locator('text="Log In"');
    const loginCount = await loginButton.count();
    
    if (loginCount > 0) {
      console.log('🔄 Found "Log In" button - triggering fresh authentication...');
      
      await loginButton.click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });
      await takeScreenshot('after-login-click');
      
      console.log(`📍 URL after login click: ${page.url()}`);
      
      // Now we should be on the proper login page
      if (page.url().includes('login')) {
        console.log('✅ Successfully reached login page');
        
        // Try SSO first
        const ssoButton = page.locator('text="Log in with SSO"');
        if (await ssoButton.count() > 0) {
          console.log('🔐 Clicking SSO button...');
          
          try {
            await ssoButton.scrollIntoViewIfNeeded();
            await ssoButton.click();
            
            await page.waitForLoadState('networkidle', { timeout: 30000 });
            await takeScreenshot('after-sso');
            
            const ssoUrl = page.url();
            console.log(`📍 SSO URL: ${ssoUrl}`);
            
            // Check if redirected to external SSO
            if (!ssoUrl.includes('jirauat.smedigitalapps.com')) {
              console.log('🎉 Redirected to external SSO provider!');
              console.log('👤 Please complete SSO authentication...');
              console.log('⏳ Waiting up to 5 minutes...');
              
              await page.waitForFunction(
                () => {
                  const url = window.location.href;
                  return url.includes('jirauat.smedigitalapps.com') && 
                         url.includes('Dashboard');
                },
                { timeout: 300000 }
              );
              
              console.log('🎉 SSO authentication completed!');
              await takeScreenshot('sso-success');
              
              // Save the fresh session
              await context.storageState({ 
                path: 'jira-uat-session-hybrid-sso.json' 
              });
              
              const sessionData = fs.readFileSync('jira-uat-session-hybrid-sso.json');
              fs.writeFileSync('playwright/.auth/jira-uat-user.json', sessionData);
              
              console.log('💾 Fresh SSO session saved!');
              return true;
            }
          } catch (error) {
            console.log(`⚠️ SSO failed: ${error.message}`);
          }
        }
        
        // Fallback to traditional login
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
          
          // Wait for and fill username
          const usernameField = page.locator('input[name="username"], #username-field');
          await usernameField.waitFor({ state: 'visible', timeout: 15000 });
          await usernameField.fill(username);
          console.log('✅ Filled username');
          
          // Wait for and fill password
          const passwordField = page.locator('input[name="password"], input[type="password"]');
          await passwordField.waitFor({ state: 'visible', timeout: 15000 });
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
          await submitButton.click();
          console.log('✅ Submitted credentials');
          
          await page.waitForLoadState('networkidle', { timeout: 30000 });
          await takeScreenshot('after-submit');
          
          // Handle 2FA
          const twoFAField = page.locator('input[name*="code"], input[placeholder*="code"]');
          if (await twoFAField.count() > 0) {
            console.log('📱 2FA REQUIRED!');
            console.log('📱 Please check your phone and enter the code...');
            console.log('⏳ Waiting up to 2 minutes for completion...');
            
            await takeScreenshot('2fa-required');
            
            await page.waitForFunction(
              () => {
                const url = window.location.href;
                return url.includes('Dashboard') && !url.includes('login');
              },
              { timeout: 120000 }
            );
            
            console.log('✅ 2FA completed!');
            await takeScreenshot('2fa-success');
          }
          
          // Verify we're authenticated
          const finalUrl = page.url();
          if (finalUrl.includes('Dashboard') && !finalUrl.includes('login')) {
            console.log('🎉 Fresh authentication successful!');
            
            // Save the fresh session
            await context.storageState({ 
              path: 'jira-uat-session-hybrid-fresh.json' 
            });
            
            const sessionData = fs.readFileSync('jira-uat-session-hybrid-fresh.json');
            fs.writeFileSync('playwright/.auth/jira-uat-user.json', sessionData);
            
            console.log('💾 Fresh authentication session saved!');
            return true;
          }
        }
      }
    } else {
      console.log('ℹ️ No "Log In" button found - checking if fully authenticated...');
      
      // Test access to a protected page
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/CreateIssue!default.jspa');
      await page.waitForLoadState('networkidle');
      await takeScreenshot('create-issue-test');
      
      const createUrl = page.url();
      console.log(`📍 Create issue URL: ${createUrl}`);
      
      if (!createUrl.includes('login')) {
        console.log('🎉 Already fully authenticated!');
        
        // Save current session
        await context.storageState({ 
          path: 'jira-uat-session-hybrid-existing.json' 
        });
        
        const sessionData = fs.readFileSync('jira-uat-session-hybrid-existing.json');
        fs.writeFileSync('playwright/.auth/jira-uat-user.json', sessionData);
        
        console.log('💾 Existing full session saved!');
        return true;
      }
    }
    
    // Manual completion fallback
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
      path: 'jira-uat-session-hybrid-manual.json' 
    });
    
    const sessionData = fs.readFileSync('jira-uat-session-hybrid-manual.json');
    fs.writeFileSync('playwright/.auth/jira-uat-user.json', sessionData);
    
    console.log('💾 Manual session saved!');
    return true;
    
  } catch (error) {
    console.error('❌ Hybrid auth error:', error.message);
    return false;
  } finally {
    console.log('⏳ Keeping browser open for 30 seconds...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    await browser.close();
  }
}

hybridFreshAuth()
  .then(success => {
    if (success) {
      console.log('\n🎉 HYBRID AUTHENTICATION SUCCESS!');
      console.log('✅ Fresh JIRA UAT session established');
      console.log('🚀 Ready for full automated testing!');
    } else {
      console.log('\n❌ Hybrid authentication failed');
      console.log('💡 Manual intervention may be needed');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal hybrid error:', error);
    process.exit(1);
  });
