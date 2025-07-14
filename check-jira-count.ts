#!/usr/bin/env tsx
/**
 * Check JIRA ticket count in Supabase
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

async function checkJiraCount() {
  console.log('🔍 Checking JIRA ticket count in Supabase...\n');

  // Try different environment variable names
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ Missing Supabase credentials');
    console.log('Available env vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));
    return;
  }

  console.log(`✅ Using Supabase URL: ${supabaseUrl.slice(0, 50)}...`);
  console.log(`✅ Using Supabase Key: ${supabaseKey.slice(0, 20)}...\n`);

  const client = createClient(supabaseUrl, supabaseKey);

  try {
    // Check jira_ticket_embeddings table
    console.log('1. Checking jira_ticket_embeddings table...');
    const { count: embeddingsCount, error: embeddingsError } = await client
      .from('jira_ticket_embeddings')
      .select('*', { count: 'exact', head: true });

    if (embeddingsError) {
      console.log('❌ Error accessing jira_ticket_embeddings:', embeddingsError.message);
    } else {
      console.log(`✅ jira_ticket_embeddings count: ${embeddingsCount}`);
    }

    // Check jira_tickets table
    console.log('\n2. Checking jira_tickets table...');
    const { count: ticketsCount, error: ticketsError } = await client
      .from('jira_tickets')
      .select('*', { count: 'exact', head: true });

    if (ticketsError) {
      console.log('❌ Error accessing jira_tickets:', ticketsError.message);
    } else {
      console.log(`✅ jira_tickets count: ${ticketsCount}`);
    }

    // Get latest ticket info
    console.log('\n3. Finding latest ticket...');
    const { data: latestData, error: latestError } = await client
      .from('jira_ticket_embeddings')
      .select('ticket_key, summary, metadata')
      .order('created_at', { ascending: false })
      .limit(1);

    if (latestError) {
      console.log('❌ Error getting latest ticket:', latestError.message);
    } else if (latestData && latestData.length > 0) {
      const latest = latestData[0];
      console.log(`✅ Latest ticket: ${latest.ticket_key}`);
      console.log(`   Summary: ${latest.summary}`);
      console.log(`   Metadata:`, latest.metadata);
    }

    // List all tables to see what's available
    console.log('\n4. Available tables with "jira" in name...');
    const { data: tables, error: tablesError } = await client
      .from('information_schema.tables')
      .select('table_name')
      .like('table_name', '%jira%');

    if (tablesError) {
      console.log('❌ Error listing tables:', tablesError.message);
    } else {
      console.log('Tables:', tables?.map(t => t.table_name) || []);
    }

  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

checkJiraCount().catch(console.error);
