#!/usr/bin/env tsx

import { chromium } from 'playwright';
import fs from 'fs';

async function captureJiraSession() {
  console.log('🔐 CAPTURING JIRA SESSION');
  console.log('========================');
  console.log('🌐 Opening JIRA in browser...');
  console.log('👋 Please complete login manually!');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Navigate to JIRA login
    await page.goto('https://jirauat.smedigitalapps.com/jira/login.jsp', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    console.log('⏳ Waiting for you to complete login...');
    console.log('💡 After logging in, I\'ll automatically detect and capture your session!');
    
    // Wait for login completion by checking URL changes
    let loginAttempts = 0;
    const maxAttempts = 60; // 10 minutes
    
    while (loginAttempts < maxAttempts) {
      await page.waitForTimeout(10000); // Wait 10 seconds
      
      const currentUrl = page.url();
      console.log(`⏳ Still waiting... (${loginAttempts + 1}/${maxAttempts}) - Current: ${currentUrl.substring(0, 80)}...`);
      
      // Check if we're logged in (not on login page)
      if (!currentUrl.includes('login.jsp')) {
        console.log('✅ Login detected! Capturing session...');
        break;
      }
      
      loginAttempts++;
    }
    
    if (loginAttempts >= maxAttempts) {
      console.log('⏰ Timeout waiting for login completion');
      await browser.close();
      return;
    }
    
    // Give it a moment to fully load
    await page.waitForTimeout(3000);
    
    // Get all cookies
    const cookies = await context.cookies();
    
    // Get local storage and session storage
    const storageData = await page.evaluate(() => {
      const localStorage = {};
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key) {
          localStorage[key] = window.localStorage.getItem(key);
        }
      }
      
      const sessionStorage = {};
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const key = window.sessionStorage.key(i);
        if (key) {
          sessionStorage[key] = window.sessionStorage.getItem(key);
        }
      }
      
      return { localStorage, sessionStorage };
    });
    
    // Create session data object
    const sessionData = {
      timestamp: new Date().toISOString(),
      url: page.url(),
      cookies,
      localStorage: storageData.localStorage,
      sessionStorage: storageData.sessionStorage,
      userAgent: await page.evaluate(() => navigator.userAgent)
    };
    
    // Save session data
    const sessionFile = 'jira-session-cookies.json';
    fs.writeFileSync(sessionFile, JSON.stringify(sessionData, null, 2));
    
    console.log('🎉 Session captured successfully!');
    console.log(`📁 Saved to: ${sessionFile}`);
    
    // Show key session info
    const jsessionId = cookies.find(c => c.name === 'JSESSIONID');
    const xsrfToken = cookies.find(c => c.name === 'atlassian.xsrf.token');
    
    console.log('\n📊 Key Session Data:');
    console.log(`   JSESSIONID: ${jsessionId ? jsessionId.value.substring(0, 20) + '...' : 'Not found'}`);
    console.log(`   XSRF Token: ${xsrfToken ? xsrfToken.value.substring(0, 20) + '...' : 'Not found'}`);
    console.log(`   Total Cookies: ${cookies.length}`);
    console.log(`   Current URL: ${page.url()}`);
    
    console.log('\n✅ Ready to run tests with saved session!');
    
    await browser.close();
    
    return sessionFile;
    
  } catch (error) {
    console.error('❌ Error capturing session:', error);
    await browser.close();
    throw error;
  }
}

// Run the capture
captureJiraSession().catch(console.error); 