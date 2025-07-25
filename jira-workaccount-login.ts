#!/usr/bin/env tsx
/**
 * JIRA login using workaccount field
 */

import { chromium } from 'playwright';
import { config } from 'dotenv';

config();

async function loginWithWorkAccount() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  const username = process.env.JIRA_USERNAME || 'mcarpent';
  const password = process.env.JIRA_PASSWORD;
  
  try {
    await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
    await page.waitForTimeout(3000);
    
    // Try using the workaccount field
    console.log('🔤 Filling work account field...');
    await page.fill('#login-form-workaccount', username);
    
    // Look for and click the main login button
    const mainLoginButton = '#loginMainButton';
    console.log('👆 Clicking main login button...');
    await page.click(mainLoginButton);
    
    // Wait for response
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'jira-after-workaccount.png' });
    console.log('📸 Screenshot saved as jira-after-workaccount.png');
    
    // Check what happened - might have revealed username/password fields
    const usernameVisible = await page.locator('#login-form-username').isVisible();
    const passwordVisible = await page.locator('#login-form-password').isVisible();
    
    console.log(`Username field visible: ${usernameVisible}`);
    console.log(`Password field visible: ${passwordVisible}`);
    
    if (usernameVisible && passwordVisible) {
      console.log('✅ Login form now visible!');
      
      // Fill in the credentials
      console.log('🔤 Filling username...');
      await page.fill('#login-form-username', username);
      
      console.log('🔑 Filling password...');
      await page.fill('#login-form-password', password!);
      
      console.log('👆 Submitting login...');
      await page.click('#loginMainButton');
      
      // Wait for login to complete
      await page.waitForTimeout(5000);
      await page.screenshot({ path: 'jira-after-full-login.png' });
      console.log('📸 Screenshot after login saved');
      
      // Test API access
      console.log('🧪 Testing API access...');
      await page.goto('https://jirauat.smedigitalapps.com/jira/rest/api/2/search?jql=ORDER BY created DESC&maxResults=3&fields=key,summary');
      
      const content = await page.content();
      if (content.includes('"startAt"')) {
        const jsonStart = content.indexOf('{');
        const jsonEnd = content.lastIndexOf('}') + 1;
        const data = JSON.parse(content.substring(jsonStart, jsonEnd));
        
        console.log('🎉 SUCCESS! API access working');
        console.log(`   Total tickets available: ${data.total}`);
        console.log(`   Tickets returned: ${data.issues.length}`);
        
        if (data.issues.length > 0) {
          data.issues.forEach((ticket: any, i: number) => {
            console.log(`   ${i+1}. ${ticket.key}: ${ticket.fields.summary.slice(0, 50)}...`);
          });
        }
      } else {
        console.log('❌ API still not accessible');
        console.log('Response preview:', content.slice(0, 200) + '...');
      }
    } else {
      console.log('❌ Login form still not visible after workaccount submission');
    }
    
    // Keep browser open for inspection
    console.log('\n⏸️ Browser will stay open for inspection...');
    await new Promise(resolve => {
      process.stdin.once('data', resolve);
    });
    
  } finally {
    await browser.close();
  }
}

loginWithWorkAccount().catch(console.error);
