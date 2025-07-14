#!/usr/bin/env tsx
/**
 * Scrape tickets directly from JIRA web interface HTML
 */

import { chromium } from 'playwright';

async function webInterfaceScraper() {
  console.log('🌐 Scraping tickets from JIRA web interface...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('📍 Going to JIRA dashboard...');
    await page.goto('https://jira.smedigitalapps.com/jira');
    await page.waitForTimeout(3000);
    
    console.log('🔍 Looking for ticket content in the interface...');
    
    // Try to find any ticket references in the current page
    const ticketPatterns = [
      /[A-Z]+-\d+/g,  // Standard JIRA ticket format
      /ITSM-\d+/g,    // ITSM tickets specifically
      /TK-\d+/g       // TK tickets
    ];
    
    const pageContent = await page.content();
    let foundTicketKeys = [];
    
    for (const pattern of ticketPatterns) {
      const matches = pageContent.match(pattern);
      if (matches) {
        foundTicketKeys.push(...matches);
      }
    }
    
    // Remove duplicates
    foundTicketKeys = [...new Set(foundTicketKeys)];
    
    console.log(`📋 Found ${foundTicketKeys.length} ticket references in dashboard:`, foundTicketKeys.slice(0, 10));
    
    // Look for navigation to areas with more tickets
    const navigationTargets = [
      { name: 'Issue Navigator', url: '/secure/IssueNavigator.jspa' },
      { name: 'Search Issues', url: '/secure/IssueNavigator.jspa?mode=hide' },
      { name: 'My Open Issues', url: '/secure/IssueNavigator.jspa?jqlQuery=assignee+%3D+currentUser%28%29+AND+resolution+%3D+Unresolved+ORDER+BY+priority+DESC%2C+created+ASC' },
      { name: 'Recently Viewed', url: '/secure/BrowseProjects.jspa' },
      { name: 'All Issues', url: '/secure/IssueNavigator.jspa?jqlQuery=ORDER+BY+created+DESC' }
    ];
    
    for (const target of navigationTargets) {
      try {
        console.log(`\n🔍 Trying ${target.name}...`);
        
        await page.goto(`https://jira.smedigitalapps.com/jira${target.url}`);
        await page.waitForTimeout(3000);
        
        const title = await page.title();
        console.log(`   📍 Page: ${title}`);
        
        // Look for ticket table or list
        const ticketRows = await page.locator('tr, .issue-row, .issue-table tr').count();
        const ticketLinks = await page.locator('a[href*="browse/"]').count();
        
        console.log(`   📊 Found ${ticketRows} table rows, ${ticketLinks} ticket links`);
        
        if (ticketLinks > 0) {
          console.log('   🎯 Found ticket links! Extracting...');
          
          // Extract ticket data from the page
          const tickets = await page.evaluate(() => {
            const ticketData = [];
            
            // Look for ticket links
            const links = document.querySelectorAll('a[href*="browse/"]');
            links.forEach(link => {
              const href = link.getAttribute('href');
              const text = link.textContent?.trim();
              
              if (href && text) {
                const keyMatch = href.match(/browse\/([A-Z]+-\d+)/);
                if (keyMatch) {
                  ticketData.push({
                    key: keyMatch[1],
                    text: text,
                    url: href
                  });
                }
              }
            });
            
            // Also look for ticket keys in text
            const allText = document.body.textContent || '';
            const keyMatches = allText.match(/[A-Z]+-\d+/g);
            if (keyMatches) {
              keyMatches.forEach(key => {
                if (!ticketData.find(t => t.key === key)) {
                  ticketData.push({
                    key: key,
                    text: 'Found in page text',
                    url: `/browse/${key}`
                  });
                }
              });
            }
            
            return ticketData;
          });
          
          console.log(`   🎉 Extracted ${tickets.length} tickets from page!`);
          
          if (tickets.length > 0) {
            console.log('   📋 Sample tickets:');
            tickets.slice(0, 10).forEach((ticket, i) => {
              console.log(`     ${i+1}. ${ticket.key}: ${ticket.text}`);
            });
            
            // Try to get detailed info for a few tickets by visiting their pages
            console.log('\n🔍 Getting detailed ticket information...');
            
            const detailedTickets = [];
            
            for (let i = 0; i < Math.min(tickets.length, 3); i++) {
              const ticket = tickets[i];
              
              try {
                console.log(`   📖 Getting details for ${ticket.key}...`);
                
                await page.goto(`https://jira.smedigitalapps.com/jira/browse/${ticket.key}`);
                await page.waitForTimeout(2000);
                
                // Extract ticket details from the page
                const details = await page.evaluate(() => {
                  const getSafeText = (selector: string) => {
                    const element = document.querySelector(selector);
                    return element?.textContent?.trim() || '';
                  };
                  
                  return {
                    summary: getSafeText('#summary-val') || getSafeText('h1') || getSafeText('.issue-header-content h1'),
                    status: getSafeText('#status-val') || getSafeText('.issue-status'),
                    assignee: getSafeText('#assignee-val') || getSafeText('.assignee'),
                    priority: getSafeText('#priority-val') || getSafeText('.priority'),
                    description: getSafeText('#description-val') || getSafeText('.description'),
                    created: getSafeText('#created-val') || getSafeText('.created'),
                    updated: getSafeText('#updated-val') || getSafeText('.updated')
                  };
                });
                
                if (details.summary) {
                  console.log(`     ✅ ${ticket.key}: ${details.summary.slice(0, 50)}...`);
                  console.log(`        Status: ${details.status} | Created: ${details.created}`);
                  
                  detailedTickets.push({
                    key: ticket.key,
                    ...details
                  });
                } else {
                  console.log(`     ❌ ${ticket.key}: Could not extract details`);
                }
                
              } catch (error) {
                console.log(`     ❌ ${ticket.key}: ${error.message}`);
              }
            }
            
            if (detailedTickets.length > 0) {
              console.log(`\n🎉 SUCCESS! Web interface scraping worked!`);
              console.log(`Found ${tickets.length} tickets, got details for ${detailedTickets.length}`);
              
              // Save the working approach
              const fs = await import('fs');
              fs.writeFileSync('jira-web-scraping.json', JSON.stringify({
                method: 'web_interface_scraping',
                workingUrl: target.url,
                totalTicketsFound: tickets.length,
                detailedTickets: detailedTickets,
                allTicketKeys: tickets.map(t => t.key),
                timestamp: new Date().toISOString()
              }, null, 2));
              
              console.log('💾 Web scraping results saved to jira-web-scraping.json');
              console.log('🚀 This approach can be scaled to scrape all tickets!');
              break;
            }
          }
        }
        
        // Look for search forms or filters we can use
        const searchForms = await page.locator('form, #jqltext, .search-input').count();
        if (searchForms > 0) {
          console.log(`   🔍 Found ${searchForms} search forms - could try automated searching`);
        }
        
      } catch (error) {
        console.log(`   ❌ ${target.name} error: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  } finally {
    console.log('\n⏳ Browser staying open for inspection...');
    setTimeout(async () => {
      await browser.close();
    }, 20000);
  }
}

webInterfaceScraper().catch(console.error);
