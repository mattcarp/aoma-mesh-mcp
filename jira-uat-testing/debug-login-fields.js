const { chromium } = require('@playwright/test');

async function debugLoginFields() {
  console.log('🔍 DEBUG: JIRA LOGIN FIELDS');
  console.log('============================');
  
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
    
    console.log('🌐 Going to JIRA UAT login page...');
    await page.goto('https://jirauat.smedigitalapps.com/jira/login.jsp', {
      timeout: 30000
    });
    
    await page.waitForLoadState('networkidle');
    
    console.log('📍 Current URL:', page.url());
    
    // Take screenshot
    await page.screenshot({ 
      path: 'debug-login-fields.png', 
      fullPage: true 
    });
    
    console.log('🔍 All input fields on the page:');
    const inputs = await page.locator('input').all();
    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const name = await input.getAttribute('name');
      const id = await input.getAttribute('id');
      const type = await input.getAttribute('type');
      const placeholder = await input.getAttribute('placeholder');
      const className = await input.getAttribute('class');
      const value = await input.getAttribute('value');
      
      console.log(`Input ${i}:`);
      console.log(`  name="${name}"`);
      console.log(`  id="${id}"`);
      console.log(`  type="${type}"`);
      console.log(`  placeholder="${placeholder}"`);
      console.log(`  class="${className}"`);
      console.log(`  value="${value}"`);
      console.log('  ---');
    }
    
    console.log('🔍 All form elements:');
    const forms = await page.locator('form').all();
    for (let i = 0; i < forms.length; i++) {
      const form = forms[i];
      const action = await form.getAttribute('action');
      const method = await form.getAttribute('method');
      const id = await form.getAttribute('id');
      const className = await form.getAttribute('class');
      
      console.log(`Form ${i}:`);
      console.log(`  action="${action}"`);
      console.log(`  method="${method}"`);
      console.log(`  id="${id}"`);
      console.log(`  class="${className}"`);
      console.log('  ---');
    }
    
    console.log('🔍 All buttons:');
    const buttons = await page.locator('button, input[type="submit"], input[type="button"]').all();
    for (let i = 0; i < buttons.length; i++) {
      const button = buttons[i];
      const text = await button.textContent();
      const type = await button.getAttribute('type');
      const name = await button.getAttribute('name');
      const id = await button.getAttribute('id');
      const value = await button.getAttribute('value');
      
      console.log(`Button ${i}:`);
      console.log(`  text="${text}"`);
      console.log(`  type="${type}"`);
      console.log(`  name="${name}"`);
      console.log(`  id="${id}"`);
      console.log(`  value="${value}"`);
      console.log('  ---');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    console.log('⏳ Keeping browser open for 30 seconds to inspect...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    await browser.close();
  }
}

debugLoginFields()
  .then(() => {
    console.log('\n🎉 Debug complete!');
    console.log('📸 Check debug-login-fields.png for visual');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
