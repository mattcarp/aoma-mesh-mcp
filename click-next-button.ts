#!/usr/bin/env tsx

import { chromium } from 'playwright';

async function clickNextButton() {
  console.log('👆 CLICKING THE NEXT BUTTON');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Go to Microsoft login (it should redirect us to the current state)
    await page.goto('https://jirauat.smedigitalapps.com/jira/login.jsp');
    
    // Wait for redirect to Microsoft
    await page.waitForURL('**/microsoftonline.com/**', { timeout: 10000 });
    
    // The email should already be filled, just click Next
    console.log('🔵 Clicking the blue Next button...');
    await page.click('input[type="submit"][value="Next"], button:has-text("Next"), [data-report-event="Signin_Submit"]');
    
    await page.waitForTimeout(3000);
    
    // Check if we need password
    const needsPassword = await page.locator('input[type="password"]').isVisible();
    if (needsPassword) {
      console.log('🔒 Entering password...');
      await page.fill('input[type="password"]', 'Dooley1_Jude2');
      await page.click('input[type="submit"], button:has-text("Sign in")');
      
      console.log('📱 Complete 2FA if prompted...');
      console.log('⏳ Waiting for login completion...');
      
      // Wait for completion and save session
      await page.waitForFunction(
        () => window.location.href.includes('jirauat.smedigitalapps.com') && 
              !window.location.href.includes('login'),
        { timeout: 120000 }
      );
      
      // Save session
      const cookies = await page.context().cookies();
      const fs = await import('fs');
      fs.writeFileSync('../uat-jira-session.json', JSON.stringify({
        cookies,
        timestamp: new Date().toISOString()
      }, null, 2));
      
      console.log('✅ LOGIN SUCCESSFUL! Session saved!');
    }
    
    console.log('⏳ Keeping browser open...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

clickNextButton(); 