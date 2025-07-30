import { chromium } from 'playwright';

async function simpleLogin() {
  console.log('🔐 SIMPLE LOGIN ATTEMPT');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('📍 Navigating to JIRA UAT...');
    await page.goto('https://jirauat.smedigitalapps.com');
    
    console.log('📸 Taking initial screenshot...');
    await page.screenshot({ path: 'jira-uat-testing/simple-login-1-initial.png', fullPage: true });
    
    console.log('🔍 Looking for username field...');
    await page.waitForSelector('input', { timeout: 10000 });
    
    const inputs = await page.locator('input').all();
    console.log(`Found ${inputs.length} input fields`);
    
    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const type = await input.getAttribute('type');
      const name = await input.getAttribute('name');
      const placeholder = await input.getAttribute('placeholder');
      console.log(`Input ${i}: type=${type}, name=${name}, placeholder=${placeholder}`);
    }
    
    // Try to fill the first text input
    const firstTextInput = page.locator('input[type="text"]').first();
    if (await firstTextInput.isVisible()) {
      console.log('✅ Filling username...');
      await firstTextInput.fill('mcarpent');
      
      await page.screenshot({ path: 'jira-uat-testing/simple-login-2-username.png', fullPage: true });
      
      // Look for continue/next button
      const buttons = await page.locator('button, input[type="submit"]').all();
      console.log(`Found ${buttons.length} buttons`);
      
      if (buttons.length > 0) {
        console.log('🔍 Clicking first button...');
        await buttons[0].click();
        await page.waitForTimeout(3000);
        
        await page.screenshot({ path: 'jira-uat-testing/simple-login-3-after-button.png', fullPage: true });
      }
    }
    
    console.log('✅ Screenshots saved - check them manually');
    
  } catch (error) {
    console.error('❌ Error:', error);
    await page.screenshot({ path: 'jira-uat-testing/simple-login-error.png', fullPage: true });
  }
  
  console.log('⏳ Keeping browser open for 30 seconds...');
  await page.waitForTimeout(30000);
  await browser.close();
}

simpleLogin().catch(console.error);