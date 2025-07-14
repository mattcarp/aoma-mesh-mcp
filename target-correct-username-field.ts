#!/usr/bin/env npx tsx

import { chromium } from 'playwright';
import fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

async function targetCorrectField() {
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--window-size=1200,800']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1200, height: 800 }
  });
  
  const page = await context.newPage();
  
  try {
    await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
    await page.waitForTimeout(2000);
    
    // Click Log In button
    const loginBtn = page.locator('text="Log In"');
    if (await loginBtn.isVisible().catch(() => false)) {
      await loginBtn.click();
      await page.waitForTimeout(3000);
    }
    
    // Wait for page to load and find email field
    await page.waitForTimeout(5000);
    
    // Fill USERNAME field in the login form (NOT the search field!)
    const usernameField = page.locator('form input[placeholder="Username"], input[placeholder="Username"]');
    await usernameField.fill('mcarpent');
    console.log('👤 Filled username in login form: mcarpent');
    await page.waitForTimeout(1000);
    
    // Click Continue button 
    const continueBtn = page.locator('button:has-text("Continue")');
    await continueBtn.click();
    console.log('🔘 Clicked Continue button');
    
    // Don't close browser - keep it open
    console.log('Browser staying open - continuing login flow...');
    await new Promise(() => {}); // Keep running forever
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await new Promise(() => {}); // Keep browser open even on error
  }
}

targetCorrectField();
