#!/usr/bin/env tsx
/**
 * Final Test: MCP Server Jira Search
 */

import { config } from 'dotenv';
config({ path: '../.env.local' });

async function testMCPJiraSearch() {
  console.log('🧪 Final Test: MCP Server Jira Search Functionality');
  console.log('====================================================\n');

  try {
    // Import and initialize MCP server
    const { AgentServer } = await import('./src/agent-server.js');
    const server = new AgentServer();
    await server.initialize();
    console.log('✅ MCP Server initialized\n');

    // Test Jira search tool
    console.log('Testing query_jira_tickets tool...');
    const result = await server.callTool('query_jira_tickets', {
      query: 'access digital exchange',
      maxResults: 3
    });

    console.log('MCP Tool Result:');
    console.log('- Is Error:', result.isError || false);
    console.log('- Content Length:', result.content?.[0]?.text?.length || 0);
    
    if (!result.isError && result.content?.[0]?.text) {
      console.log('- Sample Response:', result.content[0].text.slice(0, 200) + '...');
      console.log('\n🎉 SUCCESS: JIRA SEARCH IS WORKING IN MCP SERVER!');
      console.log('✅ The MCP server can now search your 6000+ Jira records!');
    } else {
      console.log('❌ Error in Jira search:', result.content);
    }

    // Test list active agents too
    console.log('\nTesting list_active_agents tool...');
    const agentsResult = await server.callTool('list_active_agents', {});
    console.log('Active agents:', agentsResult.content?.[0]?.text || 'None');

  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

testMCPJiraSearch().catch(console.error);