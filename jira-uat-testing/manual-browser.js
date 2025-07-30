const { chromium } = require('@playwright/test');

async function manualBrowser() {
  console.log('🖥️  MANUAL BROWSER - YOU DO THE LOGIN');
  console.log('====================================');
  console.log('1. I will open the browser');
  console.log('2. You manually log in');
  console.log('3. Tell me when you are logged in');
  console.log('4. I will save the session');
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--start-maximized']
  });
  
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: null
  });
  
  const page = await context.newPage();
  
  await page.goto('https://jirauat.smedigitalapps.com/jira/login.jsp');
  
  console.log('\n🎯 BROWSER IS OPEN');
  console.log('==================');
  console.log('📧 Email: matt.carpenter.ext@sonymusic.com');
  console.log('🔐 Password: Dooley1_Jude2');
  console.log('');
  console.log('⏳ Waiting 5 minutes for you to complete login...');
  
  // Wait 5 minutes for manual login
  await new Promise(resolve => setTimeout(resolve, 300000));
  
  // Check if logged in
  const url = page.url();
  if (url.includes('jirauat.smedigitalapps.com') && !url.includes('login')) {
    console.log('🎉 LOGIN DETECTED!');
    await context.storageState({ path: 'playwright/.auth/jira-uat-user.json' });
    console.log('💾 Session saved to playwright/.auth/jira-uat-user.json');
  } else {
    console.log('❌ Login not detected');
  }
  
  await browser.close();
}

manualBrowser();
