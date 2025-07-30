const { chromium } = require('playwright');

async function persistentLoginSession() {
  console.log('🌐 OPENING PERSISTENT CHROMIUM FOR LOGIN');
  console.log('========================================');
  console.log('📍 I will open Chromium and KEEP IT OPEN');
  console.log('🔐 You log in, then tell me when ready');
  console.log('🧪 Then I run ALL tests in this SAME session');
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--start-maximized']
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Go to JIRA login
  console.log('🔗 Opening JIRA login page...');
  await page.goto('https://jirauat.smedigitalapps.com/jira/login.jsp');
  
  console.log('⏳ WAITING FOR YOU TO LOG IN...');
  console.log('📢 Type "ready" when you are logged in');
  
  // Keep checking until logged in
  let isLoggedIn = false;
  let checkCount = 0;
  
  while (!isLoggedIn && checkCount < 600) { // 10 minutes max
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      const url = page.url();
      const title = await page.title();
      
      isLoggedIn = !url.includes('login') && 
                   !url.includes('microsoft') &&
                   !title.toLowerCase().includes('sign in') &&
                   (title.includes('Dashboard') || title.includes('Sony Music'));
      
      if (isLoggedIn) {
        console.log('🎉 LOGIN DETECTED!');
        console.log(`✅ URL: ${url}`);
        console.log(`✅ Title: ${title}`);
        break;
      }
      
      checkCount++;
      if (checkCount % 30 === 0) {
        console.log(`⏳ Still waiting... (${checkCount} seconds)`);
      }
      
    } catch (error) {
      // Continue waiting
    }
  }
  
  if (isLoggedIn) {
    console.log('💾 Saving session for tests...');
    await context.storageState({ path: 'jira-uat-testing/current-session.json' });
    console.log('✅ Session saved!');
    console.log('🎯 Ready to run tests with this session!');
  } else {
    console.log('❌ Timeout waiting for login');
  }
  
  // Keep browser open
  console.log('🔒 Keeping browser open for testing...');
  return { browser, context, page };
}

persistentLoginSession(); 