import { chromium } from 'playwright';
import * as fs from 'fs';

async function setupAuthenticationOnce() {
  console.log('🔐 ONE-TIME JIRA AUTHENTICATION SETUP');
  console.log('====================================');
  console.log('This will authenticate ONCE and save session for reuse!');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500 
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    console.log('📍 Opening JIRA UAT...');
    await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
    
    console.log('\n👀 PLEASE LOG IN MANUALLY IN THE BROWSER WINDOW');
    console.log('⏳ I will wait and detect when you are authenticated...');
    console.log('🔑 Complete 2FA if needed');
    
    // Wait for authentication - keep checking
    let authenticated = false;
    let attempts = 0;
    const maxAttempts = 120; // 4 minutes max
    
    while (!authenticated && attempts < maxAttempts) {
      attempts++;
      await page.waitForTimeout(2000);
      
      try {
        const title = await page.title();
        const url = page.url();
        
        // Check for successful authentication
        if (!title.includes('Log') && 
            (url.includes('Dashboard.jspa') || url.includes('secure/'))) {
          // Double-check by waiting and testing ITSM access immediately
          console.log('🔍 Authentication detected, verifying with ITSM...');
          await page.waitForTimeout(2000);
          
          try {
            await page.goto('https://jirauat.smedigitalapps.com/jira/projects/ITSM');
            await page.waitForTimeout(3000);
            const testTitle = await page.title();
            
            if (!testTitle.includes('Log')) {
              authenticated = true;
              console.log('✅ AUTHENTICATION VERIFIED WITH ITSM!');
              break;
            } else {
              console.log('⚠️ ITSM still shows login, waiting more...');
              // Go back to dashboard and continue waiting
              await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
            }
          } catch (error) {
            console.log('⚠️ Error testing ITSM, continuing to wait...');
          }
        }
        
        if (attempts % 15 === 0) {
          console.log(`⏳ Still waiting for authentication... ${attempts}/${maxAttempts}`);
        }
      } catch (error) {
        // Continue waiting
      }
    }
    
    if (!authenticated) {
      throw new Error('Authentication timeout - please complete login and try again');
    }
    
    // Save the authenticated storage state
    console.log('💾 Saving authenticated session state...');
    const storageState = await context.storageState();
    
    const authFile = 'jira-auth-state.json';
    fs.writeFileSync(authFile, JSON.stringify(storageState, null, 2));
    console.log(`✅ Authentication state saved to: ${authFile}`);
    
    // ITSM access already verified during authentication
    console.log('\n🎯 FINAL VERIFICATION WITH ISSUE NAVIGATOR...');
    
    const start1 = Date.now();
    await page.goto('https://jirauat.smedigitalapps.com/jira/issues/?jql=project%20%3D%20ITSM');
    const time1 = Date.now() - start1;
    
    const navTitle = await page.title();
    console.log(`📝 Issue Navigator Title: ${navTitle}`);
    console.log(`⏱️  Load Time: ${time1}ms`);
    
    if (navTitle.includes('Log')) {
      throw new Error('Authentication verification failed - Issue Navigator shows login');
    }
    
    // Issue Navigator already tested above
    
    await page.waitForTimeout(3000);
    
    // Take verification screenshot
    await page.screenshot({ 
      path: `auth-verification-${Date.now()}.png`,
      fullPage: true 
    });
    
    console.log('\n🎉 AUTHENTICATION SETUP COMPLETE!');
    console.log('===================================');
    console.log('✅ Session saved and verified');
    console.log('✅ ITSM access confirmed');
    console.log('✅ Ready for automated testing');
    console.log('\nNow you can run tests without logging in again!');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

setupAuthenticationOnce().catch(console.error); 