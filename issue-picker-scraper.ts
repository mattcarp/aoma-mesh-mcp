#!/usr/bin/env tsx
/**
 * Use the working issue picker API to find and scrape tickets
 */

import { chromium } from 'playwright';

async function issuePickerScraper() {
  console.log('🎯 Using issue picker API to find tickets...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Navigate to Issue Navigator to get proper session
    await page.goto('https://jira.smedigitalapps.com/jira/secure/IssueNavigator.jspa');
    await page.waitForTimeout(3000);
    
    console.log('✅ On Issue Navigator page');
    
    // Extract cookies
    const cookies = await page.context().cookies();
    const cookieHeader = cookies
      .filter(c => c.domain.includes('smedigitalapps.com'))
      .map(c => `${c.name}=${c.value}`)
      .join('; ');
    
    // Try different issue picker queries to find tickets
    const searchTerms = [
      'ITSM',
      'TK',
      'PROJ',
      'DEV',
      'BUG',
      'REQ',
      '', // Empty query
      'A', // Single letter
      '2024',
      '2025'
    ];
    
    let foundTickets = [];
    
    for (const term of searchTerms) {
      console.log(`\n🔍 Searching for: "${term}"`);
      
      try {
        const response = await fetch(`https://jira.smedigitalapps.com/jira/rest/api/2/issue/picker?query=${encodeURIComponent(term)}&currentJQL=&showSubTasks=true&showSubTaskParent=true`, {
          headers: {
            'Cookie': cookieHeader,
            'Accept': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log(`   📊 Response sections: ${data.sections?.length || 0}`);
          
          if (data.sections) {
            for (const section of data.sections) {
              console.log(`   📋 Section "${section.label}": ${section.issues?.length || 0} issues`);
              
              if (section.issues && section.issues.length > 0) {
                section.issues.forEach((issue: any) => {
                  console.log(`     - ${issue.key}: ${issue.summaryText.slice(0, 50)}...`);
                  foundTickets.push({
                    key: issue.key,
                    summary: issue.summaryText,
                    img: issue.img
                  });
                });
              }
            }
          }
        } else {
          console.log(`   ❌ Failed: ${response.status}`);
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Remove duplicates
    const uniqueTickets = foundTickets.filter((ticket, index, self) => 
      index === self.findIndex(t => t.key === ticket.key)
    );
    
    console.log(`\n🎉 Found ${uniqueTickets.length} unique tickets via issue picker!`);
    
    if (uniqueTickets.length > 0) {
      console.log('\n📋 Sample tickets found:');
      uniqueTickets.slice(0, 10).forEach((ticket, i) => {
        console.log(`   ${i+1}. ${ticket.key}: ${ticket.summary.slice(0, 60)}...`);
      });
      
      // Now try to get full details for these tickets
      console.log('\n🔍 Getting full ticket details...');
      
      const detailedTickets = [];
      
      for (let i = 0; i < Math.min(uniqueTickets.length, 5); i++) {
        const ticket = uniqueTickets[i];
        
        try {
          const response = await fetch(`https://jira.smedigitalapps.com/jira/rest/api/2/issue/${ticket.key}?fields=key,summary,description,created,updated,status,priority,project`, {
            headers: {
              'Cookie': cookieHeader,
              'Accept': 'application/json'
            }
          });
          
          if (response.ok) {
            const fullTicket = await response.json();
            console.log(`   ✅ ${fullTicket.key}: Full details retrieved`);
            detailedTickets.push(fullTicket);
          } else {
            console.log(`   ❌ ${ticket.key}: ${response.status}`);
          }
        } catch (error) {
          console.log(`   ❌ ${ticket.key}: ${error.message}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      if (detailedTickets.length > 0) {
        console.log('\n🎉 SUCCESS! Retrieved full ticket details:');
        detailedTickets.forEach((ticket, i) => {
          console.log(`   ${i+1}. ${ticket.key}: ${ticket.fields.summary}`);
          console.log(`      Project: ${ticket.fields.project.key}`);
          console.log(`      Status: ${ticket.fields.status.name}`);
          console.log(`      Created: ${ticket.fields.created.slice(0, 10)}`);
        });
        
        // Extract project keys for broader searches
        const projectKeys = [...new Set(detailedTickets.map(t => t.fields.project.key))];
        console.log(`\n📊 Found projects: ${projectKeys.join(', ')}`);
        
        // Try project-based searches
        for (const projectKey of projectKeys) {
          console.log(`\n🔍 Searching project ${projectKey}...`);
          
          try {
            const response = await fetch(`https://jira.smedigitalapps.com/jira/rest/api/2/search?jql=project=${projectKey} ORDER BY created DESC&maxResults=10&fields=key,summary,created`, {
              headers: {
                'Cookie': cookieHeader,
                'Accept': 'application/json'
              }
            });
            
            if (response.ok) {
              const data = await response.json();
              console.log(`   🎉 Project ${projectKey}: ${data.total} total tickets!`);
              
              if (data.total > 0) {
                console.log('   📋 Recent tickets:');
                data.issues.slice(0, 5).forEach((ticket: any, i: number) => {
                  console.log(`     ${i+1}. ${ticket.key}: ${ticket.fields.summary.slice(0, 50)}...`);
                });
                
                // Save working configuration
                const fs = await import('fs');
                fs.writeFileSync('jira-project-access.json', JSON.stringify({
                  cookieHeader,
                  workingProject: projectKey,
                  totalTickets: data.total,
                  sampleTickets: data.issues.slice(0, 5),
                  allProjects: projectKeys,
                  timestamp: new Date().toISOString()
                }, null, 2));
                
                console.log(`\n💾 Working project access saved!`);
                console.log(`🚀 Found ${data.total} tickets in project ${projectKey}!`);
                break;
              }
            }
          } catch (error) {
            console.log(`   ❌ Project search error: ${error.message}`);
          }
        }
      }
    } else {
      console.log('❌ No tickets found via issue picker');
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  } finally {
    console.log('\n⏳ Keeping browser open for inspection...');
    setTimeout(async () => {
      await browser.close();
    }, 15000);
  }
}

issuePickerScraper().catch(console.error);
