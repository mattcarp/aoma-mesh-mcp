const { chromium } = require('playwright');
const fs = require('fs');

async function completeMicrosoftLogin() {
  console.log('🔐 COMPLETING MICROSOFT LOGIN');
  console.log('Email: matt.carpenter.ext@sonymusic.com');
  console.log('Password: Dooley1_Jude2');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Start fresh login flow - go directly to login page
    await page.goto('https://jirauat.smedigitalapps.com/jira/login.jsp');
    await page.waitForTimeout(3000);
    
    // We're already at the login page, so enter username directly
    console.log('🔤 Entering username on JIRA login page...');
    await page.fill('input[placeholder="Username"]', 'mcarpent');
    await page.click('button:has-text("Continue")');
    await page.waitForTimeout(3000);
    
    // Now wait for Microsoft page
    console.log('⏳ Waiting for Microsoft login page...');
    await page.waitForURL('**/microsoftonline.com/**', { timeout: 15000 });
    
    // Fill email if needed
    const emailField = await page.locator('input[type="email"], input[name="loginfmt"]').first();
    if (await emailField.isVisible()) {
      console.log('📧 Filling email...');
      await emailField.fill('matt.carpenter.ext@sonymusic.com');
    }
    
    // Click Next - try multiple selectors
    console.log('🔵 Clicking Next button...');
    try {
      await page.click('input[type="submit"][value="Next"]');
    } catch (e) {
      try {
        await page.click('button:has-text("Next")');
      } catch (e2) {
        await page.click('[data-report-event="Signin_Submit"]');
      }
    }
    
    await page.waitForTimeout(4000);
    
    // Enter password
    console.log('🔒 Entering password...');
    await page.fill('input[type="password"]', 'Dooley1_Jude2');
    
    // Click Sign in
    console.log('👆 Clicking Sign in...');
    try {
      await page.click('input[type="submit"][value="Sign in"]');
    } catch (e) {
      await page.click('button:has-text("Sign in")');
    }
    
    console.log('📱 Please complete 2FA on your device if prompted...');
    console.log('⏳ Waiting for JIRA to load after authentication...');
    
    // Wait for successful return to JIRA
    await page.waitForFunction(
      () => window.location.href.includes('jirauat.smedigitalapps.com') && 
            !window.location.href.includes('login') &&
            !window.location.href.includes('microsoft'),
      { timeout: 180000 } // 3 minutes for 2FA
    );
    
    console.log('✅ Successfully logged into JIRA!');
    
    // Save the session
    const cookies = await page.context().cookies();
    fs.writeFileSync('uat-jira-session-fresh.json', JSON.stringify({
      cookies,
      timestamp: new Date().toISOString()
    }, null, 2));
    
    console.log('💾 Session saved to uat-jira-session-fresh.json');
    
    // Also copy to Playwright auth location
    fs.writeFileSync('jira-uat-testing/playwright/.auth/jira-uat-user.json', JSON.stringify({
      cookies,
      origins: []
    }, null, 2));
    
    console.log('🎯 Session copied to Playwright auth directory');
    console.log('🎉 All done! You can now run Playwright tests.');
    
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('🔍 Current URL:', page.url());
  } finally {
    await browser.close();
  }
}

completeMicrosoftLogin(); 