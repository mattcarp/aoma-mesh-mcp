#!/usr/bin/env tsx
/**
 * Test JIRA API with existing browser session
 */

import { chromium } from 'playwright';

async function testJiraAPI() {
  console.log('🧪 Testing JIRA API with existing session...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // First check if we can access JIRA
    await page.goto('https://jirauat.smedigitalapps.com/jira');
    console.log('📍 JIRA URL:', page.url());
    
    // Test the API endpoint that worked in your browser
    const apiUrl = 'https://jirauat.smedigitalapps.com/jira/rest/api/2/search?jql=key=ITSM-55362&maxResults=1';
    console.log('\n🔍 Testing API endpoint...');
    
    await page.goto(apiUrl);
    const content = await page.content();
    
    if (content.includes('"startAt"')) {
      console.log('✅ API endpoint works!');
      const jsonStart = content.indexOf('{');
      const jsonEnd = content.lastIndexOf('}') + 1;
      const jsonContent = content.substring(jsonStart, jsonEnd);
      
      try {
        const data = JSON.parse(jsonContent);
        console.log('📊 API Response:');
        console.log(`   Total tickets found: ${data.total}`);
        console.log(`   Issues in response: ${data.issues.length}`);
        
        if (data.issues.length > 0) {
          const ticket = data.issues[0];
          console.log(`   Sample ticket: ${ticket.key} - ${ticket.fields.summary}`);
        }
      } catch (e) {
        console.log('📄 Raw response:', jsonContent.slice(0, 200) + '...');
      }
      
      // Test a broader search
      console.log('\n🔍 Testing broader search...');
      const broadUrl = 'https://jirauat.smedigitalapps.com/jira/rest/api/2/search?jql=ORDER BY created DESC&maxResults=5&fields=key,summary,created,status';
      await page.goto(broadUrl);
      const broadContent = await page.content();
      
      if (broadContent.includes('"startAt"')) {
        const jsonStart = broadContent.indexOf('{');
        const jsonEnd = broadContent.lastIndexOf('}') + 1;
        const jsonData = JSON.parse(broadContent.substring(jsonStart, jsonEnd));
        
        console.log('✅ Broader search works!');
        console.log(`   Found ${jsonData.total} total tickets`);
        console.log(`   Recent tickets:`);
        
        jsonData.issues.forEach((ticket: any, i: number) => {
          console.log(`   ${i+1}. ${ticket.key}: ${ticket.fields.summary.slice(0, 50)}...`);
        });
        
        return true;
      }
    } else {
      console.log('❌ API not accessible - might need login');
      return false;
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

testJiraAPI().catch(console.error);
