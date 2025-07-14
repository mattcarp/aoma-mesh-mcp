#!/usr/bin/env tsx
/**
 * JIRA Ticket Scraper - Fetch tickets from JIRA API and store in Supabase
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import OpenAI from 'openai';

// Load environment variables
config();

interface JiraTicket {
  key: string;
  fields: {
    summary: string;
    description?: string;
    status?: {
      name: string;
    };
    priority?: {
      name: string;
    };
    created: string;
    updated: string;
    project: {
      key: string;
    };
    issuetype: {
      name: string;
    };
  };
}

interface JiraSearchResponse {
  issues: JiraTicket[];
  total: number;
  startAt: number;
  maxResults: number;
}

class JiraScraper {
  private supabaseClient: any;
  private openai: OpenAI;
  private jiraBaseUrl: string;
  private jiraAuth: string;

  constructor() {
    // Initialize Supabase
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials');
    }
    
    this.supabaseClient = createClient(supabaseUrl, supabaseKey);

    // Initialize OpenAI for embeddings
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('Missing OpenAI API key');
    }
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Initialize JIRA credentials
    this.jiraBaseUrl = process.env.JIRA_BASE_URL || 'https://jira.smedigitalapps.com';
    
    const jiraUsername = process.env.JIRA_USERNAME || process.env.JIRA_EMAIL;
    const jiraPassword = process.env.JIRA_PASSWORD;
    
    if (!jiraUsername || !jiraPassword) {
      throw new Error('Missing JIRA credentials (JIRA_USERNAME/JIRA_EMAIL and JIRA_PASSWORD)');
    }
    
    // Create basic auth header for username:password
    this.jiraAuth = Buffer.from(`${jiraUsername}:${jiraPassword}`).toString('base64');
  }

  /**
   * Test JIRA connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.jiraBaseUrl}/rest/api/2/myself`, {
        headers: {
          'Authorization': `Basic ${this.jiraAuth}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        console.log(`❌ JIRA connection failed: ${response.status} ${response.statusText}`);
        return false;
      }

      const user = await response.json();
      console.log(`✅ JIRA connection successful - logged in as: ${user.displayName} (${user.emailAddress})`);
      return true;
    } catch (error) {
      console.log(`❌ JIRA connection error:`, error.message);
      return false;
    }
  }

  /**
   * Get the latest ticket key from Supabase to determine where to start scraping
   */
  async getLatestTicketKey(): Promise<string | null> {
    try {
      const { data, error } = await this.supabaseClient
        .from('jira_tickets')
        .select('external_id')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.log('❌ Error getting latest ticket:', error.message);
        return null;
      }

      return data && data.length > 0 ? data[0].external_id : null;
    } catch (error) {
      console.log('❌ Error getting latest ticket:', error.message);
      return null;
    }
  }

  /**
   * Search JIRA tickets using JQL
   */
  async searchTickets(jql: string, startAt: number = 0, maxResults: number = 50): Promise<JiraSearchResponse | null> {
    try {
      const url = new URL(`${this.jiraBaseUrl}/rest/api/2/search`);
      url.searchParams.set('jql', jql);
      url.searchParams.set('startAt', startAt.toString());
      url.searchParams.set('maxResults', maxResults.toString());
      url.searchParams.set('fields', 'summary,description,status,priority,created,updated,project,issuetype');

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Basic ${this.jiraAuth}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        console.log(`❌ JIRA search failed: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        console.log('Error details:', errorText);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.log(`❌ JIRA search error:`, error.message);
      return null;
    }
  }

  /**
   * Generate embedding for ticket content
   */
  async generateEmbedding(text: string): Promise<number[] | null> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
        encoding_format: 'float'
      });

      return response.data[0].embedding;
    } catch (error) {
      console.log(`❌ Error generating embedding:`, error.message);
      return null;
    }
  }

  /**
   * Store ticket in Supabase (both tables)
   */
  async storeTicket(ticket: JiraTicket): Promise<boolean> {
    try {
      const ticketData = {
        external_id: ticket.key,
        title: ticket.fields.summary,
        description: ticket.fields.description || '',
        status: ticket.fields.status?.name || 'Unknown',
        priority: ticket.fields.priority?.name || 'Unknown',
        metadata: {
          project_key: ticket.fields.project.key,
          issue_type: ticket.fields.issuetype.name,
          scraped_at: new Date().toISOString()
        },
        created_at: new Date(ticket.fields.created).toISOString(),
        updated_at: new Date(ticket.fields.updated).toISOString()
      };

      // Insert into jira_tickets table (with upsert)
      const { error: ticketError } = await this.supabaseClient
        .from('jira_tickets')
        .upsert(ticketData, { onConflict: 'external_id' });

      if (ticketError) {
        console.log(`❌ Error storing ticket ${ticket.key}:`, ticketError.message);
        return false;
      }

      // Generate embedding and store in jira_ticket_embeddings
      const textForEmbedding = `${ticket.fields.summary} ${ticket.fields.description || ''}`.trim();
      
      if (textForEmbedding) {
        const embedding = await this.generateEmbedding(textForEmbedding);
        
        if (embedding) {
          const embeddingData = {
            ticket_key: ticket.key,
            summary: ticket.fields.summary,
            embedding: embedding,
            metadata: {
              ...ticketData.metadata,
              description: ticket.fields.description,
              status: ticket.fields.status?.name,
              priority: ticket.fields.priority?.name,
              embedding_generated_at: new Date().toISOString()
            },
            created_at: ticketData.created_at,
            updated_at: ticketData.updated_at
          };

          const { error: embeddingError } = await this.supabaseClient
            .from('jira_ticket_embeddings')
            .upsert(embeddingData, { onConflict: 'ticket_key' });

          if (embeddingError) {
            console.log(`❌ Error storing embedding for ${ticket.key}:`, embeddingError.message);
            // Continue anyway - we got the ticket stored
          }
        }
      }

      return true;
    } catch (error) {
      console.log(`❌ Error storing ticket ${ticket.key}:`, error.message);
      return false;
    }
  }

  /**
   * Run incremental scrape starting from latest ticket
   */
  async runIncrementalScrape(maxTickets: number = 500): Promise<void> {
    console.log('🔄 Starting incremental JIRA scrape...\n');

    // Test connection first
    const connected = await this.testConnection();
    if (!connected) {
      console.log('❌ Cannot connect to JIRA. Check VPN and credentials.');
      return;
    }

    // Get latest ticket to determine starting point
    const latestTicket = await this.getLatestTicketKey();
    console.log(`📊 Latest ticket in database: ${latestTicket || 'None'}\n`);

    // Build JQL query for newer tickets
    let jql = 'ORDER BY created DESC';
    
    if (latestTicket) {
      // Extract ticket number for comparison (assuming format like ITSM-55362)
      const latestNumber = parseInt(latestTicket.split('-')[1]);
      if (!isNaN(latestNumber)) {
        jql = `key > ${latestTicket} ORDER BY created DESC`;
      }
    }

    console.log(`🔍 JQL Query: ${jql}\n`);

    let startAt = 0;
    let totalProcessed = 0;
    const batchSize = 50;

    while (totalProcessed < maxTickets) {
      console.log(`📥 Fetching batch ${Math.floor(startAt / batchSize) + 1} (starting at ${startAt})...`);

      const searchResult = await this.searchTickets(jql, startAt, batchSize);
      
      if (!searchResult || !searchResult.issues.length) {
        console.log('✅ No more tickets to process');
        break;
      }

      console.log(`   Found ${searchResult.issues.length} tickets (${searchResult.total} total available)`);

      // Process tickets in this batch
      for (const ticket of searchResult.issues) {
        const success = await this.storeTicket(ticket);
        if (success) {
          console.log(`   ✅ Stored ${ticket.key}: ${ticket.fields.summary.slice(0, 60)}...`);
          totalProcessed++;
        } else {
          console.log(`   ❌ Failed to store ${ticket.key}`);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Check if we've reached the end
      if (searchResult.issues.length < batchSize) {
        console.log('✅ Reached end of available tickets');
        break;
      }

      startAt += batchSize;
    }

    console.log(`\n🎉 Incremental scrape completed! Processed ${totalProcessed} tickets.`);
  }

  /**
   * Run full scrape (careful - this will process many tickets)
   */
  async runFullScrape(maxTickets: number = 1000): Promise<void> {
    console.log('🔄 Starting full JIRA scrape...\n');
    console.log('⚠️  WARNING: This will process up to', maxTickets, 'tickets');

    const jql = 'ORDER BY created DESC';
    await this.runScrapeWithJQL(jql, maxTickets);
  }

  /**
   * Helper method to run scrape with custom JQL
   */
  private async runScrapeWithJQL(jql: string, maxTickets: number): Promise<void> {
    const connected = await this.testConnection();
    if (!connected) {
      console.log('❌ Cannot connect to JIRA. Check VPN and credentials.');
      return;
    }

    console.log(`🔍 JQL Query: ${jql}\n`);

    let startAt = 0;
    let totalProcessed = 0;
    const batchSize = 50;

    while (totalProcessed < maxTickets) {
      console.log(`📥 Fetching batch ${Math.floor(startAt / batchSize) + 1} (starting at ${startAt})...`);

      const searchResult = await this.searchTickets(jql, startAt, batchSize);
      
      if (!searchResult || !searchResult.issues.length) {
        console.log('✅ No more tickets to process');
        break;
      }

      console.log(`   Found ${searchResult.issues.length} tickets (${searchResult.total} total available)`);

      for (const ticket of searchResult.issues) {
        const success = await this.storeTicket(ticket);
        if (success) {
          console.log(`   ✅ Stored ${ticket.key}: ${ticket.fields.summary.slice(0, 60)}...`);
          totalProcessed++;
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (searchResult.issues.length < batchSize) {
        break;
      }

      startAt += batchSize;
    }

    console.log(`\n🎉 Scrape completed! Processed ${totalProcessed} tickets.`);
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'incremental';
  const maxTickets = parseInt(args[1]) || 500;

  const scraper = new JiraScraper();

  try {
    switch (command) {
      case 'test':
        console.log('🧪 Testing JIRA connection...');
        await scraper.testConnection();
        break;
      
      case 'incremental':
        await scraper.runIncrementalScrape(maxTickets);
        break;
      
      case 'full':
        await scraper.runFullScrape(maxTickets);
        break;
      
      default:
        console.log('Usage: npx tsx jira-scraper.ts [test|incremental|full] [maxTickets]');
        console.log('  test        - Test JIRA connection');
        console.log('  incremental - Scrape tickets newer than latest in DB (default)');
        console.log('  full        - Scrape recent tickets (use with caution)');
        break;
    }
  } catch (error) {
    console.log('❌ Scraper error:', error.message);
  }
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  main().catch(console.error);
}

export { JiraScraper };
