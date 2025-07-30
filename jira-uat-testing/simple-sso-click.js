const { chromium } = require('@playwright/test');
const fs = require('fs');

async function simpleSSO() {
  console.log('🎭 ESCAPING THE KAFKA LOGIN LOOP');
  console.log('=================================');
  console.log('🔐 Going straight for the SSO button!');
  
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
    
    console.log('🌐 Opening JIRA UAT login...');
    await page.goto('https://jirauat.smedigitalapps.com/jira/login.jsp', {
      timeout: 30000
    });
    
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of the Kafka-esque form
    await page.screenshot({ 
      path: 'kafka-login-form.png', 
      fullPage: true 
    });
    console.log('📸 Screenshot: kafka-login-form.png');
    
    console.log('🔍 Looking for the SSO escape route...');
    
    // Click the SSO button directly
    const ssoButton = page.locator('button:has-text("Log in with SSO")');
    
    if (await ssoButton.count() > 0) {
      console.log('🎯 Found SSO button - clicking to escape the loop!');
      await ssoButton.click();
      
      await page.waitForLoadState('networkidle', { timeout: 30000 });
      
      await page.screenshot({ 
        path: 'after-sso-click.png', 
        fullPage: true 
      });
      console.log('📸 Screenshot: after-sso-click.png');
      
      console.log(`📍 URL after SSO click: ${page.url()}`);
      
      // Check if we're redirected to SSO provider
      const currentUrl = page.url();
      
      if (currentUrl.includes('login.microsoftonline.com') || 
          currentUrl.includes('accounts.google.com') || 
          currentUrl.includes('okta.com') ||
          currentUrl.includes('auth0.com') ||
          currentUrl.includes('adfs') ||
          !currentUrl.includes('jirauat.smedigitalapps.com')) {
        
        console.log('🔐 SUCCESS! Redirected to external SSO provider');
        console.log('👤 Please complete authentication in the browser...');
        console.log('⏳ Waiting up to 300 seconds for you to complete SSO...');
        
        // Wait for return to JIRA
        try {
          await page.waitForFunction(
            () => {
              const url = window.location.href;
              return url.includes('jirauat.smedigitalapps.com') && 
                     (url.includes('Dashboard') || url.includes('secure'));
            },
            { timeout: 300000 } // 5 minutes
          );
          
          console.log('🎉 SSO authentication completed!');
          
          await page.screenshot({ 
            path: 'sso-success.png', 
            fullPage: true 
          });
          
          // Save session
          await context.storageState({ 
            path: 'jira-uat-session-simple-sso.json' 
          });
          
          const sessionData = fs.readFileSync('jira-uat-session-simple-sso.json');
          fs.writeFileSync('playwright/.auth/jira-uat-user.json', sessionData);
          
          console.log('💾 SSO session saved successfully!');
          console.log('🚀 Ready to run automated tests!');
          
          return true;
          
        } catch (error) {
          console.log('⚠️ SSO timeout - but browser is still open for manual completion');
          return false;
        }
        
      } else {
        console.log('🤔 Still on JIRA - might need manual SSO completion');
        console.log('💡 Please complete any additional steps in the browser...');
        
        // Wait for manual completion
        console.log('⏳ Waiting 180 seconds for manual completion...');
        try {
          await page.waitForFunction(
            () => {
              const url = window.location.href;
              return url.includes('Dashboard') && !url.includes('login');
            },
            { timeout: 180000 }
          );
          
          console.log('✅ Manual completion successful!');
          
          await context.storageState({ 
            path: 'jira-uat-session-manual-simple.json' 
          });
          
          const sessionData = fs.readFileSync('jira-uat-session-manual-simple.json');
          fs.writeFileSync('playwright/.auth/jira-uat-user.json', sessionData);
          
          console.log('💾 Manual session saved!');
          return true;
          
        } catch (error) {
          console.log('⚠️ Manual completion timeout');
          return false;
        }
      }
      
    } else {
      console.log('❌ SSO button not found - still trapped in the Kafka loop!');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error escaping Kafka loop:', error.message);
    return false;
  } finally {
    console.log('⏳ Keeping browser open for 60 seconds...');
    await new Promise(resolve => setTimeout(resolve, 60000));
    await browser.close();
  }
}

simpleSSO()
  .then(success => {
    if (success) {
      console.log('\n🎉 ESCAPED THE KAFKA LOGIN LOOP!');
      console.log('✅ SSO authentication successful');
      console.log('📝 BUG REPORT: Username/password form is misleading');
      console.log('💡 Recommendation: Disable form or show "SSO Required" message');
    } else {
      console.log('\n❌ Still trapped in the bureaucratic maze');
      console.log('💡 Manual completion may be needed');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal Kafka error:', error);
    process.exit(1);
  });
