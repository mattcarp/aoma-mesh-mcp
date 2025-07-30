const { chromium } = require('@playwright/test');
const fs = require('fs');
require('dotenv').config({ path: '../.env' });

async function finalAuth() {
  console.log('🎯 FINAL AUTHENTICATION - USING CORRECT EMAIL');
  console.log('==============================================');
  
  const email = process.env.JIRA_UAT_EMAIL;
  const username = process.env.JIRA_UAT_USERNAME;
  const password = process.env.JIRA_UAT_PWD;
  
  console.log(`📧 Email: ${email}`);
  console.log(`👤 Username: ${username}`);
  console.log(`🔐 Password: ${password ? '***' + password.slice(-3) : 'NOT SET'}`);
  
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
    
    console.log('🌐 Going to JIRA UAT...');
    await page.goto('https://jirauat.smedigitalapps.com/jira/login.jsp');
    await page.waitForLoadState('networkidle');
    
    // Fill email in the username field
    console.log('📧 Filling email in username field...');
    await page.locator('input[name="username"]').fill(email);
    await page.locator('button:has-text("Continue")').click();
    
    await page.waitForLoadState('networkidle');
    
    // Should redirect to Microsoft - fill email again if needed
    const url = page.url();
    if (url.includes('microsoftonline.com')) {
      console.log('🎯 At Microsoft SSO - filling email...');
      const emailField = page.locator('input[type="email"]');
      if (await emailField.count() > 0) {
        await emailField.fill(email);
        await page.locator('input[type="submit"]').click();
        await page.waitForLoadState('networkidle');
      }
    }
    
    console.log('\n🎯 MANUAL COMPLETION REQUIRED:');
    console.log('==============================');
    console.log('1. 🔐 Enter your Microsoft password');
    console.log('2. 📱 Complete 2FA/MFA');
    console.log('3. ✅ Accept any consent screens');
    console.log('');
    console.log('⏳ Waiting for you to complete...');
    
    // Wait for successful login
    await page.waitForFunction(
      () => window.location.href.includes('jirauat.smedigitalapps.com') && 
            !window.location.href.includes('login'),
      { timeout: 300000 } // 5 minutes
    );
    
    console.log('🎉 LOGIN SUCCESSFUL!');
    
    // Save session
    await context.storageState({ path: 'playwright/.auth/jira-uat-user.json' });
    console.log('💾 Session saved to playwright/.auth/jira-uat-user.json');
    
    return true;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  } finally {
    await new Promise(resolve => setTimeout(resolve, 10000));
    await browser.close();
  }
}

finalAuth()
  .then(success => {
    if (success) {
      console.log('\n✅ AUTHENTICATION COMPLETE');
      console.log('🚀 Ready to run tests');
    } else {
      console.log('\n❌ Authentication failed');
    }
    process.exit(success ? 0 : 1);
  });
