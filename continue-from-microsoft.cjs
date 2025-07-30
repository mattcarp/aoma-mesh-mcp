const { chromium } = require('playwright');
const fs = require('fs');

async function continueFromMicrosoft() {
  console.log('🔐 CONTINUING FROM MICROSOFT LOGIN');
  console.log('Email: matt.carpenter.ext@sonymusic.com');
  console.log('Password: Dooley1_Jude2');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Go to the same Microsoft URL that we just reached
    console.log('🔗 Going to Microsoft login page...');
    await page.goto('https://login.microsoftonline.com/f0aff3b7-91a5-4aae-af71-c63e1dda2049/saml2');
    await page.waitForTimeout(3000);
    
    // Fill email in the field with placeholder somebody@something.com
    console.log('📧 Filling email in field with placeholder somebody@something.com...');
    await page.fill('input[placeholder*="somebody@"], input[placeholder*="@something.com"], input[placeholder*="example.com"]', 'matt.carpenter.ext@sonymusic.com');
    
    // Click Next
    console.log('🔵 Clicking Next...');
    await page.click('input[type="submit"][value="Next"]');
    await page.waitForTimeout(4000);
    
    // Enter password
    console.log('🔒 Entering password...');
    await page.fill('input[type="password"]', 'Dooley1_Jude2');
    
    // Click Sign in
    console.log('👆 Clicking Sign in...');
    await page.click('input[type="submit"][value="Sign in"]');
    
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

continueFromMicrosoft(); 