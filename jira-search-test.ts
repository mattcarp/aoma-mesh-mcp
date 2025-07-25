#!/usr/bin/env tsx
/**
 * Test different JIRA search queries
 */

import { chromium } from 'playwright';

async function testJiraQueries() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://jirauat.smedigitalapps.com/jira');
    
    const queries = [
      '',  // Empty JQL (should return all)
      'project = ITSM ORDER BY created DESC',
      'status != Closed ORDER BY created DESC', 
      'created >= -30d ORDER BY created DESC',
      'reporter = currentUser() ORDER BY created DESC',
      'assignee = currentUser() OR reporter = currentUser() ORDER BY created DESC'
    ];
    
    for (let i = 0; i < queries.length; i++) {
      const jql = queries[i];
      console.log(`\n🔍 Test ${i+1}: "${jql || 'empty'}"`);
      
      const url = jql 
        ? `https://jirauat.smedigitalapps.com/jira/rest/api/2/search?jql=${encodeURIComponent(jql)}&maxResults=3&fields=key,summary,created`
        : `https://jirauat.smedigitalapps.com/jira/rest/api/2/search?maxResults=3&fields=key,summary,created`;
      
      try {
        await page.goto(url);
        const content = await page.content();
        
        if (content.includes('"startAt"')) {
          const jsonStart = content.indexOf('{');
          const jsonEnd = content.lastIndexOf('}') + 1;
          const data = JSON.parse(content.substring(jsonStart, jsonEnd));
          
          console.log(`   ✅ ${data.total} total tickets, ${data.issues.length} returned`);
          
          if (data.issues.length > 0) {
            data.issues.forEach((ticket: any, idx: number) => {
              console.log(`   ${idx+1}. ${ticket.key}: ${ticket.fields.summary.slice(0, 40)}...`);
            });
            
            // If we found tickets, stop here
            if (data.total > 0) {
              console.log(`\n🎉 Found working query! Total available: ${data.total}`);
              break;
            }
          }
        } else {
          console.log('   ❌ Invalid response');
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
      
      // Small delay between requests
      await page.waitForTimeout(1000);
    }
    
  } finally {
    await browser.close();
  }
}

testJiraQueries().catch(console.error);
