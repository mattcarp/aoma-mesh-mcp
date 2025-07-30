const { chromium } = require('@playwright/test');
const fs = require('fs');
require('dotenv').config({ path: '../.env' });

async function forceVisibleLogin() {
  console.log('🎯 FORCE VISIBLE LOGIN');
  console.log('======================');
  
  const email = process.env.JIRA_UAT_EMAIL;
  console.log(`📧 Using email: ${email}`);
  
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
    
    console.log('🌐 Going to JIRA...');
    await page.goto('https://jirauat.smedigitalapps.com/jira/login.jsp');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    console.log('🔧 Making input visible and filling...');
    
    // Force the input to be visible and fill it with JavaScript
    await page.evaluate((emailToFill) => {
      const input = document.querySelector('input[name="username"]') || 
                   document.querySelector('#username-field') ||
                   document.querySelector('input[type="text"]');
      
      if (input) {
        // Force visibility
        input.style.display = 'block';
        input.style.visibility = 'visible';
        input.style.opacity = '1';
        input.style.position = 'static';
        
        // Clear and fill
        input.value = '';
        input.value = emailToFill;
        
        // Trigger events
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new Event('blur', { bubbles: true }));
        
        console.log('✅ Input filled with:', emailToFill);
        return true;
      }
      return false;
    }, email);
    
    console.log('🚀 Clicking Continue...');
    
    // Force click the continue button
    await page.evaluate(() => {
      const button = document.querySelector('button[type="submit"]') ||
                    document.querySelector('button:contains("Continue")') ||
                    document.querySelector('.aui-button');
      
      if (button) {
        button.style.display = 'block';
        button.style.visibility = 'visible';
        button.click();
        return true;
      }
      return false;
    });
    
    // Or press Enter
    await page.keyboard.press('Enter');
    
    console.log('⏳ Waiting for redirect...');
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    const url = page.url();
    console.log(`📍 Current URL: ${url}`);
    
    if (url.includes('microsoftonline.com')) {
      console.log('🎯 SUCCESS - Redirected to Microsoft!');
      console.log('');
      console.log('🎯 NOW COMPLETE MANUALLY:');
      console.log('========================');
      console.log('1. 🔐 Enter your Microsoft password');
      console.log('2. 📱 Complete 2FA');
      console.log('3. ✅ Accept consent');
      
      // Wait for completion
      await page.waitForFunction(
        () => window.location.href.includes('jirauat.smedigitalapps.com') && 
              !window.location.href.includes('login'),
        { timeout: 300000 }
      );
      
      console.log('🎉 LOGIN COMPLETE!');
      
      // Save session
      await context.storageState({ path: 'playwright/.auth/jira-uat-user.json' });
      console.log('💾 Session saved!');
      
      return true;
    } else {
      console.log('❌ Did not redirect to Microsoft');
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

forceVisibleLogin()
  .then(success => {
    console.log(success ? '✅ SUCCESS' : '❌ FAILED');
    process.exit(success ? 0 : 1);
  });
