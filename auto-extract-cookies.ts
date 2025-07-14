#!/usr/bin/env tsx
/**
 * Auto-extract JIRA cookies without manual input
 */

import { chromium } from 'playwright';

async function autoExtractCookies() {
  console.log('🍪 Auto-extracting JIRA cookies...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Go to JIRA and wait for it to load
    console.log('📍 Loading JIRA...');
    await page.goto('https://jira.smedigitalapps.com/jira');
    await page.waitForTimeout(5000); // Give time for any redirects/loading
    
    console.log('🔍 Current URL:', page.url());
    console.log('📄 Page title:', await page.title());
    
    // Extract cookies immediately
    console.log('🍪 Extracting cookies...');
    const cookies = await page.context().cookies();
    const jiraCookies = cookies.filter(c => 
      c.domain.includes('smedigitalapps.com') ||
      c.name.includes('JSESSIONID') ||
      c.name.includes('atlassian') ||
      c.name.includes('jira')
    );
    
    console.log(`📋 Found ${jiraCookies.length} JIRA cookies:`);
    jiraCookies.forEach(cookie => {
      console.log(`   ${cookie.name}: ${cookie.value.slice(0, 20)}...`);
    });
    
    const cookieHeader = jiraCookies.map(c => `${c.name}=${c.value}`).join('; ');
    
    // Test API immediately
    console.log('\n🧪 Testing API with cookies...');
    
    const testUrls = [
      '/rest/api/2/search?maxResults=1',
      '/rest/api/2/search?jql=ORDER BY created DESC&maxResults=3',
      '/rest/api/2/project',
      '/rest/api/2/filter/favourite'
    ];
    
    let workingEndpoint = null;
    let bestResult = null;
    
    for (const endpoint of testUrls) {
      try {
        console.log(`   Testing: ${endpoint}`);
        
        const response = await fetch(`https://jira.smedigitalapps.com/jira${endpoint}`, {
          headers: {
            'Cookie': cookieHeader,
            'Accept': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          
          if (endpoint.includes('search')) {
            console.log(`   ✅ Search: ${data.total} tickets, ${data.issues?.length || 0} returned`);
            if (data.total > 0) {
              workingEndpoint = endpoint;
              bestResult = data;
            }
          } else if (endpoint.includes('project')) {
            console.log(`   ✅ Projects: ${data.length} projects accessible`);
            if (data.length > 0) {
              console.log('     Projects:', data.map((p: any) => p.key).join(', '));
            }
          } else if (endpoint.includes('filter')) {
            console.log(`   ✅ Filters: ${data.length} favourite filters`);
          }
        } else {
          console.log(`   ❌ ${endpoint}: ${response.status}`);
        }
      } catch (error) {
        console.log(`   ❌ ${endpoint}: ${error.message}`);
      }
    }
    
    // Save session data
    const sessionData = {
      cookieHeader,
      cookies: jiraCookies,
      workingEndpoint,
      bestResult,
      timestamp: new Date().toISOString(),
      baseUrl: 'https://jira.smedigitalapps.com/jira'
    };
    
    const fs = await import('fs');
    fs.writeFileSync('jira-auto-session.json', JSON.stringify(sessionData, null, 2));
    
    console.log('\n💾 Session saved to jira-auto-session.json');
    
    if (workingEndpoint && bestResult) {
      console.log('🎉 SUCCESS! Found working API access');
      console.log(`   Working endpoint: ${workingEndpoint}`);
      console.log(`   Total tickets available: ${bestResult.total}`);
      
      if (bestResult.issues?.length > 0) {
        console.log('   Sample tickets:');
        bestResult.issues.forEach((ticket: any, i: number) => {
          console.log(`     ${i+1}. ${ticket.key}: ${ticket.fields.summary.slice(0, 40)}...`);
        });
      }
    } else {
      console.log('⚠️  API access working but no tickets found');
      console.log('   This might be a permissions issue or need specific project queries');
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  } finally {
    // Auto-close after 10 seconds
    console.log('\n⏳ Closing browser in 10 seconds...');
    setTimeout(async () => {
      await browser.close();
      process.exit(0);
    }, 10000);
  }
}

autoExtractCookies().catch(console.error);
