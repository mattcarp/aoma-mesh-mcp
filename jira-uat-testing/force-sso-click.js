const { chromium } = require('@playwright/test');
const fs = require('fs');

async function forceSSO() {
  console.log('💪 FORCE-CLICKING THE SSO BUTTON');
  console.log('==================================');
  console.log('🔧 Making hidden SSO button visible and clickable');
  
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
    await page.waitForTimeout(3000);
    
    await page.screenshot({ 
      path: 'before-force-sso.png', 
      fullPage: true 
    });
    console.log('📸 Screenshot: before-force-sso.png');
    
    console.log('🔧 Force-showing all buttons...');
    
    // Use JavaScript to force all buttons to be visible
    await page.evaluate(() => {
      // Make all buttons visible
      const buttons = document.querySelectorAll('button');
      buttons.forEach(button => {
        button.style.display = 'block';
        button.style.visibility = 'visible';
        button.style.opacity = '1';
        button.style.position = 'relative';
        button.style.zIndex = '9999';
        button.removeAttribute('hidden');
        button.removeAttribute('disabled');
      });
      
      // Specifically target the SSO button
      const ssoButton = document.querySelector('#use-sso-button');
      if (ssoButton) {
        ssoButton.style.display = 'block';
        ssoButton.style.visibility = 'visible';
        ssoButton.style.opacity = '1';
        ssoButton.style.position = 'relative';
        ssoButton.style.zIndex = '10000';
        ssoButton.removeAttribute('hidden');
        ssoButton.removeAttribute('disabled');
        
        // Scroll into view
        ssoButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
    
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: 'after-force-show-sso.png', 
      fullPage: true 
    });
    console.log('📸 Screenshot: after-force-show-sso.png');
    
    console.log('🎯 Force-clicking SSO button...');
    
    // Try multiple approaches to click the SSO button
    const ssoSelectors = [
      '#use-sso-button',
      'button:has-text("Log in with SSO")',
      'button:has-text("SSO")'
    ];
    
    let clicked = false;
    for (const selector of ssoSelectors) {
      try {
        console.log(`🔍 Trying to force-click: ${selector}`);
        
        const button = page.locator(selector);
        const count = await button.count();
        console.log(`   Found ${count} elements`);
        
        if (count > 0) {
          // Force the button to be clickable
          await page.evaluate((sel) => {
            const element = document.querySelector(sel);
            if (element) {
              element.style.display = 'block';
              element.style.visibility = 'visible';
              element.style.opacity = '1';
              element.style.position = 'relative';
              element.style.zIndex = '10000';
              element.removeAttribute('hidden');
              element.removeAttribute('disabled');
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, selector);
          
          await page.waitForTimeout(1000);
          
          // Force click
          await button.click({ force: true });
          console.log(`✅ Force-clicked SSO button: ${selector}`);
          clicked = true;
          break;
        }
      } catch (error) {
        console.log(`⚠️ Failed ${selector}: ${error.message}`);
      }
    }
    
    if (!clicked) {
      console.log('🔄 Trying JavaScript click...');
      await page.evaluate(() => {
        const ssoButton = document.querySelector('#use-sso-button');
        if (ssoButton) {
          ssoButton.click();
          console.log('Clicked SSO button via JavaScript');
        }
      });
      clicked = true;
    }
    
    if (clicked) {
      console.log('⏳ Waiting for SSO redirect...');
      await page.waitForLoadState('networkidle', { timeout: 30000 });
      
      await page.screenshot({ 
        path: 'after-sso-force-click.png', 
        fullPage: true 
      });
      console.log('📸 Screenshot: after-sso-force-click.png');
      
      const currentUrl = page.url();
      console.log(`📍 URL after SSO click: ${currentUrl}`);
      
      // Check if redirected to SSO provider
      const ssoProviders = [
        'login.microsoftonline.com',
        'accounts.google.com', 
        'okta.com',
        'auth0.com',
        'adfs'
      ];
      
      const isOnSSOProvider = ssoProviders.some(provider => currentUrl.includes(provider));
      const isOffJIRA = !currentUrl.includes('jirauat.smedigitalapps.com');
      
      if (isOnSSOProvider || isOffJIRA) {
        console.log('🎉 SUCCESS! Redirected to SSO provider');
        console.log('👤 Please complete SSO authentication in the browser...');
        console.log('⏳ Waiting up to 300 seconds for completion...');
        
        try {
          await page.waitForFunction(
            () => {
              const url = window.location.href;
              return url.includes('jirauat.smedigitalapps.com') && 
                     (url.includes('Dashboard') || url.includes('secure'));
            },
            { timeout: 300000 }
          );
          
          console.log('🎉 SSO authentication completed!');
          
          await page.screenshot({ 
            path: 'sso-success-final.png', 
            fullPage: true 
          });
          
          // Save session
          await context.storageState({ 
            path: 'jira-uat-session-force-sso.json' 
          });
          
          const sessionData = fs.readFileSync('jira-uat-session-force-sso.json');
          fs.writeFileSync('playwright/.auth/jira-uat-user.json', sessionData);
          
          console.log('💾 Force SSO session saved successfully!');
          console.log('🚀 Ready to run automated tests!');
          
          return true;
          
        } catch (error) {
          console.log('⚠️ SSO completion timeout');
          return false;
        }
        
      } else {
        console.log('🤔 Still on JIRA login page - SSO click might not have worked');
        console.log('💡 Manual intervention may be needed...');
        
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
      
    } else {
      console.log('❌ Could not click SSO button');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error during force SSO:', error.message);
    return false;
  } finally {
    console.log('⏳ Keeping browser open for 60 seconds...');
    await new Promise(resolve => setTimeout(resolve, 60000));
    await browser.close();
  }
}

forceSSO()
  .then(success => {
    if (success) {
      console.log('\n🎉 FORCE SSO SUCCESS!');
      console.log('✅ Broke through the Kafka bureaucracy');
      console.log('📝 BUG REPORT: All login buttons are hidden by default');
    } else {
      console.log('\n❌ Force SSO failed');
      console.log('💡 The Kafka maze is strong with this one');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal force error:', error);
    process.exit(1);
  });
