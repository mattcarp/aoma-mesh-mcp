#!/usr/bin/env tsx
/**
 * Simple JIRA login debug script
 */

import { chromium } from 'playwright';
import { config } from 'dotenv';

config();

async function debugJiraLogin() {
  console.log('🚀 Starting browser for JIRA debug...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Go to JIRA
    console.log('📍 Going to JIRA...');
    await page.goto('https://jira.smedigitalapps.com/jira');
    
    // Wait and take screenshot
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'jira-debug.png' });
    
    console.log('📸 Screenshot saved as jira-debug.png');
    console.log('🔍 Current URL:', page.url());
    console.log('📄 Page title:', await page.title());
    
    // Check what's on the page
    const hasLoginForm = await page.locator('#login-form').count();
    const hasUsernameField = await page.locator('#username').count();
    const hasPasswordField = await page.locator('#password').count();
    
    console.log(`📋 Elements found:`);
    console.log(`   Login form: ${hasLoginForm}`);
    console.log(`   Username field: ${hasUsernameField}`);
    console.log(`   Password field: ${hasPasswordField}`);
    
    // Keep browser open for manual inspection
    console.log('\n⏸️  Browser is open for manual inspection');
    console.log('   You can manually log in and test the API');
    console.log('   Press Enter to continue or Ctrl+C to exit...');
    
    // Wait for user input
    await new Promise(resolve => {
      process.stdin.once('data', resolve);
    });
    
  } finally {
    await browser.close();
  }
}

debugJiraLogin().catch(console.error);
