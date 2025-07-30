#!/usr/bin/env tsx

import { chromium } from 'playwright';

async function fillCurrentLogin() {
  console.log('🔐 FILLING CURRENT LOGIN FORM');
  console.log('Username: mcarpent');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Go to the login page that should be showing
    await page.goto('https://jirauat.smedigitalapps.com/jira/login.jsp');
    await page.waitForTimeout(2000);
    
    // Fill in username
    console.log('🔤 Entering username: mcarpent');
    await page.fill('input[placeholder="Username"]', 'mcarpent');
    
    // Click Continue
    console.log('👆 Clicking Continue...');
    await page.click('button:has-text("Continue")');
    
    await page.waitForTimeout(3000);
    
    // Check what happens next
    const url = page.url();
    console.log(`📍 Current URL: ${url}`);
    
    if (url.includes('microsoft')) {
      console.log('📧 Now at Microsoft SSO - entering email...');
      await page.fill('input[type="email"], input[name="loginfmt"]', 'matt.carpenter.ext@sonymusic.com');
      await page.click('button:has-text("Next")');
      await page.waitForTimeout(3000);
      
      console.log('🔒 Now entering password...');
      await page.fill('input[type="password"]', 'Dooley1_Jude2');
      await page.click('button:has-text("Sign in")');
      
      console.log('📱 Complete 2FA if prompted...');
      
      // Wait for login completion
      await page.waitForFunction(
        () => window.location.href.includes('jirauat.smedigitalapps.com') && 
              !window.location.href.includes('login'),
        { timeout: 120000 }
      );
      
      // Save session
      const cookies = await page.context().cookies();
      const fs = await import('fs');
      fs.writeFileSync('uat-jira-session.json', JSON.stringify({
        cookies,
        timestamp: new Date().toISOString()
      }, null, 2));
      
      console.log('✅ LOGIN SUCCESSFUL! Session saved to uat-jira-session.json');
    }
    
    console.log('⏳ Keeping browser open...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

fillCurrentLogin(); 