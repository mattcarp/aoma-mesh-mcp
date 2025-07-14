#!/usr/bin/env tsx
/**
 * Simple JIRA scraper - test and incremental fetch
 */

import { config } from 'dotenv';

config();

async function testJiraConnection() {
  const username = process.env.JIRA_USERNAME;
  const password = process.env.JIRA_PASSWORD;
  const baseUrl = process.env.JIRA_BASE_URL || 'https://jira.smedigitalapps.com';

  const auth = Buffer.from(`${username}:${password}`).toString('base64');
  
  console.log(`Testing with: ${username} at ${baseUrl}`);
  
  const endpoints = [
    '/rest/api/2/myself',
    '/rest/api/latest/myself', 
    '/rest/api/2/serverInfo',
    '/rest/api/2/search?jql=key=ITSM-55362&maxResults=1'
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\nTrying: ${baseUrl}${endpoint}`);
      
      const response = await fetch(`${baseUrl}${endpoint}`, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'JIRA-Scraper/1.0'
        },
      });

      console.log(`Response: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ SUCCESS! Endpoint works:', endpoint);
        console.log('Response data:', JSON.stringify(data, null, 2).slice(0, 200) + '...');
        return true;
      } else {
        const errorText = await response.text();
        console.log(`Error body: ${errorText.slice(0, 100)}...`);
      }
    } catch (error) {
      console.log(`Error: ${error.message}`);
    }
  }
  
  return false;
}

async function fetchRecentTickets(maxResults = 10) {
  const username = process.env.JIRA_USERNAME;
  const password = process.env.JIRA_PASSWORD;
  const baseUrl = process.env.JIRA_BASE_URL || 'https://jira.smedigitalapps.com';

  const auth = Buffer.from(`${username}:${password}`).toString('base64');
  
  console.log(`\n🔍 Fetching ${maxResults} recent tickets...`);
  
  try {
    const jql = 'ORDER BY created DESC';
    const url = `${baseUrl}/rest/api/2/search?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}&fields=key,summary,created,status,priority`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Found ${data.issues.length} tickets:`);
      
      data.issues.forEach((ticket: any, i: number) => {
        console.log(`   ${i+1}. ${ticket.key}: ${ticket.fields.summary.slice(0, 60)}...`);
        console.log(`      Status: ${ticket.fields.status.name} | Created: ${ticket.fields.created.slice(0, 10)}`);
      });
      
      return data.issues;
    } else {
      console.log(`❌ Search failed: ${response.status}`);
      const errorText = await response.text();
      console.log('Error:', errorText);
      return [];
    }
  } catch (error) {
    console.log('❌ Error fetching tickets:', error.message);
    return [];
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'test';
  
  console.log('🎫 Simple JIRA Scraper\n');

  if (command === 'test') {
    await testJiraConnection();
  } else if (command === 'fetch') {
    const maxResults = parseInt(args[1]) || 10;
    const connected = await testJiraConnection();
    if (connected) {
      await fetchRecentTickets(maxResults);
    }
  } else {
    console.log('Usage:');
    console.log('  npx tsx simple-jira-scraper.ts test');
    console.log('  npx tsx simple-jira-scraper.ts fetch [count]');
  }
}

main().catch(console.error);
