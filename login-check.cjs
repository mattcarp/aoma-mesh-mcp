const { chromium } = require('playwright');

async function checkLogin() {
  console.log('🔍 CHECKING LOGIN STATUS RIGHT NOW');
  console.log('==================================');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
    await page.waitForTimeout(3000);
    
    const url = page.url();
    const title = await page.title();
    
    console.log(`URL: ${url}`);
    console.log(`Title: ${title}`);
    
    if (url.includes('login') || url.includes('microsoft') || title.includes('Sign in')) {
      console.log('❌ NOT LOGGED IN - On login page');
      console.log('🔐 NEED TO LOG IN MANUALLY');
      return false;
    } else {
      console.log('✅ LOGGED IN - On dashboard');
      return true;
    }
    
  } finally {
    await browser.close();
  }
}

checkLogin(); 