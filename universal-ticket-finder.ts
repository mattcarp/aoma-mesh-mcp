#!/usr/bin/env tsx
/**
 * Universal ticket finder - finds tickets on any JIRA page
 */

import { chromium } from 'playwright';

async function universalTicketFinder() {
  console.log('🔍 Universal JIRA ticket finder...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Go to your dashboard
    await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
    await page.waitForTimeout(5000);
    
    console.log('📖 Page loaded, analyzing content...');
    
    // Comprehensive ticket extraction
    const allTickets = await page.evaluate(() => {
      const tickets = new Set();
      
      // Method 1: Look for ticket patterns in all text
      const allText = document.body.textContent || '';
      const ticketMatches = allText.match(/[A-Z]{2,}-\d+/g);
      if (ticketMatches) {
        ticketMatches.forEach(key => tickets.add(key));
      }
      
      // Method 2: Look for ticket links
      document.querySelectorAll('a').forEach(link => {
        const href = link.getAttribute('href') || '';
        const text = link.textContent || '';
        
        if (href.includes('browse/')) {
          const keyMatch = href.match(/browse\/([A-Z]+-\d+)/);
          if (keyMatch) tickets.add(keyMatch[1]);
        }
        
        if (text.match(/^[A-Z]+-\d+$/)) {
          tickets.add(text);
        }
      });
      
      // Method 3: Look in specific elements that might contain tickets
      const selectors = [
        'td', 'th', '.issue-key', '.issue-link', '.issuekey', 
        '[data-issue-key]', '.issue-table td', '.issue-list li'
      ];
      
      selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(element => {
          const text = element.textContent?.trim() || '';
          if (text.match(/^[A-Z]+-\d+$/)) {
            tickets.add(text);
          }
        });
      });
      
      // Method 4: Look for data attributes
      document.querySelectorAll('[data-issue-key], [data-key], [issue-key]').forEach(element => {
        const key = element.getAttribute('data-issue-key') || 
                   element.getAttribute('data-key') || 
                   element.getAttribute('issue-key');
        if (key && key.match(/^[A-Z]+-\d+$/)) {
          tickets.add(key);
        }
      });
      
      return Array.from(tickets);
    });
    
    console.log(`🎯 Found ${allTickets.length} unique tickets:`, allTickets);
    
    if (allTickets.length === 0) {
      console.log('\n🔍 No tickets found, trying navigation...');
      
      // Try clicking on different areas that might show tickets
      const navigationTargets = [
        'text=Issues',
        'text=Projects', 
        'text=Assigned to Me',
        'text=My Open Issues',
        'a[href*="Navigator"]',
        'a[href*="search"]'
      ];
      
      for (const target of navigationTargets) {
        try {
          console.log(`   Trying: ${target}`);
          
          const element = page.locator(target);
          const count = await element.count();
          
          if (count > 0) {
            await element.first().click();
            await page.waitForTimeout(3000);
            
            // Check for tickets again
            const newTickets = await page.evaluate(() => {
              const tickets = new Set();
              const allText = document.body.textContent || '';
              const matches = allText.match(/[A-Z]{2,}-\d+/g);
              if (matches) matches.forEach(key => tickets.add(key));
              return Array.from(tickets);
            });
            
            if (newTickets.length > 0) {
              console.log(`   ✅ Found ${newTickets.length} tickets after clicking ${target}`);
              allTickets.push(...newTickets);
              break;
            }
          }
        } catch (error) {
          console.log(`   ❌ ${target}: ${error.message}`);
        }
      }
    }
    
    // Remove duplicates
    const uniqueTickets = [...new Set(allTickets)];
    
    if (uniqueTickets.length > 0) {
      console.log(`\n🎉 Total unique tickets found: ${uniqueTickets.length}`);
      console.log('📋 Ticket list:', uniqueTickets.slice(0, 20));
      
      // Test accessing a few tickets
      console.log('\n🔍 Testing ticket access...');
      
      const testedTickets = [];
      
      for (let i = 0; i < Math.min(uniqueTickets.length, 5); i++) {
        const ticketKey = uniqueTickets[i];
        
        try {
          console.log(`   📖 Testing ${ticketKey}...`);
          
          await page.goto(`https://jirauat.smedigitalapps.com/jira/browse/${ticketKey}`);
          await page.waitForTimeout(2000);
          
          const pageTitle = await page.title();
          
          if (!pageTitle.includes('Error') && !pageTitle.includes('Not Found')) {
            console.log(`   ✅ ${ticketKey}: Accessible - ${pageTitle}`);
            
            // Extract basic info
            const info = await page.evaluate(() => {
              const getSafeText = (selectors: string[]) => {
                for (const selector of selectors) {
                  const element = document.querySelector(selector);
                  if (element?.textContent?.trim()) {
                    return element.textContent.trim();
                  }
                }
                return '';
              };
              
              return {
                summary: getSafeText(['#summary-val', 'h1', '.issue-header h1']),
                status: getSafeText(['#status-val', '.issue-status']),
                assignee: getSafeText(['#assignee-val', '.assignee']),
                project: getSafeText(['#project-name-val', '.project'])
              };
            });
            
            if (info.summary) {
              console.log(`      Summary: ${info.summary.slice(0, 50)}...`);
              console.log(`      Status: ${info.status} | Project: ${info.project}`);
              
              testedTickets.push({
                key: ticketKey,
                ...info
              });
            }
          } else {
            console.log(`   ❌ ${ticketKey}: Not accessible`);
          }
          
        } catch (error) {
          console.log(`   ❌ ${ticketKey}: ${error.message}`);
        }
      }
      
      if (testedTickets.length > 0) {
        console.log(`\n🎉 SUCCESS! Found ${testedTickets.length} accessible tickets`);
        
        // Save the working ticket list
        const fs = await import('fs');
        fs.writeFileSync('found-tickets.json', JSON.stringify({
          totalFound: uniqueTickets.length,
          accessibleTickets: testedTickets,
          allTicketKeys: uniqueTickets,
          timestamp: new Date().toISOString()
        }, null, 2));
        
        console.log('💾 Ticket list saved to found-tickets.json');
        console.log('🚀 Ready to scrape all accessible tickets!');
        
        // Show which projects we found
        const projects = [...new Set(testedTickets.map(t => t.project).filter(Boolean))];
        console.log(`📊 Projects found: ${projects.join(', ')}`);
        
      } else {
        console.log('❌ No accessible tickets found');
      }
      
    } else {
      console.log('❌ No tickets found anywhere on the page');
      
      // Take a screenshot for debugging
      await page.screenshot({ path: 'jira-no-tickets.png' });
      console.log('📸 Screenshot saved as jira-no-tickets.png');
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

universalTicketFinder().catch(console.error);
