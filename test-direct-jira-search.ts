#!/usr/bin/env tsx
/**
 * Test Direct Jira Search
 */

import { createClient } from '@supabase/supabase-js';

const client = createClient(
  'https://kfxetwuuzljhybfgmpuc.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function testDirectJiraSearch() {
  console.log('🔍 Testing direct Jira search...\n');

  // Test 1: Search for "digital exchange"
  console.log('1. Testing search for "digital exchange":');
  try {
    const { data, error } = await client
      .from('jira_ticket_embeddings')
      .select('ticket_key, summary, metadata')
      .or('summary.ilike.%digital%,summary.ilike.%exchange%')
      .limit(5);
    
    if (error) {
      console.log('❌ Error:', error);
    } else {
      console.log(`✅ Found ${data?.length || 0} tickets:`);
      data?.forEach((ticket, i) => {
        console.log(`   ${i+1}. ${ticket.ticket_key}: ${ticket.summary}`);
      });
    }
  } catch (err) {
    console.log('❌ Exception:', err.message);
  }

  console.log();

  // Test 2: Search for "access"
  console.log('2. Testing search for "access":');
  try {
    const { data, error } = await client
      .from('jira_ticket_embeddings')
      .select('ticket_key, summary, metadata')
      .ilike('summary', '%access%')
      .limit(5);
    
    if (error) {
      console.log('❌ Error:', error);
    } else {
      console.log(`✅ Found ${data?.length || 0} tickets:`);
      data?.forEach((ticket, i) => {
        console.log(`   ${i+1}. ${ticket.ticket_key}: ${ticket.summary}`);
      });
    }
  } catch (err) {
    console.log('❌ Exception:', err.message);
  }

  console.log();

  // Test 3: Get total count
  console.log('3. Getting total record count:');
  try {
    const { count, error } = await client
      .from('jira_ticket_embeddings')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log('❌ Error:', error);
    } else {
      console.log(`✅ Total Jira records: ${count}`);
      if (count && count > 5000) {
        console.log('🎯 Confirmed: This is your database with ~6000 records!');
      }
    }
  } catch (err) {
    console.log('❌ Exception:', err.message);
  }
}

testDirectJiraSearch().catch(console.error);