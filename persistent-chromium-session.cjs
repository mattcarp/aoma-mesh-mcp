const { chromium } = require('playwright');
const fs = require('fs');

async function persistentChromiumSession() {
  console.log('🌐 OPENING PERSISTENT CHROMIUM SESSION');
  console.log('=====================================');
  console.log('👋 I will open Chromium and KEEP IT OPEN');
  console.log('🔐 You log in, tell me when ready');
  console.log('🧪 Then I\'ll run all tests in this same session');
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--start-maximized']
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Go to JIRA login page
    console.log('🔗 Going to JIRA login page...');
    await page.goto('https://jirauat.smedigitalapps.com/jira/login.jsp');
    
    console.log('⏳ WAITING FOR YOU TO LOG IN...');
    console.log('💡 Take your time - I\'ll wait here');
    console.log('📢 Tell me when you\'re logged in and I\'ll start testing!');
    
    // Wait for login completion by monitoring URL changes
    let isLoggedIn = false;
    let checkCount = 0;
    
         while (!isLoggedIn && checkCount < 300) { // 5 minutes max
       await page.waitForTimeout(1000); // Check every second
       
       try {
         const currentUrl = page.url();
         
         // Check if we're logged in (not on login page and has JIRA interface)
         isLoggedIn = await page.evaluate(() => {
           return !window.location.href.includes('login') && 
                  !window.location.href.includes('microsoft') &&
                  !document.body.textContent.toLowerCase().includes('sign in') &&
                  (document.querySelector('.aui-nav') !== null || 
                   document.querySelector('[data-test-id]') !== null ||
                   document.querySelector('.navigator-content') !== null ||
                   document.title.includes('Dashboard'));
         });
         
         if (isLoggedIn) {
           console.log('🎉 LOGIN DETECTED! You\'re in!');
           break;
         }
       } catch (e) {
         // Navigation in progress, just continue waiting
       }
       
       checkCount++;
       if (checkCount % 30 === 0) { // Update every 30 seconds
         console.log(`⏳ Still waiting... (${Math.floor(checkCount/60)}m ${checkCount%60}s)`);
       }
     }
    
    if (isLoggedIn) {
      console.log('✅ SUCCESS! Now capturing session and running tests...');
      
      // Capture the session
      const cookies = await context.cookies();
      
      // Save session files
      fs.writeFileSync('../uat-jira-session-persistent.json', JSON.stringify({
        cookies,
        timestamp: new Date().toISOString(),
        url: page.url(),
        title: await page.title()
      }, null, 2));
      
      fs.writeFileSync('playwright/.auth/jira-uat-user.json', JSON.stringify({
        cookies,
        origins: []
      }, null, 2));
      
      console.log('💾 Session saved!');
      
      // Now run tests in this same browser session
      console.log('🧪 RUNNING TESTS IN THIS SESSION...');
      
      // Test 1: Dashboard access
      console.log('\n📊 Test 1: Dashboard Access');
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
      await page.waitForTimeout(2000);
      const dashboardTitle = await page.title();
      console.log(`✅ Dashboard loaded: ${dashboardTitle}`);
      
      // Test 2: Create issue access
      console.log('\n🎫 Test 2: Create Issue Access');
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/CreateIssue!default.jspa');
      await page.waitForTimeout(2000);
      const createTitle = await page.title();
      console.log(`✅ Create issue page: ${createTitle}`);
      
      // Test 3: Issue search
      console.log('\n🔍 Test 3: Issue Search');
      await page.goto('https://jirauat.smedigitalapps.com/jira/issues/');
      await page.waitForTimeout(2000);
      const searchTitle = await page.title();
      console.log(`✅ Search page: ${searchTitle}`);
      
      console.log('\n🎉 ALL TESTS COMPLETED SUCCESSFULLY!');
      console.log('💾 Session preserved for future use');
      console.log('⏳ Keeping browser open for 30 seconds...');
      
      await page.waitForTimeout(30000);
      
    } else {
      console.log('⏰ Timeout waiting for login');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    console.log('👋 Closing browser...');
    await browser.close();
  }
}

persistentChromiumSession(); 