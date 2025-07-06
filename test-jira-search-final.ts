#!/usr/bin/env tsx
/**
 * Final Test of Jira Search Functionality
 */

import { config } from 'dotenv';
config({ path: '../.env.local' });

async function testJiraSearch() {
  console.log('🧪 Final Test: Jira Search Functionality');
  console.log('=========================================\n');

  try {
    // Test 1: Import Enhanced Jira Agent
    console.log('1. Testing Enhanced Jira Agent import...');
    const { EnhancedJiraAgent } = await import('../src/lib/agents/langgraph/enhanced-jira-agent.js');
    console.log('✅ Enhanced Jira Agent imported successfully\n');

    // Test 2: Initialize the agent
    console.log('2. Initializing Enhanced Jira Agent...');
    const jiraAgent = new EnhancedJiraAgent({
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4o',
      temperature: 0.2
    });
    console.log('✅ Agent initialized\n');

    // Test 3: Test Supabase connection
    console.log('3. Testing Supabase connection...');
    const supabaseClient = await jiraAgent.getSupabaseClient();
    console.log('✅ Supabase client obtained\n');

    // Test 4: Test basic table access
    console.log('4. Testing jira_ticket_embeddings table access...');
    const { data: tableData, error: tableError } = await supabaseClient
      .from('jira_ticket_embeddings')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.log('❌ Table access error:', tableError);
      return;
    }
    
    console.log('✅ Table accessible');
    console.log('   Sample record columns:', Object.keys(tableData[0]).join(', '));
    console.log();

    // Test 5: Get record count
    console.log('5. Getting record count...');
    const { count, error: countError } = await supabaseClient
      .from('jira_ticket_embeddings')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.log('❌ Count error:', countError);
    } else {
      console.log(`✅ Total records: ${count}`);
      if (count && count > 5000) {
        console.log('🎯 Perfect! This matches your ~6000 records');
      }
    }
    console.log();

    // Test 6: Test the agent's processQuery method
    console.log('6. Testing Enhanced Jira Agent query processing...');
    const result = await jiraAgent.processQuery('find authentication related tickets');
    
    console.log('Query result:');
    console.log('- Success:', result.success);
    console.log('- Response:', result.response?.slice(0, 200) + '...');
    console.log('- Tickets found:', result.tickets?.length || 0);
    
    if (result.error) {
      console.log('- Error:', result.error);
    }
    
    console.log('\n🎉 FINAL STATUS:');
    if (result.success) {
      console.log('✅ Jira search is WORKING!');
      console.log('✅ MCP server should now have functional Jira search');
    } else {
      console.log('❌ Jira search has issues that need fixing');
      console.log('   Error:', result.error);
    }

  } catch (error) {
    console.log('❌ Test failed:', error);
    console.log('Stack:', error.stack);
  }
}

testJiraSearch().catch(console.error);