const { chromium } = require('@playwright/test');

async function diagnoseLogin() {
  console.log('🔍 DIAGNOSE JIRA UAT LOGIN');
  console.log('===========================');
  
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
    
    console.log('🌐 Opening JIRA UAT login page...');
    await page.goto('https://jirauat.smedigitalapps.com/jira/login.jsp', {
      timeout: 30000
    });
    
    await page.waitForLoadState('networkidle');
    
    console.log(`📍 Current URL: ${page.url()}`);
    
    // Take screenshot
    await page.screenshot({ 
      path: 'diagnose-login-page.png', 
      fullPage: true 
    });
    
    console.log('🔍 Analyzing login page elements...');
    
    // Check for error messages
    console.log('\n❌ CHECKING FOR ERROR MESSAGES:');
    const errorSelectors = [
      'text="Incorrect username or password"',
      '.error-message',
      '.alert-error',
      '[role="alert"]',
      '.aui-message-error',
      '.error',
      '.validation-error'
    ];
    
    for (const selector of errorSelectors) {
      try {
        const error = page.locator(selector);
        const count = await error.count();
        if (count > 0) {
          const text = await error.textContent();
          console.log(`   ❌ Found error: "${text}" (${selector})`);
        }
      } catch (e) {
        // Continue
      }
    }
    
    // Check form fields
    console.log('\n📝 CHECKING FORM FIELDS:');
    
    // Username field
    const usernameSelectors = [
      '#username-field',
      'input[name="username"]',
      'input[name="os_username"]'
    ];
    
    for (const selector of usernameSelectors) {
      try {
        const field = page.locator(selector);
        const count = await field.count();
        if (count > 0) {
          const isVisible = await field.isVisible();
          const isEnabled = await field.isEnabled();
          const value = await field.inputValue();
          const placeholder = await field.getAttribute('placeholder');
          console.log(`   👤 Username field (${selector}):`);
          console.log(`      Visible: ${isVisible}, Enabled: ${isEnabled}`);
          console.log(`      Value: "${value}", Placeholder: "${placeholder}"`);
        }
      } catch (e) {
        // Continue
      }
    }
    
    // Password field
    const passwordSelectors = [
      'input[name="password"]',
      'input[name="os_password"]',
      'input[type="password"]'
    ];
    
    for (const selector of passwordSelectors) {
      try {
        const field = page.locator(selector);
        const count = await field.count();
        if (count > 0) {
          const isVisible = await field.isVisible();
          const isEnabled = await field.isEnabled();
          const value = await field.inputValue();
          console.log(`   🔐 Password field (${selector}):`);
          console.log(`      Visible: ${isVisible}, Enabled: ${isEnabled}`);
          console.log(`      Value length: ${value.length}`);
        }
      } catch (e) {
        // Continue
      }
    }
    
    // Check submit buttons
    console.log('\n🚀 CHECKING SUBMIT BUTTONS:');
    const submitSelectors = [
      '#login-button',
      '#use-sso-button',
      'button[type="submit"]',
      'button:has-text("Log in")',
      'button:has-text("Continue")'
    ];
    
    for (const selector of submitSelectors) {
      try {
        const button = page.locator(selector);
        const count = await button.count();
        if (count > 0) {
          const isVisible = await button.isVisible();
          const isEnabled = await button.isEnabled();
          const text = await button.textContent();
          console.log(`   🖱️ Button (${selector}):`);
          console.log(`      Visible: ${isVisible}, Enabled: ${isEnabled}`);
          console.log(`      Text: "${text?.trim()}"`);
        }
      } catch (e) {
        // Continue
      }
    }
    
    // Check remember me checkbox
    console.log('\n☑️ CHECKING REMEMBER ME:');
    const checkboxSelectors = [
      'input[type="checkbox"]',
      'input[name*="remember"]'
    ];
    
    for (const selector of checkboxSelectors) {
      try {
        const checkbox = page.locator(selector);
        const count = await checkbox.count();
        if (count > 0) {
          const isVisible = await checkbox.isVisible();
          const isChecked = await checkbox.isChecked();
          const name = await checkbox.getAttribute('name');
          console.log(`   ☑️ Checkbox (${selector}):`);
          console.log(`      Visible: ${isVisible}, Checked: ${isChecked}`);
          console.log(`      Name: "${name}"`);
        }
      } catch (e) {
        // Continue
      }
    }
    
    // Check page title and headers
    console.log('\n📄 PAGE INFO:');
    const title = await page.title();
    console.log(`   Title: "${title}"`);
    
    const headers = await page.locator('h1, h2, h3').all();
    for (let i = 0; i < Math.min(headers.length, 5); i++) {
      const text = await headers[i].textContent();
      console.log(`   Header ${i+1}: "${text?.trim()}"`);
    }
    
    console.log('\n💡 RECOMMENDATIONS:');
    
    // Check if this is the right login page
    if (title.includes('Login') || title.includes('Sign in')) {
      console.log('   ✅ This appears to be a login page');
    } else {
      console.log('   ⚠️ This might not be the correct login page');
    }
    
    // Check for SSO indicators
    const ssoButton = await page.locator('#use-sso-button, button:has-text("SSO")').count();
    if (ssoButton > 0) {
      console.log('   🔐 SSO login option available - might need to use that instead');
    }
    
    // Check if already logged in
    const userMenu = await page.locator('#header-details-user-fullname, .aui-dropdown2-trigger-text').count();
    if (userMenu > 0) {
      console.log('   🎉 Already appears to be logged in!');
    }
    
  } catch (error) {
    console.error('❌ Error during diagnosis:', error.message);
  } finally {
    console.log('\n⏳ Keeping browser open for 30 seconds for manual inspection...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    await browser.close();
  }
}

diagnoseLogin()
  .then(() => {
    console.log('\n🔍 DIAGNOSIS COMPLETE!');
    console.log('📸 Check diagnose-login-page.png for visual');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
