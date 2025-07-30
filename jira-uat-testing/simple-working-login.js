const { chromium } = require('@playwright/test');
const fs = require('fs');

async function simpleWorkingLogin() {
  console.log('✨ SIMPLE WORKING LOGIN');
  console.log('=======================');
  console.log('🎯 Based on what we learned - keep it simple!');
  
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
    
    console.log('🏠 Going to JIRA Dashboard (this worked before)...');
    await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa', {
      timeout: 30000
    });
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    console.log(`📍 Current URL: ${page.url()}`);
    
    // Take a simple screenshot
    await page.screenshot({ 
      path: 'simple-current-state.png',
      clip: { x: 0, y: 0, width: 1200, height: 800 }
    });
    console.log('📸 Screenshot: simple-current-state.png');
    
    // Check current authentication state
    const currentUrl = page.url();
    
    if (currentUrl.includes('Dashboard') && !currentUrl.includes('login')) {
      console.log('🎉 Already authenticated! Saving current session...');
      
      // Test if we can access protected pages
      console.log('🔍 Testing access to Create Issue page...');
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/CreateIssue!default.jspa');
      await page.waitForLoadState('networkidle');
      
      const createUrl = page.url();
      console.log(`📍 Create Issue URL: ${createUrl}`);
      
      if (!createUrl.includes('login')) {
        console.log('✅ Full access confirmed!');
        
        // Save the working session
        await context.storageState({ 
          path: 'jira-uat-session-simple-working.json' 
        });
        
        const sessionData = fs.readFileSync('jira-uat-session-simple-working.json');
        fs.writeFileSync('playwright/.auth/jira-uat-user.json', sessionData);
        
        console.log('💾 Working session saved!');
        console.log('🚀 Ready for automated testing!');
        return true;
      } else {
        console.log('⚠️ Partial authentication - need fresh login');
      }
    }
    
    // If we need to login, try the simplest approach
    if (currentUrl.includes('login')) {
      console.log('🔄 On login page - trying simple manual approach...');
      
      console.log('💡 MANUAL LOGIN INSTRUCTIONS:');
      console.log('1. 👀 Look at the browser window');
      console.log('2. 🖱️ Click "Log in with SSO" if available');
      console.log('3. 👤 OR fill username/password manually');
      console.log('4. 📱 Complete 2FA on your phone if required');
      console.log('5. ⏳ Script will detect completion automatically');
      
      console.log('⏳ Waiting up to 5 minutes for manual completion...');
      
      // Wait for successful login
      await page.waitForFunction(
        () => {
          const url = window.location.href;
          return url.includes('jirauat.smedigitalapps.com') && 
                 url.includes('Dashboard') && 
                 !url.includes('login');
        },
        { timeout: 300000 }
      );
      
      console.log('🎉 Manual login completed!');
      
      // Take success screenshot
      await page.screenshot({ 
        path: 'simple-login-success.png',
        clip: { x: 0, y: 0, width: 1200, height: 800 }
      });
      console.log('📸 Screenshot: simple-login-success.png');
      
      // Test full access again
      console.log('🔍 Testing full access after login...');
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/CreateIssue!default.jspa');
      await page.waitForLoadState('networkidle');
      
      const finalCreateUrl = page.url();
      console.log(`📍 Final Create Issue URL: ${finalCreateUrl}`);
      
      if (!finalCreateUrl.includes('login')) {
        console.log('✅ Full access confirmed after manual login!');
        
        // Save the fresh session
        await context.storageState({ 
          path: 'jira-uat-session-simple-manual.json' 
        });
        
        const sessionData = fs.readFileSync('jira-uat-session-simple-manual.json');
        fs.writeFileSync('playwright/.auth/jira-uat-user.json', sessionData);
        
        console.log('💾 Fresh manual session saved!');
        console.log('🚀 Ready for automated testing!');
        return true;
      } else {
        console.log('❌ Still no full access after manual login');
        return false;
      }
    }
    
    // Fallback - just save whatever session we have
    console.log('💡 Saving current session state...');
    
    await context.storageState({ 
      path: 'jira-uat-session-simple-fallback.json' 
    });
    
    const sessionData = fs.readFileSync('jira-uat-session-simple-fallback.json');
    fs.writeFileSync('playwright/.auth/jira-uat-user.json', sessionData);
    
    console.log('💾 Fallback session saved!');
    return true;
    
  } catch (error) {
    console.error('❌ Simple login error:', error.message);
    return false;
  } finally {
    console.log('⏳ Keeping browser open for 30 seconds for inspection...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    await browser.close();
  }
}

simpleWorkingLogin()
  .then(success => {
    if (success) {
      console.log('\n✨ SIMPLE LOGIN SUCCESS!');
      console.log('✅ JIRA UAT session established');
      console.log('🧪 Let\'s run some tests!');
    } else {
      console.log('\n❌ Simple login failed');
      console.log('💡 But we have screenshots to debug');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal simple error:', error);
    process.exit(1);
  });
