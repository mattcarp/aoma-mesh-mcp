import { chromium } from 'playwright';

async function debugLoginPage() {
  console.log('🔍 Debugging JIRA UAT login page structure...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Navigate to JIRA UAT
    await page.goto('https://jirauat.smedigitalapps.com', { timeout: 30000 });
    console.log('🌐 Navigated to JIRA UAT');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    // Take screenshot
    await page.screenshot({ 
      path: 'jira-uat-testing/screenshots/debug-login-page.png',
      fullPage: true 
    });
    console.log('📸 Screenshot saved: debug-login-page.png');
    
    // Get page title and URL
    const title = await page.title();
    const url = page.url();
    console.log(`📄 Page title: ${title}`);
    console.log(`🌐 Current URL: ${url}`);
    
    // Find all input fields
    const inputs = await page.locator('input').all();
    console.log(`🔍 Found ${inputs.length} input fields:`);
    
    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const name = await input.getAttribute('name').catch(() => 'no-name');
      const id = await input.getAttribute('id').catch(() => 'no-id');
      const type = await input.getAttribute('type').catch(() => 'no-type');
      const placeholder = await input.getAttribute('placeholder').catch(() => 'no-placeholder');
      const className = await input.getAttribute('class').catch(() => 'no-class');
      
      console.log(`  Input ${i + 1}:`);
      console.log(`    name: ${name}`);
      console.log(`    id: ${id}`);
      console.log(`    type: ${type}`);
      console.log(`    placeholder: ${placeholder}`);
      console.log(`    class: ${className}`);
      console.log('    ---');
    }
    
    // Find all buttons
    const buttons = await page.locator('button, input[type="submit"]').all();
    console.log(`🔍 Found ${buttons.length} buttons/submit inputs:`);
    
    for (let i = 0; i < buttons.length; i++) {
      const button = buttons[i];
      const text = await button.textContent().catch(() => 'no-text');
      const name = await button.getAttribute('name').catch(() => 'no-name');
      const id = await button.getAttribute('id').catch(() => 'no-id');
      const type = await button.getAttribute('type').catch(() => 'no-type');
      const value = await button.getAttribute('value').catch(() => 'no-value');
      
      console.log(`  Button ${i + 1}:`);
      console.log(`    text: ${text?.trim()}`);
      console.log(`    name: ${name}`);
      console.log(`    id: ${id}`);
      console.log(`    type: ${type}`);
      console.log(`    value: ${value}`);
      console.log('    ---');
    }
    
    // Get page HTML for analysis
    const html = await page.content();
    console.log(`📝 Page HTML length: ${html.length} characters`);
    
    // Look for common login indicators
    const hasUsernameText = html.toLowerCase().includes('username');
    const hasPasswordText = html.toLowerCase().includes('password');
    const hasLoginText = html.toLowerCase().includes('login') || html.toLowerCase().includes('log in');
    const hasSignInText = html.toLowerCase().includes('sign in') || html.toLowerCase().includes('signin');
    
    console.log(`🔍 Login indicators:`);
    console.log(`  Contains 'username': ${hasUsernameText}`);
    console.log(`  Contains 'password': ${hasPasswordText}`);
    console.log(`  Contains 'login': ${hasLoginText}`);
    console.log(`  Contains 'sign in': ${hasSignInText}`);
    
    console.log('✅ Debug complete - check the screenshot and console output');
    
    // Keep browser open for manual inspection
    console.log('🔍 Browser kept open for manual inspection...');
    await page.waitForTimeout(60000); // Wait 1 minute
    
  } catch (error) {
    console.error('❌ Error during debug:', error);
    await page.screenshot({ 
      path: 'jira-uat-testing/screenshots/debug-error.png',
      fullPage: true 
    });
  } finally {
    await browser.close();
  }
}

debugLoginPage().catch(console.error);