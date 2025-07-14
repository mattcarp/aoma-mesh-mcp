#!/usr/bin/env tsx
/**
 * Check the actual schema of jira_ticket_embeddings table
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

async function checkSchema() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const client = createClient(supabaseUrl, supabaseKey);

  // Get a sample record to see the schema
  const { data: sample, error } = await client
    .from('jira_ticket_embeddings')
    .select('*')
    .limit(1);

  if (error) {
    console.log('❌ Error:', error.message);
    return;
  }

  if (sample && sample.length > 0) {
    console.log('✅ jira_ticket_embeddings table columns:');
    console.log(Object.keys(sample[0]));
    console.log('\n✅ Sample record:');
    console.log(JSON.stringify(sample[0], null, 2));
  }

  // Also check jira_tickets table
  const { data: ticketsSample, error: ticketsError } = await client
    .from('jira_tickets')
    .select('*')
    .limit(1);

  if (ticketsError) {
    console.log('❌ Error checking jira_tickets:', ticketsError.message);
    return;
  }

  if (ticketsSample && ticketsSample.length > 0) {
    console.log('\n✅ jira_tickets table columns:');
    console.log(Object.keys(ticketsSample[0]));
  }
}

checkSchema().catch(console.error);
