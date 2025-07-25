import { chromium } from 'playwright';
import * as fs from 'fs';

async function captureLiveSession() {
  console.log('🔍 CAPTURING YOUR LIVE SESSION');
  console.log('==============================');
  console.log('This will connect to your existing authenticated browser!');
  
  // Connect to existing browser instance instead of creating new one
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  
  if (!browser) {
    console.log('❌ No existing browser found. Please:');
    console.log('1. Open Chrome with: google-chrome --remote-debugging-port=9222');
    console.log('2. Navigate to JIRA and log in');
    console.log('3. Run this script again');
    return;
  }
  
  console.log('✅ Connected to existing browser!');
  
  try {
    const contexts = browser.contexts();
    const context = contexts[0];
    const pages = context.pages();
    
    if (pages.length === 0) {
      console.log('❌ No pages found in browser');
      return;
    }
    
    const page = pages[0];
    
    // Navigate to JIRA to check authentication
    console.log('📍 Checking current JIRA authentication...');
    await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
    
    const title = await page.title();
    console.log(`📝 Page title: ${title}`);
    
    if (title.includes('Log')) {
      console.log('❌ Not authenticated in current browser session');
      console.log('Please log in to JIRA in your browser first!');
      return;
    }
    
    console.log('✅ AUTHENTICATED! Capturing session...');
    
    // Capture cookies from authenticated session
    const cookies = await context.cookies();
    const sessionData = {
      cookies,
      timestamp: new Date().toISOString(),
      domain: 'jirauat.smedigitalapps.com',
      environment: 'UAT_LIVE_SESSION',
      url: page.url()
    };
    
    const sessionFile = `jira-live-session-${Date.now()}.json`;
    fs.writeFileSync(sessionFile, JSON.stringify(sessionData, null, 2));
    console.log(`💾 Live session saved to: ${sessionFile}`);
    
    // Now test ITSM immediately
    console.log('\n🎯 TESTING ITSM ACCESS WITH LIVE SESSION...');
    
    const startTime = Date.now();
    await page.goto('https://jirauat.smedigitalapps.com/jira/projects/ITSM');
    const loadTime = Date.now() - startTime;
    
    const itsmTitle = await page.title();
    console.log(`📝 ITSM Title: ${itsmTitle}`);
    console.log(`⏱️  Load Time: ${loadTime}ms`);
    
    if (!itsmTitle.includes('Log')) {
      console.log('✅ ITSM PROJECT ACCESSIBLE!');
      
      // Get project info
      await page.waitForTimeout(2000);
      
      const projectInfo = await page.evaluate(() => {
        const info = {
          title: document.title,
          url: window.location.href,
          text: document.body.innerText.substring(0, 500)
        };
        return info;
      });
      
      console.log('\n📊 ITSM PROJECT INFO:');
      console.log(`URL: ${projectInfo.url}`);
      console.log(`Title: ${projectInfo.title}`);
      
      // Test Issue Navigator
      console.log('\n🔍 Testing ITSM Issue Navigator...');
      const navStart = Date.now();
      await page.goto('https://jirauat.smedigitalapps.com/jira/issues/?jql=project%20%3D%20ITSM');
      const navTime = Date.now() - navStart;
      console.log(`⏱️  Issue Navigator Load Time: ${navTime}ms`);
      
      await page.waitForTimeout(3000);
      
      // Get results count
      const resultsInfo = await page.evaluate(() => {
        const text = document.body.innerText;
        const matches = text.match(/(\d{1,3}(?:,\d{3})*)\s*(?:of|issues?|results?)/gi);
        return matches ? matches.slice(0, 3) : [];
      });
      
      console.log('\n📋 SEARCH RESULTS:');
      resultsInfo.forEach(result => console.log(`   ${result}`));
      
      // Take screenshot
      await page.screenshot({ 
        path: `itsm-live-session-${Date.now()}.png`,
        fullPage: true 
      });
      console.log('📸 Screenshot saved');
      
      console.log('\n🎉 SUCCESS! LIVE SESSION WORKING!');
      console.log('✅ Session captured and ITSM accessible');
      console.log(`✅ Performance: Project ${loadTime}ms, Navigator ${navTime}ms`);
      
    } else {
      console.log('❌ ITSM still showing login page');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\nTry this alternative approach:');
    console.log('1. Keep your authenticated JIRA tab open');
    console.log('2. Run: npx playwright test --headed');
    console.log('3. Copy cookies manually if needed');
  }
}

captureLiveSession().catch(console.error); 