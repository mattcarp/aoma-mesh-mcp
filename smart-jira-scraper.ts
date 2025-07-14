#!/usr/bin/env tsx
/**
 * Smart JIRA scraper that navigates the interface to find tickets
 */

import { chromium } from 'playwright';

async function smartJiraScraper() {
  console.log('🧠 Smart JIRA scraper - finding tickets through web interface...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Start at JIRA
    console.log('📍 Loading JIRA dashboard...');
    await page.goto('https://jira.smedigitalapps.com/jira');
    await page.waitForTimeout(3000);
    
    console.log('✅ Current page:', await page.title());
    
    // Look for ways to access tickets in the interface
    console.log('\n🔍 Looking for ticket access points...');
    
    // Try different navigation approaches
    const navigationOptions = [
      { name: 'Issues menu', selector: 'text="Issues"' },
      { name: 'Search link', selector: 'text="Search"' },
      { name: 'Browse Projects', selector: 'text="Projects"' },
      { name: 'My Issues', selector: 'text="My"' },
      { name: 'Recently viewed', selector: 'text="Recent"' },
      { name: 'Search button', selector: 'button[title*="search" i]' },
      { name: 'Issue navigator', selector: 'a[href*="IssueNavigator"]' },
      { name: 'Advanced search', selector: 'a[href*="search"]' }
    ];
    
    for (const option of navigationOptions) {
      try {
        console.log(`   Trying: ${option.name}`);
        
        const element = page.locator(option.selector);
        const count = await element.count();
        
        if (count > 0) {
          console.log(`   ✅ Found ${option.name} (${count} elements)`);
          
          // Click the first one
          await element.first().click();
          await page.waitForTimeout(3000);
          
          const newUrl = page.url();
          const newTitle = await page.title();
          
          console.log(`   📍 Navigated to: ${newTitle}`);
          console.log(`   🔗 URL: ${newUrl}`);
          
          // Check if we can see tickets now
          if (newUrl.includes('Navigator') || newUrl.includes('search') || newTitle.includes('Issues')) {
            console.log('   🎯 This looks like a ticket view! Testing API...');
            
            await testAPIFromCurrentState(page);
            
            // Try to find actual ticket links on the page
            const ticketLinks = await page.locator('a[href*="browse/"]').count();
            const ticketKeys = await page.locator('text=/[A-Z]+-[0-9]+/').count();
            
            console.log(`   📋 Found ${ticketLinks} ticket links, ${ticketKeys} ticket keys on page`);
            
            if (ticketLinks > 0 || ticketKeys > 0) {
              console.log('   🎉 SUCCESS! Found tickets in the interface');
              
              // Extract session and test
              await extractAndTestSession(page);
              break;
            }
          }
          
          // Go back to try next option
          await page.goBack();
          await page.waitForTimeout(2000);
        } else {
          console.log(`   ❌ ${option.name} not found`);
        }
      } catch (error) {
        console.log(`   ❌ ${option.name} error: ${error.message}`);
      }
    }
    
    // If navigation didn't work, try direct URLs
    console.log('\n🔍 Trying direct JIRA URLs...');
    
    const directUrls = [
      '/secure/IssueNavigator.jspa',
      '/issues/',
      '/browse/',
      '/secure/ManageFilters.jspa',
      '/secure/Dashboard.jspa?selectPageId=10000'
    ];
    
    for (const url of directUrls) {
      try {
        console.log(`   Trying: ${url}`);
        
        await page.goto(`https://jira.smedigitalapps.com/jira${url}`);
        await page.waitForTimeout(3000);
        
        const title = await page.title();
        console.log(`   📍 Page: ${title}`);
        
        if (title.includes('Issue') || title.includes('Search') || title.includes('Filter')) {
          console.log('   🎯 This looks promising! Testing API...');
          await testAPIFromCurrentState(page);
        }
        
        // Look for ticket content
        const ticketElements = await page.locator('text=/[A-Z]+-[0-9]+/').count();
        if (ticketElements > 0) {
          console.log(`   📋 Found ${ticketElements} ticket references!`);
          await extractAndTestSession(page);
          break;
        }
        
      } catch (error) {
        console.log(`   ❌ ${url} error: ${error.message}`);
      }
    }
    
    // Final attempt - try to trigger a search
    console.log('\n🔍 Attempting to trigger a ticket search...');
    
    await page.goto('https://jira.smedigitalapps.com/jira');
    await page.waitForTimeout(2000);
    
    // Try using the search box
    const searchBox = page.locator('#quickSearchInput');
    if (await searchBox.isVisible()) {
      console.log('   🔍 Found search box, trying search...');
      await searchBox.fill('ITSM');
      await searchBox.press('Enter');
      await page.waitForTimeout(3000);
      
      await testAPIFromCurrentState(page);
      await extractAndTestSession(page);
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  } finally {
    console.log('\n⏳ Keeping browser open for 15 seconds for inspection...');
    setTimeout(async () => {
      await browser.close();
    }, 15000);
  }
}

async function testAPIFromCurrentState(page: any) {
  console.log('      🧪 Testing API from current browser state...');
  
  const cookies = await page.context().cookies();
  const cookieHeader = cookies
    .filter((c: any) => c.domain.includes('smedigitalapps.com'))
    .map((c: any) => `${c.name}=${c.value}`)
    .join('; ');
  
  const testEndpoints = [
    '/rest/api/2/search?maxResults=5',
    '/rest/api/2/search?jql=ORDER BY created DESC&maxResults=5',
    '/rest/api/2/project',
    '/rest/api/2/issue/picker?query=ITSM'
  ];
  
  for (const endpoint of testEndpoints) {
    try {
      const response = await fetch(`https://jira.smedigitalapps.com/jira${endpoint}`, {
        headers: {
          'Cookie': cookieHeader,
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (endpoint.includes('search') && data.total) {
          console.log(`      ✅ ${endpoint}: ${data.total} tickets!`);
          if (data.issues?.length > 0) {
            console.log(`      📋 Sample: ${data.issues[0].key} - ${data.issues[0].fields.summary.slice(0, 30)}...`);
          }
        } else if (endpoint.includes('project') && data.length) {
          console.log(`      ✅ ${endpoint}: ${data.length} projects accessible`);
        } else if (endpoint.includes('picker') && data.sections) {
          console.log(`      ✅ ${endpoint}: Found issue picker data`);
        }
      } else {
        console.log(`      ❌ ${endpoint}: ${response.status}`);
      }
    } catch (error) {
      console.log(`      ❌ ${endpoint}: ${error.message}`);
    }
  }
}

async function extractAndTestSession(page: any) {
  console.log('   🍪 Extracting working session...');
  
  const cookies = await page.context().cookies();
  const jiraCookies = cookies.filter((c: any) => 
    c.domain.includes('smedigitalapps.com')
  );
  
  const cookieHeader = jiraCookies.map((c: any) => `${c.name}=${c.value}`).join('; ');
  
  // Test comprehensive API access
  const response = await fetch('https://jira.smedigitalapps.com/jira/rest/api/2/search?jql=ORDER BY created DESC&maxResults=10&fields=key,summary,created,status', {
    headers: {
      'Cookie': cookieHeader,
      'Accept': 'application/json'
    }
  });
  
  if (response.ok) {
    const data = await response.json();
    console.log(`   🎉 WORKING SESSION! ${data.total} total tickets accessible`);
    
    if (data.issues?.length > 0) {
      console.log('   📋 Recent tickets:');
      data.issues.forEach((ticket: any, i: number) => {
        console.log(`     ${i+1}. ${ticket.key}: ${ticket.fields.summary.slice(0, 50)}...`);
      });
    }
    
    // Save working session
    const fs = await import('fs');
    fs.writeFileSync('jira-working-complete.json', JSON.stringify({
      cookieHeader,
      cookies: jiraCookies,
      totalTickets: data.total,
      sampleTickets: data.issues?.slice(0, 3),
      timestamp: new Date().toISOString(),
      baseUrl: 'https://jira.smedigitalapps.com/jira'
    }, null, 2));
    
    console.log('   💾 Working session saved to jira-working-complete.json');
    console.log('   🚀 Ready for production scraping!');
  }
}

smartJiraScraper().catch(console.error);
