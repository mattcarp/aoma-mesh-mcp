#!/usr/bin/env tsx
/**
 * Extract JIRA session cookies from browser for API calls
 */

import { chromium } from 'playwright';

async function extractCookies() {
  console.log('🍪 Extracting JIRA session cookies...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Go to JIRA
    await page.goto('https://jirauat.smedigitalapps.com/jira');
    console.log('📍 Opened JIRA in browser');
    
    console.log('\n⏸️ MANUAL STEP REQUIRED:');
    console.log('1. Please log in manually in the opened browser');
    console.log('2. Navigate to any JIRA page to confirm you\'re logged in');
    console.log('3. Press Enter here when done...');
    
    // Wait for user to complete manual login
    await new Promise(resolve => {
      process.stdin.once('data', resolve);
    });
    
    // Extract cookies
    const cookies = await context.cookies();
    const jiraCookies = cookies.filter(cookie => 
      cookie.domain.includes('smedigitalapps.com') || 
      cookie.name.includes('JSESSIONID') ||
      cookie.name.includes('atlassian') ||
      cookie.name.includes('jira')
    );
    
    console.log(`\n🍪 Found ${jiraCookies.length} JIRA-related cookies:`);
    jiraCookies.forEach(cookie => {
      console.log(`   ${cookie.name}: ${cookie.value.slice(0, 20)}...`);
    });
    
    // Create cookie header string
    const cookieHeader = jiraCookies.map(c => `${c.name}=${c.value}`).join('; ');
    
    console.log('\n📋 Cookie header for API calls:');
    console.log(cookieHeader);
    
    // Test API call with cookies
    console.log('\n🧪 Testing API with extracted cookies...');
    
    const response = await fetch('https://jirauat.smedigitalapps.com/jira/rest/api/2/search?jql=ORDER BY created DESC&maxResults=3&fields=key,summary', {
      headers: {
        'Cookie': cookieHeader,
        'Accept': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('🎉 SUCCESS! API works with cookies');
      console.log(`   Total tickets: ${data.total}`);
      console.log(`   Returned: ${data.issues.length}`);
      
      data.issues.forEach((ticket: any, i: number) => {
        console.log(`   ${i+1}. ${ticket.key}: ${ticket.fields.summary.slice(0, 50)}...`);
      });
      
      // Save cookies to file for reuse
      const fs = await import('fs');
      fs.writeFileSync('jira-cookies.json', JSON.stringify(jiraCookies, null, 2));
      console.log('\n💾 Cookies saved to jira-cookies.json for reuse');
      
    } else {
      console.log(`❌ API failed: ${response.status} ${response.statusText}`);
    }
    
  } finally {
    await browser.close();
  }
}

extractCookies().catch(console.error);
