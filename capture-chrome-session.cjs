const { chromium } = require('playwright');
const fs = require('fs');

async function captureFromChrome() {
  console.log('🔗 CONNECTING TO YOUR EXISTING CHROME SESSION');
  console.log('=============================================');
  
  try {
    // Connect to existing Chrome instance with debugging port
    console.log('🌐 Connecting to Chrome...');
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    
    const contexts = browser.contexts();
    if (contexts.length === 0) {
      console.log('❌ No Chrome contexts found. Please start Chrome with: google-chrome --remote-debugging-port=9222');
      return;
    }
    
    const context = contexts[0];
    const pages = context.pages();
    
    // Find the JIRA page
    let jiraPage = null;
    for (const page of pages) {
      const url = page.url();
      if (url.includes('jirauat.smedigitalapps.com')) {
        jiraPage = page;
        break;
      }
    }
    
    if (jiraPage) {
      console.log('✅ Found JIRA page in Chrome!');
      console.log('📍 URL:', jiraPage.url());
      
      // Capture cookies from the existing session
      const cookies = await context.cookies();
      
      // Save session
      fs.writeFileSync('uat-jira-session-from-chrome.json', JSON.stringify({
        cookies,
        timestamp: new Date().toISOString(),
        url: jiraPage.url(),
        title: await jiraPage.title()
      }, null, 2));
      
      // Save to Playwright auth directory
      fs.writeFileSync('playwright/.auth/jira-uat-user.json', JSON.stringify({
        cookies,
        origins: []
      }, null, 2));
      
      console.log('💾 Session captured from Chrome and saved!');
      console.log('🎯 Now my tests will use YOUR session!');
      
    } else {
      console.log('❌ No JIRA page found in Chrome tabs');
    }
    
  } catch (error) {
    console.log('❌ Could not connect to Chrome. Need to start Chrome with debugging:');
    console.log('   google-chrome --remote-debugging-port=9222');
    console.log('Error:', error.message);
  }
}

captureFromChrome(); 