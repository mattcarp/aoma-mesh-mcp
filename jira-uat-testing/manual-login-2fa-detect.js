const { chromium } = require('@playwright/test');
const fs = require('fs');

async function manualLogin2FADetect() {
  console.log('👤 MANUAL LOGIN WITH 2FA DETECTION');
  console.log('====================================');
  console.log('🎯 I will open the browser, YOU handle the login, I will detect 2FA');
  
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
    
    console.log('\n🌐 Opening JIRA UAT login page...');
    await page.goto('https://jirauat.smedigitalapps.com/jira/login.jsp', {
      timeout: 30000
    });
    
    await page.waitForLoadState('networkidle');
    
    console.log('📍 Browser opened at: https://jirauat.smedigitalapps.com/jira/login.jsp');
    console.log('');
    console.log('🎯 YOUR TURN - PLEASE DO THE FOLLOWING:');
    console.log('=====================================');
    console.log('1. 👀 Look at the browser window');
    console.log('2. 🖱️ Click "Log in with SSO" if available');
    console.log('3. 👤 OR fill username: mcarpent');
    console.log('4. 🔐 OR fill password: Dooley1_Jude2');
    console.log('5. ☑️ Check "Remember me" if available');
    console.log('6. 🚀 Click the login/submit button');
    console.log('7. 📜 Click "OK" on any certificate modal');
    console.log('8. 📱 STOP when you see the 2FA code field');
    console.log('');
    console.log('⏳ I am monitoring the page and will detect when 2FA appears...');
    
    let step = 1;
    const takeScreenshot = async (name) => {
      await page.screenshot({ 
        path: `manual-${step}-${name}.png`, 
        fullPage: true 
      });
      console.log(`📸 Screenshot: manual-${step}-${name}.png`);
      step++;
    };
    
    await takeScreenshot('initial-page');
    
    // Monitor for changes every 5 seconds
    let lastUrl = page.url();
    let checkCount = 0;
    
    while (checkCount < 60) { // 5 minutes total
      await page.waitForTimeout(5000);
      checkCount++;
      
      const currentUrl = page.url();
      
      // Check if URL changed
      if (currentUrl !== lastUrl) {
        console.log(`📍 URL changed: ${currentUrl}`);
        lastUrl = currentUrl;
        await takeScreenshot(`url-change-${checkCount}`);
      }
      
      // Check for 2FA field
      const twoFASelectors = [
        'input[name*="code" i]',
        'input[placeholder*="code" i]', 
        'input[type="text"][maxlength="6"]',
        'input[type="text"][maxlength="8"]',
        'input[id*="2fa" i]',
        'input[id*="verification" i]',
        'input[placeholder*="verification" i]'
      ];
      
      let twoFAFound = false;
      for (const selector of twoFASelectors) {
        const field = page.locator(selector);
        if (await field.count() > 0) {
          console.log('\n🚨 2FA FIELD DETECTED!');
          console.log('======================');
          console.log(`📱 Found 2FA field: ${selector}`);
          console.log('');
          console.log('🔢 NOW IS THE TIME!');
          console.log('📱 Check your phone for the 2FA code');
          console.log('🎯 Enter the code in the browser field');
          console.log('⚡ Press Enter or click Submit');
          console.log('');
          console.log('⏳ I will wait for you to complete it...');
          
          await takeScreenshot('2fa-detected');
          twoFAFound = true;
          break;
        }
      }
      
      if (twoFAFound) {
        // Wait for 2FA completion
        console.log('\n⏳ Monitoring for 2FA completion...');
        
        await page.waitForFunction(
          () => {
            const url = window.location.href;
            return url.includes('Dashboard') && !url.includes('login');
          },
          { timeout: 180000 } // 3 minutes for 2FA
        );
        
        console.log('\n🎉 2FA COMPLETED SUCCESSFULLY!');
        console.log('==============================');
        await takeScreenshot('2fa-success');
        
        // Save the authentication state
        await context.storageState({ 
          path: 'jira-uat-session-manual-2fa.json' 
        });
        
        console.log('💾 Session saved to: jira-uat-session-manual-2fa.json');
        
        // Copy to standard location
        const sessionData = fs.readFileSync('jira-uat-session-manual-2fa.json');
        fs.writeFileSync('playwright/.auth/jira-uat-user.json', sessionData);
        
        console.log('💾 Also copied to: playwright/.auth/jira-uat-user.json');
        console.log('🚀 Ready to run hundreds of automated tests!');
        
        return true;
      }
      
      // Check if already authenticated (no 2FA needed)
      if (currentUrl.includes('Dashboard') && !currentUrl.includes('login')) {
        console.log('\n🎉 AUTHENTICATION COMPLETED (NO 2FA NEEDED)!');
        console.log('==============================================');
        await takeScreenshot('auth-success-no-2fa');
        
        // Save the authentication state
        await context.storageState({ 
          path: 'jira-uat-session-manual-no-2fa.json' 
        });
        
        console.log('💾 Session saved to: jira-uat-session-manual-no-2fa.json');
        
        // Copy to standard location
        const sessionData = fs.readFileSync('jira-uat-session-manual-no-2fa.json');
        fs.writeFileSync('playwright/.auth/jira-uat-user.json', sessionData);
        
        console.log('💾 Also copied to: playwright/.auth/jira-uat-user.json');
        console.log('🚀 Ready to run hundreds of automated tests!');
        
        return true;
      }
      
      // Progress indicator
      if (checkCount % 6 === 0) { // Every 30 seconds
        console.log(`⏳ Still waiting... (${Math.floor(checkCount/12)}/5 minutes) - Current: ${currentUrl}`);
      }
    }
    
    console.log('\n⏰ Timeout reached');
    console.log('💡 Manual login may need more time');
    return false;
    
  } catch (error) {
    console.error('❌ Error during manual login detection:', error.message);
    return false;
  } finally {
    console.log('\n⏳ Keeping browser open for 30 seconds for final inspection...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    await browser.close();
  }
}

manualLogin2FADetect()
  .then(success => {
    if (success) {
      console.log('\n🎉 MANUAL LOGIN WITH 2FA DETECTION SUCCESS!');
      console.log('✅ Full JIRA UAT authentication achieved');
      console.log('🧪 Ready to run comprehensive test suite');
    } else {
      console.log('\n❌ Manual login detection failed or timed out');
      console.log('💡 Check screenshots for current state');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal manual login error:', error);
    process.exit(1);
  });
