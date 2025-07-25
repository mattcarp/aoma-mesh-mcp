#!/usr/bin/env tsx
/**
 * Find and interact with JIRA login form
 */

import { chromium } from 'playwright';

async function findJiraForm() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
    await page.waitForTimeout(3000);
    
    console.log('🔍 Looking for login elements...');
    
    // Check if login form is visible
    const loginFormVisible = await page.locator('#login-form-username').isVisible();
    console.log(`Login form visible: ${loginFormVisible}`);
    
    if (!loginFormVisible) {
      // Look for elements that might reveal the login form
      console.log('🔍 Looking for "Log In" button or link...');
      
      const loginTriggers = [
        'text="Log In"',
        'text="Login"', 
        'text="Sign In"',
        '.login-link',
        '[href*="login"]'
      ];
      
      for (const trigger of loginTriggers) {
        try {
          const element = page.locator(trigger);
          const count = await element.count();
          if (count > 0) {
            console.log(`✅ Found login trigger: ${trigger} (${count} elements)`);
            
            // Click the first one
            await element.first().click();
            console.log('👆 Clicked login trigger');
            
            // Wait for form to appear
            await page.waitForTimeout(2000);
            
            // Check if form is now visible
            const nowVisible = await page.locator('#login-form-username').isVisible();
            console.log(`Login form now visible: ${nowVisible}`);
            
            if (nowVisible) {
              break;
            }
          }
        } catch (e) {
          console.log(`❌ No trigger found: ${trigger}`);
        }
      }
    }
    
    // Final check and screenshot
    await page.screenshot({ path: 'jira-form-search.png' });
    console.log('📸 Screenshot saved as jira-form-search.png');
    
    // List all visible text inputs
    const textInputs = await page.locator('input[type="text"]:visible').count();
    console.log(`\n📋 Found ${textInputs} visible text inputs`);
    
    for (let i = 0; i < textInputs; i++) {
      const input = page.locator('input[type="text"]:visible').nth(i);
      const id = await input.getAttribute('id');
      const name = await input.getAttribute('name');
      const placeholder = await input.getAttribute('placeholder');
      console.log(`  Input ${i}: id="${id}", name="${name}", placeholder="${placeholder}"`);
    }
    
    console.log('\n⏸️ Browser will stay open for inspection...');
    await new Promise(resolve => {
      process.stdin.once('data', resolve);
    });
    
  } finally {
    await browser.close();
  }
}

findJiraForm().catch(console.error);
