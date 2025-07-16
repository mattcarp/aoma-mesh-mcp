import { chromium } from 'playwright';
import * as fs from 'fs';

async function videoLoginFollower() {
  console.log('🎥 VIDEO LOGIN FOLLOWER - RECORDING EVERYTHING');
  console.log('==============================================');
  console.log('This will record a video of the entire login process!');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000,
    devtools: true
  });
  
  // Enable video recording
  const context = await browser.newContext({
    recordVideo: {
      dir: './videos/',
      size: { width: 1280, height: 720 }
    },
    ignoreHTTPSErrors: true
  });
  
  const page = await context.newPage();
  
  try {
    console.log('🎬 VIDEO RECORDING STARTED!');
    console.log('📍 Step 1: Navigate to JIRA UAT Dashboard...');
    
    await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
    await page.waitForTimeout(3000);
    
    console.log('📸 Taking initial screenshot...');
    await page.screenshot({ path: 'step-1-initial-page.png', fullPage: true });
    
    const initialTitle = await page.title();
    const initialUrl = page.url();
    const initialCookies = await context.cookies();
    
    console.log(`📝 Initial Title: ${initialTitle}`);
    console.log(`🔗 Initial URL: ${initialUrl}`);
    console.log(`🍪 Initial Cookies Count: ${initialCookies.length}`);
    
    // Look for JSESSIONID specifically
    const jsessionCookie = initialCookies.find(c => c.name === 'JSESSIONID');
    if (jsessionCookie) {
      console.log(`🔑 Found JSESSIONID: ${jsessionCookie.value.substring(0, 20)}...`);
    } else {
      console.log('❌ No JSESSIONID found yet');
    }
    
    console.log('\n👀 FOLLOW ME AS I LOG IN:');
    console.log('========================');
    console.log('1. Complete your login process manually');
    console.log('2. I will monitor cookies and page changes');
    console.log('3. I will detect when JSESSIONID is established');
    console.log('4. I will wait for full session propagation');
    
    let step = 2;
    let fullyAuthenticated = false;
    let attempts = 0;
    const maxAttempts = 180; // 6 minutes
    
    while (!fullyAuthenticated && attempts < maxAttempts) {
      attempts++;
      await page.waitForTimeout(2000);
      
      const currentTitle = await page.title();
      const currentUrl = page.url();
      const currentCookies = await context.cookies();
      
      // Check for JSESSIONID changes
      const currentJsession = currentCookies.find(c => c.name === 'JSESSIONID');
      
      if (attempts % 10 === 0) {
        console.log(`\n📊 Status Check ${attempts}/${maxAttempts}:`);
        console.log(`📝 Title: ${currentTitle}`);
        console.log(`🔗 URL: ${currentUrl}`);
        console.log(`🍪 Total Cookies: ${currentCookies.length}`);
        
        if (currentJsession) {
          console.log(`🔑 JSESSIONID: ${currentJsession.value.substring(0, 20)}...`);
        } else {
          console.log('❌ No JSESSIONID found');
        }
        
        await page.screenshot({ 
          path: `step-${step}-check-${attempts}.png`, 
          fullPage: true 
        });
        step++;
      }
      
      // Check if we're authenticated to Dashboard
      if (!currentTitle.includes('Log') && 
          (currentUrl.includes('Dashboard.jspa') || currentUrl.includes('secure/')) &&
          currentJsession) {
        
        console.log('\n🎯 AUTHENTICATION DETECTED ON DASHBOARD!');
        console.log('Testing ITSM access to verify full session...');
        
        await page.screenshot({ path: `step-${step}-dashboard-auth.png`, fullPage: true });
        step++;
        
        // Test ITSM project access
        console.log('📍 Testing ITSM Project access...');
        await page.goto('https://jirauat.smedigitalapps.com/jira/projects/ITSM');
        await page.waitForTimeout(5000);
        
        const itsmTitle = await page.title();
        console.log(`📝 ITSM Project Title: ${itsmTitle}`);
        
        await page.screenshot({ path: `step-${step}-itsm-project.png`, fullPage: true });
        step++;
        
        if (!itsmTitle.includes('Log')) {
          console.log('✅ ITSM Project accessible!');
          
          // Test Issue Navigator
          console.log('📍 Testing ITSM Issue Navigator...');
          await page.goto('https://jirauat.smedigitalapps.com/jira/issues/?jql=project%20%3D%20ITSM');
          await page.waitForTimeout(8000); // Wait longer for search results
          
          const navTitle = await page.title();
          console.log(`📝 Issue Navigator Title: ${navTitle}`);
          
          await page.screenshot({ path: `step-${step}-issue-navigator.png`, fullPage: true });
          step++;
          
          if (!navTitle.includes('Log')) {
            console.log('🎉 FULL AUTHENTICATION VERIFIED!');
            fullyAuthenticated = true;
            
            // Capture all authentication details
            const finalCookies = await context.cookies();
            const finalJsession = finalCookies.find(c => c.name === 'JSESSIONID');
            
            const authState = {
              timestamp: new Date().toISOString(),
              domain: 'jirauat.smedigitalapps.com',
              environment: 'UAT_VIDEO_VERIFIED',
              jsessionid: finalJsession?.value,
              cookies: finalCookies,
              verificationSteps: {
                dashboard: true,
                itsmProject: true,
                issueNavigator: true
              }
            };
            
            const authFile = `jira-video-auth-${Date.now()}.json`;
            fs.writeFileSync(authFile, JSON.stringify(authState, null, 2));
            console.log(`💾 Full authentication state saved: ${authFile}`);
            
            break;
          } else {
            console.log('⚠️ Issue Navigator still shows login, continuing to wait...');
            await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
          }
        } else {
          console.log('⚠️ ITSM Project still shows login, continuing to wait...');
          await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
        }
      }
      
      // Look for any login-related changes
      if (attempts % 5 === 0) {
        console.log(`⏳ Monitoring... (${attempts}/${maxAttempts})`);
      }
    }
    
    if (!fullyAuthenticated) {
      console.log('❌ Authentication timeout - but we have video evidence!');
    }
    
    console.log('\n🎬 VIDEO RECORDING COMPLETE!');
    console.log('============================');
    console.log('✅ Video saved to ./videos/ directory');
    console.log('✅ Screenshots captured for each step');
    console.log('✅ Cookie monitoring complete');
    
    if (fullyAuthenticated) {
      console.log('🎉 FULL JIRA AUTHENTICATION SUCCESSFUL!');
    } else {
      console.log('⚠️ Check video and screenshots to debug authentication issues');
    }
    
  } catch (error) {
    console.error('❌ Video login follower failed:', error.message);
  } finally {
    console.log('\n⏳ Keeping browser open for 10 seconds to finalize video...');
    await page.waitForTimeout(10000);
    await browser.close();
    console.log('🎬 Video recording finalized and browser closed');
  }
}

videoLoginFollower().catch(console.error); 