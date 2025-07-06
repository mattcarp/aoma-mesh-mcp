#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';

async function checkSupabaseStructure() {
  console.log('🔍 CHECKING SUPABASE DATABASE STRUCTURE');
  console.log('='.repeat(80));

  const supabase = createClient(
    'https://kfxetwuuzljhybfgmpuc.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Check available tables
    console.log('\n📋 CHECKING AVAILABLE TABLES:');
    const { data: tables, error: tablesError } = await supabase.rpc('sql', {
      query: `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name LIKE '%jira%' OR table_name LIKE '%wiki%' OR table_name LIKE '%vector%' OR table_name LIKE '%embedding%'
        ORDER BY table_name;
      `
    });

    if (tablesError) {
      console.log('Using alternative method to check tables...');
      // Try direct table access
      const { data: jiraData, error: jiraError } = await supabase
        .from('jira_ticket_embeddings')
        .select('*')
        .limit(1);
      
      if (!jiraError) {
        console.log('✅ jira_ticket_embeddings table exists');
      } else {
        console.log('❌ jira_ticket_embeddings table not found:', jiraError.message);
      }

      const { data: wikiData, error: wikiError } = await supabase
        .from('wiki_documents')
        .select('*')
        .limit(1);
      
      if (!wikiError) {
        console.log('✅ wiki_documents table exists');
      } else {
        console.log('❌ wiki_documents table not found:', wikiError.message);
      }
    } else {
      console.log('Available vector-related tables:');
      tables?.forEach((table: any) => console.log(`- ${table.table_name}`));
    }

    // Check jira_ticket_embeddings structure
    console.log('\n🎫 CHECKING JIRA TICKET EMBEDDINGS STRUCTURE:');
    const { data: jiraStructure, error: jiraStructError } = await supabase
      .from('jira_ticket_embeddings')
      .select('*')
      .limit(1);
    
    if (jiraStructError) {
      console.log('❌ Error accessing jira_ticket_embeddings:', jiraStructError.message);
    } else {
      console.log('✅ jira_ticket_embeddings accessible');
      if (jiraStructure && jiraStructure.length > 0) {
        console.log('Sample record structure:', Object.keys(jiraStructure[0]));
      }
    }

    // Check available functions
    console.log('\n🔧 CHECKING AVAILABLE RPC FUNCTIONS:');
    try {
      // Test match_jira_tickets with dummy data
      const { data: jiraFuncTest, error: jiraFuncError } = await supabase.rpc('match_jira_tickets', {
        query_embedding: new Array(1536).fill(0.1),
        match_threshold: 0.5,
        match_count: 1
      });
      
      if (jiraFuncError) {
        console.log('❌ match_jira_tickets error:', jiraFuncError.message);
        console.log('Error details:', jiraFuncError);
      } else {
        console.log('✅ match_jira_tickets function works');
      }
    } catch (funcError) {
      console.log('❌ Error testing match_jira_tickets:', funcError);
    }

    try {
      // Test match_wiki_documents with dummy data
      const { data: wikiFuncTest, error: wikiFuncError } = await supabase.rpc('match_wiki_documents', {
        query_embedding: new Array(1536).fill(0.1),
        match_threshold: 0.5,
        match_count: 1
      });
      
      if (wikiFuncError) {
        console.log('❌ match_wiki_documents error:', wikiFuncError.message);
      } else {
        console.log('✅ match_wiki_documents function works');
      }
    } catch (funcError) {
      console.log('❌ Error testing match_wiki_documents:', funcError);
    }

    // Check actual data counts
    console.log('\n📊 CHECKING DATA COUNTS:');
    const { count: jiraCount, error: jiraCountError } = await supabase
      .from('jira_ticket_embeddings')
      .select('*', { count: 'exact', head: true });
    
    if (!jiraCountError) {
      console.log(`✅ Jira tickets in database: ${jiraCount}`);
    } else {
      console.log('❌ Error counting jira tickets:', jiraCountError.message);
    }

    const { count: wikiCount, error: wikiCountError } = await supabase
      .from('wiki_documents')
      .select('*', { count: 'exact', head: true });
    
    if (!wikiCountError) {
      console.log(`✅ Wiki documents in database: ${wikiCount}`);
    } else {
      console.log('❌ Error counting wiki documents:', wikiCountError.message);
    }

  } catch (error) {
    console.error('❌ Overall error:', error);
  }

  console.log('\n' + '='.repeat(80));
}

checkSupabaseStructure();
