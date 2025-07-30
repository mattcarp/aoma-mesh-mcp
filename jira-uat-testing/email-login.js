const { chromium } = require('@playwright/test');
const fs = require('fs');

async function emailLogin() {
  console.log('📧 EMAIL-BASED LOGIN - USING FULL EMAIL ADDRESS');
  console.log('===============================================');
  
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
    
    console.log('🌐 Going to JIRA login...');
    await page.goto('https://jirauat.smedigitalapps.com/jira/login.jsp', {
      timeout: 30000
    });
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Check current URL to see where we are
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);
    
    if (currentUrl.includes('microsoftonline.com')) {
      console.log('🎯 ALREADY AT MICROSOFT SSO - FILLING EMAIL!');
      
      // We're at Microsoft login - fill email
      const emailField = page.locator('input[type="email"], input[name="loginfmt"], input[placeholder*="example.com"]');
      
      if (await emailField.count() > 0) {
        console.log('📧 FILLING EMAIL: mcarpent@sonymusic.com');
        await emailField.fill('mcarpent@sonymusic.com');
        await page.screenshot({ path: 'email-1-filled.png' });
        
        console.log('🚀 CLICKING NEXT...');
        const nextButton = page.locator('input[type="submit"], button:has-text("Next")');
        await nextButton.click();
        
        await page.waitForLoadState('networkidle', { timeout: 30000 });
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'email-2-after-next.png' });
        
      } else {
        console.log('❌ No email field found at Microsoft');
      }
      
    } else {
      console.log('📧 AT JIRA LOGIN - FILLING EMAIL INSTEAD OF USERNAME!');
      
      // Try filling email instead of username
      const usernameField = page.locator('input[placeholder="Username"], input[name="username"], #username-field');
      
      if (await usernameField.count() > 0) {
        console.log('📧 FILLING EMAIL: mcarpent@sonymusic.com');
        await usernameField.fill('mcarpent@sonymusic.com');
        await page.screenshot({ path: 'email-3-jira-email.png' });
        
        console.log('🚀 CLICKING CONTINUE...');
        const continueButton = page.locator('button:has-text("Continue")');
        await continueButton.click();
        
        await page.waitForLoadState('networkidle', { timeout: 30000 });
        await page.waitForTimeout(5000);
        
        const afterUrl = page.url();
        console.log(`📍 After continue URL: ${afterUrl}`);
        await page.screenshot({ path: 'email-4-after-continue.png' });
        
        if (afterUrl.includes('microsoftonline.com')) {
          console.log('🎯 REDIRECTED TO MICROSOFT - SUCCESS!');
          
          // Now handle Microsoft login
          const emailField = page.locator('input[type="email"], input[name="loginfmt"]');
          if (await emailField.count() > 0 && await emailField.inputValue() === '') {
            console.log('📧 FILLING MICROSOFT EMAIL FIELD...');
            await emailField.fill('mcarpent@sonymusic.com');
            
            const nextButton = page.locator('input[type="submit"], button:has-text("Next")');
            await nextButton.click();
            
            await page.waitForLoadState('networkidle', { timeout: 30000 });
            await page.screenshot({ path: 'email-5-microsoft-next.png' });
          }
        }
      }
    }
    
    console.log('\n🎯 NOW COMPLETE THE MICROSOFT SSO MANUALLY:');
    console.log('==========================================');
    console.log('1. 🔐 Enter your Microsoft password');
    console.log('2. 📱 Complete any 2FA/MFA prompts');
    console.log('3. ✅ Accept any permissions/consent screens');
    console.log('4. ⏳ Wait for redirect back to JIRA');
    console.log('');
    console.log('⏳ I will monitor for successful completion...');
    
    // Monitor for completion
    let checkCount = 0;
    while (checkCount < 60) { // 5 minutes
      await page.waitForTimeout(5000);
      checkCount++;
      
      const currentUrl = page.url();
      
      if (currentUrl.includes('jirauat.smedigitalapps.com') && 
          (currentUrl.includes('Dashboard') || !currentUrl.includes('login'))) {
        
        console.log('\n🎉 LOGIN SUCCESSFUL!');
        console.log('====================');
        console.log(`📍 Final URL: ${currentUrl}`);
        
        await page.screenshot({ path: 'email-6-success.png' });
        
        // Save session
        await context.storageState({ 
          path: 'jira-uat-session-email.json' 
        });
        
        const sessionData = fs.readFileSync('jira-uat-session-email.json');
        fs.writeFileSync('playwright/.auth/jira-uat-user.json', sessionData);
        
        console.log('💾 Session saved!');
        console.log('🚀 Ready for hundreds of tests!');
        
        return true;
      }
      
      if (checkCount % 6 === 0) {
        console.log(`⏳ Still waiting... (${Math.floor(checkCount/12)}/5 minutes) - URL: ${currentUrl.substring(0, 80)}...`);
      }
    }
    
    console.log('⏰ Timeout - manual completion may need more time');
    return false;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  } finally {
    console.log('⏳ Keeping browser open for inspection...');
    await new Promise(resolve => setTimeout(resolve, 60000));
    await browser.close();
  }
}

emailLogin()
  .then(success => {
    if (success) {
      console.log('\n🎉 EMAIL LOGIN SUCCESS!');
    } else {
      console.log('\n❌ Email login failed or incomplete');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
