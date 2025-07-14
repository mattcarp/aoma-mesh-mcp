#!/usr/bin/env tsx
/**
 * Test JIRA basic auth directly
 */

async function testBasicAuth() {
  const username = 'mcarpent';
  const password = 'Dooley1_Jude2';
  const baseUrl = 'https://jira.smedigitalapps.com/jira';
  
  console.log('🧪 Testing JIRA basic authentication...');
  
  const auth = Buffer.from(`${username}:${password}`).toString('base64');
  
  const endpoints = [
    '/rest/api/2/myself',
    '/rest/api/2/serverInfo', 
    '/rest/api/2/search?maxResults=1',
    '/rest/api/2/search?jql=ORDER BY created DESC&maxResults=5&fields=key,summary,created'
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\n🔍 Testing: ${endpoint}`);
      
      const response = await fetch(`${baseUrl}${endpoint}`, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`   Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (endpoint.includes('myself')) {
          console.log(`   ✅ Logged in as: ${data.displayName} (${data.emailAddress})`);
        } else if (endpoint.includes('serverInfo')) {
          console.log(`   ✅ Server: ${data.serverTitle} v${data.version}`);
        } else if (endpoint.includes('search')) {
          console.log(`   ✅ Found ${data.total} tickets, returned ${data.issues.length}`);
          if (data.issues.length > 0) {
            console.log('   📋 Recent tickets:');
            data.issues.forEach((ticket: any, i: number) => {
              console.log(`      ${i+1}. ${ticket.key}: ${ticket.fields.summary.slice(0, 50)}...`);
            });
            
            // Success! Let's run a bigger search
            console.log('\n🎉 BASIC AUTH WORKING! Running larger search...');
            return await runFullSearch(auth, baseUrl);
          }
        }
      } else {
        const errorText = await response.text();
        console.log(`   ❌ Error: ${errorText.slice(0, 100)}...`);
      }
    } catch (error) {
      console.log(`   ❌ Exception: ${error.message}`);
    }
  }
}

async function runFullSearch(auth: string, baseUrl: string) {
  try {
    console.log('🔍 Running comprehensive search...');
    
    const response = await fetch(`${baseUrl}/rest/api/2/search?jql=ORDER BY created DESC&maxResults=20&fields=key,summary,created,status,priority,description`, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`\n🎉 SUCCESS! Retrieved ${data.issues.length} of ${data.total} total tickets`);
      
      console.log('\n📋 Recent JIRA tickets:');
      data.issues.forEach((ticket: any, i: number) => {
        const created = new Date(ticket.fields.created).toLocaleDateString();
        console.log(`${i+1}. ${ticket.key} - ${ticket.fields.summary.slice(0, 60)}...`);
        console.log(`   Status: ${ticket.fields.status.name} | Created: ${created}`);
      });
      
      // Save working configuration
      const fs = await import('fs');
      fs.writeFileSync('jira-auth-working.json', JSON.stringify({
        method: 'basic_auth',
        username: 'mcarpent',
        baseUrl: baseUrl,
        totalTickets: data.total,
        tested: new Date().toISOString()
      }, null, 2));
      
      console.log('\n💾 Working auth config saved to jira-auth-working.json');
      console.log('🚀 Ready to build full scraper!');
      
      return data.total;
    }
  } catch (error) {
    console.log('❌ Full search error:', error.message);
  }
}

testBasicAuth().catch(console.error);
