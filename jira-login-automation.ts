#!/usr/bin/env tsx
/**
 * Automated JIRA login using the dashboard login form
 */

import { chromium } from 'playwright';
import { config } from 'dotenv';

config();

async function loginToJira() {
  console.log('🚀 Starting JIRA login automation...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  const username = process.env.JIRA_USERNAME || 'mcarpent';
  const password = process.env.JIRA_PASSWORD;
  
  try {
    // Go to JIRA dashboard
    console.log('📍 Going to JIRA dashboard...');
    await page.goto('https://jira.smedigitalapps.com/jira/secure/Dashboard.jspa');
    
    // Wait for page to load
    await page.waitForTimeout(3000);
    
    // Take screenshot to see current state
    await page.screenshot({ path: 'jira-before-login.png' });
    console.log('📸 Screenshot saved as jira-before-login.png');
    
    // Look for the login form fields (found from inspection)
    console.log('🔍 Looking for login form...');
    
    // Use the actual field IDs found from inspection
    const usernameField = '#login-form-username';
    const passwordField = '#login-form-password';
    const submitButton = '#loginMainButton';
    
    try {
      await page.waitForSelector(usernameField, { timeout: 5000 });
      console.log('✅ Found username field');
    } catch (e) {
      throw new Error('Could not find username field');
    }
    
    // Fill username
    console.log(`🔤 Filling username: ${username}`);
    await page.fill(usernameField, username);
    
    // Fill password immediately (both fields are on the same form)
    console.log('🔑 Filling password...');
    await page.fill(passwordField, password!);
    
    // Submit the form
    console.log('👆 Clicking login button...');
    await page.click(submitButton);
    
    // Wait for login to complete
    console.log('⏳ Waiting for login to complete...');
    await page.waitForTimeout(5000);
    
    // Take screenshot after login attempt
    await page.screenshot({ path: 'jira-after-login.png' });
    console.log('📸 Screenshot after login saved as jira-after-login.png');
    
    // Check if we're logged in by looking at the URL or page content
    const currentUrl = page.url();
    console.log(`📍 Current URL after login: ${currentUrl}`);
    
    // Test if we can access the API now
    console.log('🧪 Testing API access...');
    await page.goto('https://jira.smedigitalapps.com/jira/rest/api/2/search?jql=ORDER BY created DESC&maxResults=3&fields=key,summary');
    
    const content = await page.content();
    if (content.includes('"startAt"')) {
      const jsonStart = content.indexOf('{');
      const jsonEnd = content.lastIndexOf('}') + 1;
      const data = JSON.parse(content.substring(jsonStart, jsonEnd));
      
      console.log('🎉 SUCCESS! API access working');
      console.log(`   Total tickets available: ${data.total}`);
      console.log(`   Tickets returned: ${data.issues.length}`);
      
      data.issues.forEach((ticket: any, i: number) => {
        console.log(`   ${i+1}. ${ticket.key}: ${ticket.fields.summary.slice(0, 50)}...`);
      });
    } else {
      console.log('❌ API still not accessible');
      console.log('Response preview:', content.slice(0, 200) + '...');
    }
    
    // Keep browser open for inspection
    console.log('\n⏸️  Browser will stay open for inspection');
    console.log('   Press Enter to close...');
    await new Promise(resolve => {
      process.stdin.once('data', resolve);
    });
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

loginToJira().catch(console.error);
