const { chromium } = require('@playwright/test');
const fs = require('fs');

async function immediateLogin() {
  console.log('⚡ IMMEDIATE LOGIN - FILLING THE FORM NOW');
  console.log('=========================================');
  
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
    
    console.log('🌐 Going to the login page...');
    await page.goto('https://jirauat.smedigitalapps.com/jira/login.jsp', {
      timeout: 30000
    });
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    console.log('👤 FILLING USERNAME: mcarpent');
    
    // Try multiple username field approaches
    const usernameSelectors = [
      'input[placeholder="Username"]',
      'input[name="username"]', 
      '#username-field',
      'input[type="text"]'
    ];
    
    let usernameFilled = false;
    for (const selector of usernameSelectors) {
      try {
        const field = page.locator(selector);
        if (await field.count() > 0) {
          await field.fill('mcarpent');
          console.log(`✅ Username filled with: ${selector}`);
          usernameFilled = true;
          break;
        }
      } catch (error) {
        console.log(`⚠️ Failed ${selector}: ${error.message}`);
      }
    }
    
    if (!usernameFilled) {
      console.log('🔧 Trying JavaScript fill...');
      await page.evaluate(() => {
        const usernameField = document.querySelector('input[type="text"]') || 
                             document.querySelector('input[placeholder*="Username"]') ||
                             document.querySelector('input[name="username"]');
        if (usernameField) {
          usernameField.value = 'mcarpent';
          usernameField.dispatchEvent(new Event('input', { bubbles: true }));
          usernameField.dispatchEvent(new Event('change', { bubbles: true }));
          console.log('Username filled via JavaScript');
        }
      });
    }
    
    await page.screenshot({ path: 'immediate-1-username-filled.png' });
    
    console.log('🚀 CLICKING CONTINUE BUTTON...');
    
    // Click Continue
    const continueButton = page.locator('button:has-text("Continue")');
    if (await continueButton.count() > 0) {
      await continueButton.click();
      console.log('✅ Clicked Continue button');
    } else {
      await page.keyboard.press('Enter');
      console.log('✅ Pressed Enter key');
    }
    
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    await page.waitForTimeout(3000);
    
    console.log('🔐 FILLING PASSWORD: Dooley1_Jude2');
    
    // Try multiple password field approaches
    const passwordSelectors = [
      'input[type="password"]',
      'input[name="password"]',
      'input[autocomplete="current-password"]'
    ];
    
    let passwordFilled = false;
    for (const selector of passwordSelectors) {
      try {
        const field = page.locator(selector);
        if (await field.count() > 0) {
          await field.fill('Dooley1_Jude2');
          console.log(`✅ Password filled with: ${selector}`);
          passwordFilled = true;
          break;
        }
      } catch (error) {
        console.log(`⚠️ Failed ${selector}: ${error.message}`);
      }
    }
    
    if (!passwordFilled) {
      console.log('🔧 Trying JavaScript password fill...');
      await page.evaluate(() => {
        const passwordField = document.querySelector('input[type="password"]') || 
                             document.querySelector('input[name="password"]');
        if (passwordField) {
          passwordField.value = 'Dooley1_Jude2';
          passwordField.dispatchEvent(new Event('input', { bubbles: true }));
          passwordField.dispatchEvent(new Event('change', { bubbles: true }));
          console.log('Password filled via JavaScript');
        }
      });
    }
    
    // Check remember me
    console.log('☑️ CHECKING REMEMBER ME...');
    try {
      const checkbox = page.locator('input[type="checkbox"]');
      if (await checkbox.count() > 0) {
        await checkbox.check();
        console.log('✅ Remember me checked');
      }
    } catch (error) {
      console.log('⚠️ No remember me checkbox found');
    }
    
    await page.screenshot({ path: 'immediate-2-password-filled.png' });
    
    console.log('🚀 SUBMITTING LOGIN FORM...');
    
    // Submit the form
    const submitSelectors = [
      'button:has-text("Log in")',
      'button[type="submit"]',
      'input[type="submit"]'
    ];
    
    let submitted = false;
    for (const selector of submitSelectors) {
      try {
        const button = page.locator(selector);
        if (await button.count() > 0) {
          await button.click();
          console.log(`✅ Clicked submit: ${selector}`);
          submitted = true;
          break;
        }
      } catch (error) {
        console.log(`⚠️ Failed ${selector}: ${error.message}`);
      }
    }
    
    if (!submitted) {
      await page.keyboard.press('Enter');
      console.log('✅ Pressed Enter to submit');
    }
    
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    await page.waitForTimeout(5000);
    
    await page.screenshot({ path: 'immediate-3-after-submit.png' });
    
    console.log(`📍 URL after submit: ${page.url()}`);
    
    // Check for certificate modal
    console.log('📜 CHECKING FOR CERTIFICATE MODAL...');
    try {
      const certButton = page.locator('button:has-text("OK"), button:has-text("Accept"), button:has-text("Continue")');
      await certButton.waitFor({ state: 'visible', timeout: 10000 });
      
      console.log('📜 CERTIFICATE MODAL FOUND - CLICKING OK!');
      await certButton.click();
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      await page.screenshot({ path: 'immediate-4-after-cert.png' });
      console.log('✅ Certificate modal handled');
      
    } catch (error) {
      console.log('ℹ️ No certificate modal found');
    }
    
    // Check for 2FA
    console.log('📱 CHECKING FOR 2FA...');
    
    const twoFASelectors = [
      'input[name*="code" i]',
      'input[placeholder*="code" i]', 
      'input[type="text"][maxlength="6"]',
      'input[type="text"][maxlength="8"]',
      'input[id*="2fa" i]',
      'input[id*="verification" i]'
    ];
    
    let twoFAField = null;
    for (const selector of twoFASelectors) {
      const field = page.locator(selector);
      if (await field.count() > 0) {
        twoFAField = field.first();
        console.log(`📱 2FA FIELD FOUND: ${selector}`);
        break;
      }
    }
    
    if (twoFAField) {
      console.log('\n🚨 2FA REQUIRED - YOUR TURN!');
      console.log('=============================');
      console.log('📱 Check your phone for the 2FA code');
      console.log('🔢 Enter the code in the browser');
      console.log('⚡ Press Enter or click Submit');
      console.log('');
      console.log('⏳ I will wait for you to complete it...');
      
      await page.screenshot({ path: 'immediate-5-2fa-required.png' });
      
      // Wait for 2FA completion
      await page.waitForFunction(
        () => {
          const url = window.location.href;
          return url.includes('Dashboard') && !url.includes('login');
        },
        { timeout: 180000 } // 3 minutes
      );
      
      console.log('🎉 2FA COMPLETED!');
      await page.screenshot({ path: 'immediate-6-2fa-success.png' });
      
    } else {
      console.log('ℹ️ No 2FA field detected');
    }
    
    // Final check
    const finalUrl = page.url();
    console.log(`📍 Final URL: ${finalUrl}`);
    
    if (finalUrl.includes('Dashboard') && !finalUrl.includes('login')) {
      console.log('🎉 LOGIN SUCCESSFUL!');
      
      // Save session
      await context.storageState({ 
        path: 'jira-uat-session-immediate.json' 
      });
      
      const sessionData = fs.readFileSync('jira-uat-session-immediate.json');
      fs.writeFileSync('playwright/.auth/jira-uat-user.json', sessionData);
      
      console.log('💾 Session saved!');
      console.log('🚀 Ready for hundreds of tests!');
      
      return true;
    } else {
      console.log('❌ Login incomplete');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  } finally {
    console.log('⏳ Keeping browser open for 60 seconds...');
    await new Promise(resolve => setTimeout(resolve, 60000));
    await browser.close();
  }
}

immediateLogin()
  .then(success => {
    if (success) {
      console.log('\n🎉 IMMEDIATE LOGIN SUCCESS!');
      console.log('✅ Ready to run hundreds of tests!');
    } else {
      console.log('\n❌ Login failed');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
