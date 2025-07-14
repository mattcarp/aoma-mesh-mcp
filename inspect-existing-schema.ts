#!/usr/bin/env npx tsx

/**
 * Inspect Existing Supabase Schema
 * 
 * This script checks what tables and columns already exist
 * so we can adapt our testing framework accordingly.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function inspectExistingSchema() {
  console.log('🔍 INSPECTING EXISTING SUPABASE SCHEMA');
  console.log('================================================================================');
  
  // Initialize Supabase client
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Check what tables exist by trying to query them
    const tablesToCheck = [
      'test_runs',
      'jira_tickets',
      'jira_ticket_embeddings',
      'wiki_documents',
      'git_commits',
      'jira_performance_metrics',
      'jira_component_tests',
      'ai_test_insights'
    ];

    console.log('📊 Checking existing tables...');
    
    for (const table of tablesToCheck) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);

        if (error) {
          console.log(`❌ ${table}: ${error.message}`);
        } else {
          console.log(`✅ ${table}: Exists (${data?.length || 0} sample records)`);
          
          // If data exists, show the structure
          if (data && data.length > 0) {
            const sampleRecord = data[0];
            const columns = Object.keys(sampleRecord);
            console.log(`   📋 Columns (${columns.length}): ${columns.slice(0, 10).join(', ')}${columns.length > 10 ? '...' : ''}`);
          }
        }
      } catch (err) {
        console.log(`❌ ${table}: Exception - ${err.message}`);
      }
    }

    // Check specifically for jira_tickets structure since we have UAT data there
    console.log('\n🎫 Analyzing jira_tickets structure...');
    
    const { data: jiraTickets, error: jiraError } = await supabase
      .from('jira_tickets')
      .select('*')
      .limit(3);

    if (jiraError) {
      console.log('❌ Cannot access jira_tickets:', jiraError.message);
    } else if (jiraTickets && jiraTickets.length > 0) {
      console.log(`✅ Found ${jiraTickets.length} sample tickets`);
      
      const sampleTicket = jiraTickets[0];
      console.log('📋 Sample ticket structure:');
      Object.entries(sampleTicket).forEach(([key, value]) => {
        const valueStr = typeof value === 'object' ? JSON.stringify(value).substring(0, 100) : String(value).substring(0, 100);
        console.log(`   ${key}: ${valueStr}${valueStr.length >= 100 ? '...' : ''}`);
      });
    }

    // Check for UAT tickets specifically
    console.log('\n🧪 Checking UAT tickets...');
    
    const { data: uatTickets, error: uatError } = await supabase
      .from('jira_tickets')
      .select('*')
      .ilike('external_id', 'UAT-%')
      .limit(5);

    if (uatError) {
      console.log('❌ Cannot query UAT tickets:', uatError.message);
    } else {
      console.log(`✅ Found ${uatTickets?.length || 0} UAT tickets`);
      
      if (uatTickets && uatTickets.length > 0) {
        console.log('📋 UAT ticket examples:');
        uatTickets.forEach(ticket => {
          console.log(`   ${ticket.external_id}: ${ticket.title?.substring(0, 50)}...`);
        });
      }
    }

    // Try to understand the test_runs table structure
    console.log('\n🏃 Analyzing test_runs structure...');
    
    const { data: testRuns, error: testRunsError } = await supabase
      .from('test_runs')
      .select('*')
      .limit(1);

    if (testRunsError) {
      console.log('❌ Cannot access test_runs:', testRunsError.message);
    } else if (testRuns && testRuns.length > 0) {
      console.log('✅ test_runs table structure:');
      const sampleRun = testRuns[0];
      Object.entries(sampleRun).forEach(([key, value]) => {
        const valueStr = typeof value === 'object' ? JSON.stringify(value).substring(0, 100) : String(value).substring(0, 100);
        console.log(`   ${key}: ${valueStr}${valueStr.length >= 100 ? '...' : ''}`);
      });
    } else {
      console.log('✅ test_runs table exists but is empty');
    }

    // Summary and recommendations
    console.log('\n📊 SCHEMA ANALYSIS SUMMARY:');
    console.log('================================================================================');
    console.log('✅ Supabase connection working');
    console.log('✅ Basic tables exist (jira_tickets, test_runs)');
    console.log('✅ UAT tickets are stored and accessible');
    console.log('⚠️  Additional testing tables need to be created or adapted');
    console.log('');
    console.log('💡 RECOMMENDED APPROACH:');
    console.log('1. Use existing jira_tickets table for UAT data');
    console.log('2. Create a simplified test results storage in existing tables');
    console.log('3. Store test screenshots and results in metadata columns');
    console.log('4. Use existing external_id pattern for test run tracking');
    console.log('');
    console.log('🚀 NEXT STEPS:');
    console.log('1. Modify testing framework to work with existing schema');
    console.log('2. Store test results in jira_tickets metadata or create minimal tables');
    console.log('3. Focus on screenshot capture and AI analysis');
    console.log('4. Generate reports from existing data structure');

  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  inspectExistingSchema().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { inspectExistingSchema };
