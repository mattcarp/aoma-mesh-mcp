#!/usr/bin/env tsx
/**
 * Quick JIRA cookie extraction - no manual intervention needed
 */

import { chromium } from 'playwright';

async function quickCookieGrab() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('🔍 Checking current JIRA session...');
    
    // Go directly to JIRA
    await page.goto('https://jira.smedigitalapps.com/jira');
    await page.waitForTimeout(3000);
    
    // Immediately test API access
    console.log('🧪 Testing API access...');
    await page.goto('https://jira.smedigitalapps.com/jira/rest/api/2/search?jql=ORDER BY created DESC&maxResults=3&fields=key,summary');
    
    const content = await page.content();
    
    if (content.includes('"startAt"') || content.includes('"total"')) {
      console.log('✅ API access working! Extracting cookies...');
      
      // Go back to main page to get all cookies
      await page.goto('https://jira.smedigitalapps.com/jira');
      await page.waitForTimeout(1000);
      
      const cookies = await page.context().cookies();
      const jiraCookies = cookies.filter(c => 
        c.domain.includes('smedigitalapps.com') ||
        c.name.includes('JSESSIONID') ||
        c.name.includes('atlassian') ||
        c.name.includes('jira')
      );
      
      const cookieHeader = jiraCookies.map(c => `${c.name}=${c.value}`).join('; ');
      
      console.log(`🍪 Extracted ${jiraCookies.length} cookies`);
      
      // Test with extracted cookies
      const response = await fetch('https://jira.smedigitalapps.com/jira/rest/api/2/search?jql=ORDER BY created DESC&maxResults=5&fields=key,summary,created', {
        headers: {
          'Cookie': cookieHeader,
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`🎉 SUCCESS! Found ${data.total} total tickets`);
        
        console.log('\n📋 Recent tickets:');
        data.issues.forEach((ticket: any, i: number) => {
          console.log(`   ${i+1}. ${ticket.key}: ${ticket.fields.summary.slice(0, 50)}...`);
        });
        
        // Save session
        const fs = await import('fs');
        const sessionData = {
          cookieHeader,
          cookies: jiraCookies,
          totalTickets: data.total,
          timestamp: new Date().toISOString(),
          baseUrl: 'https://jira.smedigitalapps.com/jira'
        };
        
        fs.writeFileSync('jira-working-session.json', JSON.stringify(sessionData, null, 2));
        console.log('\n💾 Working session saved to jira-working-session.json');
        console.log('🚀 Ready to build production scraper!');
        
        return sessionData;
      } else {
        console.log(`❌ Cookie test failed: ${response.status}`);
      }
    } else {
      console.log('❌ API not accessible - need to log in first');
      console.log('Current page title:', await page.title());
      console.log('Current URL:', page.url());
      
      // Take screenshot to see what's happening
      await page.screenshot({ path: 'jira-current-state.png' });
      console.log('📸 Screenshot saved as jira-current-state.png');
    }
    
  } finally {
    await browser.close();
  }
}

quickCookieGrab().catch(console.error);
