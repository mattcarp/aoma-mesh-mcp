#!/usr/bin/env tsx
/**
 * Scrape tickets directly from the JIRA dashboard you showed me
 */

import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import OpenAI from 'openai';

config();

async function dashboardScraper() {
  console.log('🎯 Scraping from JIRA dashboard with visible tickets...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Initialize Supabase and OpenAI
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseClient = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
  const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
  
  try {
    // Go to the dashboard where you showed tickets
    console.log('📍 Going to your dashboard...');
    await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
    await page.waitForTimeout(5000);
    
    console.log('🔍 Extracting tickets from dashboard...');
    
    // Extract all ticket data from the page
    const tickets = await page.evaluate(() => {
      const ticketData = [];
      
      // Look for ticket tables and rows
      const rows = document.querySelectorAll('tr');
      
      rows.forEach(row => {
        // Look for ticket key in the row
        const keyCell = row.querySelector('td, th');
        const summaryCell = row.querySelector('td:nth-child(2), td:nth-child(3)');
        
        if (keyCell && summaryCell) {
          const keyText = keyCell.textContent?.trim();
          const summaryText = summaryCell.textContent?.trim();
          
          // Check if this looks like a ticket key (PROJECT-NUMBER format)
          if (keyText && keyText.match(/^[A-Z]+-\d+$/)) {
            ticketData.push({
              key: keyText,
              summary: summaryText || '',
              rawRow: row.textContent?.trim()
            });
          }
        }
        
        // Also look for ticket links
        const ticketLinks = row.querySelectorAll('a[href*="browse/"]');
        ticketLinks.forEach(link => {
          const href = link.getAttribute('href');
          const text = link.textContent?.trim();
          
          if (href && text) {
            const keyMatch = href.match(/browse\/([A-Z]+-\d+)/);
            if (keyMatch && !ticketData.find(t => t.key === keyMatch[1])) {
              ticketData.push({
                key: keyMatch[1],
                summary: text,
                url: href
              });
            }
          }
        });
      });
      
      return ticketData;
    });
    
    console.log(`🎉 Found ${tickets.length} tickets on dashboard!`);
    
    if (tickets.length > 0) {
      console.log('📋 Tickets found:');
      tickets.forEach((ticket, i) => {
        console.log(`   ${i+1}. ${ticket.key}: ${ticket.summary.slice(0, 50)}...`);
      });
      
      // Get detailed information for each ticket
      console.log('\n🔍 Getting detailed ticket information...');
      
      let processedCount = 0;
      let storedCount = 0;
      
      for (const ticket of tickets) {
        try {
          console.log(`\n📖 Processing ${ticket.key}...`);
          
          // Go to the ticket detail page
          await page.goto(`https://jirauat.smedigitalapps.com/jira/browse/${ticket.key}`);
          await page.waitForTimeout(2000);
          
          // Extract detailed ticket information
          const details = await page.evaluate(() => {
            const getSafeText = (selectors: string[]) => {
              for (const selector of selectors) {
                const element = document.querySelector(selector);
                if (element?.textContent?.trim()) {
                  return element.textContent.trim();
                }
              }
              return '';
            };
            
            const getSafeHtml = (selectors: string[]) => {
              for (const selector of selectors) {
                const element = document.querySelector(selector);
                if (element?.innerHTML?.trim()) {
                  return element.innerHTML.trim();
                }
              }
              return '';
            };
            
            return {
              summary: getSafeText(['#summary-val', 'h1', '.issue-header h1', '[data-testid="issue.views.issue-base.foundation.summary.heading"]']),
              description: getSafeText(['#description-val', '.description .user-content', '.issue-body-content']),
              status: getSafeText(['#status-val', '.issue-status', '[data-testid="issue.views.field.status.common.ui.status-lozenge.status-lozenge"]']),
              priority: getSafeText(['#priority-val', '.priority', '[data-testid="issue.views.field.priority.common.ui.priority-lozenge.priority-lozenge"]']),
              assignee: getSafeText(['#assignee-val', '.assignee', '[data-testid="issue.views.field.assignee.common.ui.assignee-field.assignee-field"]']),
              reporter: getSafeText(['#reporter-val', '.reporter']),
              created: getSafeText(['#created-val', '.created', '[data-testid="issue.views.field.created.common.ui.created-field.created-field"]']),
              updated: getSafeText(['#updated-val', '.updated', '[data-testid="issue.views.field.updated.common.ui.updated-field.updated-field"]']),
              project: getSafeText(['#project-name-val', '.project', '[data-testid="issue.views.field.project.common.ui.project-field.project-field"]']),
              issueType: getSafeText(['#type-val', '.issuetype', '[data-testid="issue.views.field.issuetype.common.ui.issuetype-field.issuetype-field"]'])
            };
          });
          
          if (details.summary) {
            console.log(`   ✅ ${ticket.key}: ${details.summary.slice(0, 60)}...`);
            console.log(`      Status: ${details.status} | Project: ${details.project} | Created: ${details.created.slice(0, 10)}`);
            
            // Store in Supabase if available
            if (supabaseClient) {
              const stored = await storeTicket(supabaseClient, openai, ticket.key, details);
              if (stored) {
                storedCount++;
                console.log(`      💾 Stored in Supabase`);
              }
            }
            
            processedCount++;
          } else {
            console.log(`   ❌ ${ticket.key}: Could not extract details`);
          }
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          console.log(`   ❌ ${ticket.key}: ${error.message}`);
        }
      }
      
      console.log(`\n🎉 SCRAPING COMPLETE!`);
      console.log(`   Found: ${tickets.length} tickets`);
      console.log(`   Processed: ${processedCount} tickets`);
      console.log(`   Stored: ${storedCount} tickets`);
      
      // Save results
      const fs = await import('fs');
      fs.writeFileSync('jira-dashboard-scrape.json', JSON.stringify({
        totalFound: tickets.length,
        totalProcessed: processedCount,
        totalStored: storedCount,
        tickets: tickets,
        timestamp: new Date().toISOString()
      }, null, 2));
      
      console.log(`💾 Results saved to jira-dashboard-scrape.json`);
      
    } else {
      console.log('❌ No tickets found on dashboard');
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

async function storeTicket(supabaseClient: any, openai: any, key: string, details: any): Promise<boolean> {
  try {
    // Prepare ticket data
    const ticketData = {
      external_id: key,
      title: details.summary,
      description: details.description || '',
      status: details.status || 'Unknown',
      priority: details.priority || 'Unknown',
      metadata: {
        project: details.project,
        issue_type: details.issueType,
        assignee: details.assignee,
        reporter: details.reporter,
        scraped_at: new Date().toISOString()
      },
      created_at: details.created ? new Date(details.created).toISOString() : new Date().toISOString(),
      updated_at: details.updated ? new Date(details.updated).toISOString() : new Date().toISOString()
    };

    // Store in jira_tickets table
    const { error: ticketError } = await supabaseClient
      .from('jira_tickets')
      .upsert(ticketData, { onConflict: 'external_id' });

    if (ticketError) {
      console.log(`      ❌ Ticket storage error: ${ticketError.message}`);
      return false;
    }

    // Generate embedding if OpenAI available
    if (openai) {
      const textForEmbedding = `${details.summary} ${details.description || ''}`.trim();
      
      if (textForEmbedding) {
        const embedding = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: textForEmbedding
        });

        const embeddingData = {
          ticket_key: key,
          summary: details.summary,
          embedding: embedding.data[0].embedding,
          metadata: {
            ...ticketData.metadata,
            description: details.description,
            embedding_generated_at: new Date().toISOString()
          },
          created_at: ticketData.created_at,
          updated_at: ticketData.updated_at
        };

        const { error: embeddingError } = await supabaseClient
          .from('jira_ticket_embeddings')
          .upsert(embeddingData, { onConflict: 'ticket_key' });

        if (embeddingError) {
          console.log(`      ⚠️ Embedding error: ${embeddingError.message}`);
        }
      }
    }

    return true;
  } catch (error) {
    console.log(`      ❌ Storage error: ${error.message}`);
    return false;
  }
}

dashboardScraper().catch(console.error);
