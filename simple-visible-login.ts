import { chromium } from 'playwright';

/**
 * Simple Visible Browser Login
 * 
 * Opens a VISIBLE Chromium browser for manual JIRA UAT login
 * Shows exactly what URL to go to and waits for user completion
 */

async function openVisibleBrowserForLogin(): Promise<void> {
  console.log('🦁 OPENING VISIBLE BROWSER FOR MANUAL LOGIN...');
  console.log('=============================================');
  
  console.log('\n🌐 Browser Details:');
  console.log('   Browser: Chromium (Playwright)');
  console.log('   Mode: VISIBLE (headless: false)');
  console.log('   URL: https://jirauat.smedigitalapps.com/jira/login.jsp');
  console.log('   Environment: UAT');
  
  try {
    // Launch VISIBLE browser
    console.log('\n🚀 Launching VISIBLE Chromium browser...');
    const browser = await chromium.launch({ 
      headless: false,  // DEFINITELY NOT HEADLESS!
      slowMo: 100,
      devtools: false,
      args: [
        '--no-sandbox',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });
    
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
    });
    
    const page = await context.newPage();
    
    console.log('✅ Browser launched successfully!');
    console.log('\n📍 You should now see a Chromium browser window opening...');
    
    // Navigate to JIRA UAT login
    console.log('\n🌐 Navigating to JIRA UAT login page...');
    await page.goto('https://jirauat.smedigitalapps.com/jira/login.jsp', { timeout: 30000 });
    
    console.log('✅ Navigated to JIRA UAT login page');
    
    console.log('\n👋 MANUAL LOGIN INSTRUCTIONS:');
    console.log('=====================================');
    console.log('1. 🔍 Look for the Chromium browser window that just opened');
    console.log('2. 🔐 Complete your login in that browser:');
    console.log('   - Enter your username and password');
    console.log('   - Complete 2FA if prompted');
    console.log('   - Wait until you reach the JIRA dashboard');
    console.log('3. 💬 Come back here and tell me when you\'re logged in!');
    console.log('4. 🚫 DO NOT close the browser window!');
    console.log('=====================================');
    
    // Wait for user confirmation
    console.log('\n⏳ Waiting for you to complete login...');
    console.log('💡 The browser will stay open until you tell me you\'re logged in');
    
    // Keep the browser open and wait
    const waitForLogin = async (): Promise<void> => {
      let attempts = 0;
      const maxAttempts = 180; // 30 minutes max wait
      
      while (attempts < maxAttempts) {
        try {
          const currentUrl = page.url();
          const title = await page.title();
          
          console.log(`⏰ Minute ${Math.floor(attempts / 6)}: Waiting for login completion...`);
          console.log(`   Current URL: ${currentUrl}`);
          console.log(`   Page Title: ${title}`);
          
          // Check if user has reached dashboard
          if (currentUrl.includes('/dashboard') || 
              currentUrl.includes('/secure/Dashboard.jspa') ||
              title.toLowerCase().includes('dashboard')) {
            
            console.log('\n🎉 LOGIN DETECTED! Dashboard reached!');
            console.log('✅ Login appears to be successful');
            
            // Show current state
            console.log('\n📊 Current Login State:');
            console.log(`   URL: ${currentUrl}`);
            console.log(`   Title: ${title}`);
            console.log(`   Status: AUTHENTICATED`);
            
            break;
          }
          
          await page.waitForTimeout(10000); // Wait 10 seconds
          attempts++;
          
        } catch (error) {
          console.log(`⚠️ Checking login status... (${attempts}/${maxAttempts})`);
          await page.waitForTimeout(10000);
          attempts++;
        }
      }
      
      if (attempts >= maxAttempts) {
        console.log('\n⏰ Maximum wait time reached (30 minutes)');
        console.log('🔄 Please let me know when you\'ve completed the login');
      }
    };
    
    await waitForLogin();
    
    console.log('\n🦁 Ready for next steps!');
    console.log('💬 Let me know when you want to proceed with the comprehensive testing');
    console.log('🔗 Browser will remain open for session capture');
    
    // Keep browser open for session capture
    console.log('\n⚠️ KEEPING BROWSER OPEN FOR SESSION CAPTURE...');
    console.log('🚫 Do not close this terminal or browser!');
    
    // Wait indefinitely until user is ready
    await new Promise(() => {}); // Infinite wait
    
  } catch (error) {
    console.error('❌ Error opening browser:', error);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Make sure Playwright is installed: npx playwright install chromium');
    console.log('   2. Check if any security software is blocking browser launch');
    console.log('   3. Try running with different browser: npx playwright test --headed');
  }
}

// Run the visible browser login
openVisibleBrowserForLogin()
  .catch(console.error); 