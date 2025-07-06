#!/usr/bin/env tsx
/**
 * Test BETABASE Database Search Capabilities
 */

import { createClient } from '@supabase/supabase-js';

async function testBetabaseSearch() {
  console.log('🔍 Testing BETABASE database search capabilities...\n');

  // BETABASE credentials
  const betabaseClient = createClient(
    'https://swwosfnstfzpwadizhhf.supabase.co',
    process.env.BETABASE_ANON_KEY!
  );

  // Try to find any accessible tables
  const tableNames = [
    'documents', 
    'embeddings', 
    'content', 
    'wiki_content', 
    'knowledge_base', 
    'betabase_content',
    'pages',
    'articles',
    'posts',
    'data'
  ];

  let foundTables = 0;

  for (const tableName of tableNames) {
    try {
      const { data, error } = await betabaseClient.from(tableName).select('*').limit(3);
      
      if (!error && data && data.length > 0) {
        console.log(`✅ Found accessible table: ${tableName}`);
        console.log(`   Sample records: ${data.length}`);
        console.log(`   Columns: ${Object.keys(data[0]).join(', ')}`);
        
        // Get total count
        try {
          const { count } = await betabaseClient.from(tableName).select('*', { count: 'exact', head: true });
          console.log(`   Total records: ${count}`);
        } catch (countError) {
          console.log(`   Count unavailable`);
        }
        
        // Show sample data
        console.log(`   Sample record:`, JSON.stringify(data[0], null, 2));
        console.log();
        foundTables++;
      }
    } catch (e) {
      // Silently continue - table doesn't exist or no access
    }
  }

  if (foundTables === 0) {
    console.log('❌ No accessible tables found in BETABASE');
    console.log('This could mean:');
    console.log('1. API key has limited permissions');
    console.log('2. Tables use different naming conventions');
    console.log('3. Data is in a different schema');
  } else {
    console.log(`✅ Found ${foundTables} accessible tables in BETABASE`);
    console.log('💡 The MCP server could potentially search these tables too');
  }
}

testBetabaseSearch().catch(console.error);