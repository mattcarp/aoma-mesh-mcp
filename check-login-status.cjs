const { chromium } = require('playwright');

async function checkLoginStatus() {
  console.log('🔍 CHECKING IF WE ARE ACTUALLY LOGGED IN');
  console.log('=========================================');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Try to access JIRA dashboard
    console.log('🌐 Going to JIRA dashboard...');
    await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    const pageTitle = await page.title();
    
    console.log(`📍 Current URL: ${currentUrl}`);
    console.log(`📄 Page title: ${pageTitle}`);
    
    // Check if we're on a login page
    const isOnLoginPage = currentUrl.includes('login') || 
                         currentUrl.includes('microsoft') ||
                         pageTitle.toLowerCase().includes('sign in') ||
                         pageTitle.toLowerCase().includes('login');
    
    if (isOnLoginPage) {
      console.log('❌ NOT LOGGED IN - We are on a login page');
      console.log('🔐 NEED TO LOG IN!');
      return false;
    }
    
    // Check for JIRA elements
    const hasJiraElements = await page.evaluate(() => {
      return document.querySelector('.aui-nav') !== null ||
             document.querySelector('#dashboard') !== null ||
             document.querySelector('.navigator-content') !== null ||
             document.body.textContent.includes('Dashboard');
    });
    
    if (hasJiraElements) {
      console.log('✅ LOGGED IN - Found JIRA interface elements');
      return true;
    } else {
      console.log('❌ NOT LOGGED IN - No JIRA elements found');
      return false;
    }
    
  } catch (error) {
    console.log('❌ ERROR checking login status:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

checkLoginStatus().then(isLoggedIn => {
  if (isLoggedIn) {
    console.log('🎉 READY TO RUN TESTS!');
  } else {
    console.log('🚫 CANNOT RUN TESTS - NOT LOGGED IN');
  }
}); 