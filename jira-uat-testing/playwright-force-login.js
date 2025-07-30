const { chromium } = require('@playwright/test');
require('dotenv').config({ path: '../.env' });

async function playwrightForceLogin() {
  console.log('⚡ PLAYWRIGHT FORCE LOGIN');
  console.log('========================');
  
  const email = process.env.JIRA_UAT_EMAIL;
  console.log(`📧 Email: ${email}`);
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--start-maximized']
  });
  
  try {
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      viewport: null
    });
    
    const page = await context.newPage();
    
    await page.goto('https://jirauat.smedigitalapps.com/jira/login.jsp');
    await page.waitForLoadState('networkidle');
    
    console.log('📧 Force filling email...');
    
    // Use Playwright's force option to bypass visibility checks
    await page.locator('input[name="username"]').fill(email, { force: true });
    
    console.log('🚀 Force clicking Continue...');
    await page.locator('button:has-text("Continue")').click({ force: true });
    
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    const url = page.url();
    console.log(`📍 URL: ${url}`);
    
    if (url.includes('microsoftonline.com')) {
      console.log('🎉 SUCCESS! Redirected to Microsoft');
      console.log('Complete the Microsoft login manually');
      
      // Keep browser open for manual completion
      await page.waitForFunction(
        () => window.location.href.includes('jirauat.smedigitalapps.com') && 
              !window.location.href.includes('login'),
        { timeout: 300000 }
      );
      
      await context.storageState({ path: 'playwright/.auth/jira-uat-user.json' });
      console.log('💾 Session saved!');
      
      return true;
    } else {
      console.log('❌ Still at JIRA login page');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  } finally {
    await new Promise(resolve => setTimeout(resolve, 10000));
    await browser.close();
  }
}

playwrightForceLogin();
