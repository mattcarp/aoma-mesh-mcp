#!/usr/bin/env tsx

/**
 * AOMA Mesh MCP Server Smoke Test
 * 
 * Quick validation that the basic server functionality works.
 */

import { SimpleAgentServer } from './src/simple-agent-server.js';

async function runSmokeTest() {
  console.log('🔥 AOMA Mesh MCP Server - Smoke Test');
  console.log('=====================================\n');

  try {
    // Initialize server
    console.log('⏳ Initializing server...');
    const server = new SimpleAgentServer();
    await server.initialize();
    console.log('✅ Server initialized successfully\n');

    // Check tool definitions
    console.log('⏳ Checking tool definitions...');
    const tools = server.getToolDefinitions();
    console.log(`✅ Found ${tools.length} tools`);
    console.log(`   Tools: ${tools.slice(0, 5).map(t => t.name).join(', ')}${tools.length > 5 ? '...' : ''}\n`);

    // Check resource definitions
    console.log('⏳ Checking resource definitions...');
    const resources = server.getResourceTemplates();
    console.log(`✅ Found ${resources.length} resources`);
    console.log(`   Resources: ${resources.map(r => r.uri).join(', ')}\n`);

    // Test basic tool call
    console.log('⏳ Testing basic tool call (create_coordinator_agent)...');
    const result = await server.callTool('create_coordinator_agent', {
      taskDescription: 'Smoke test agent'
    });
    
    const response = JSON.parse(result.content[0].text);
    console.log(`✅ Agent created: ${response.agentId}`);
    console.log(`   Status: ${response.status}\n`);

    // Test resource reading
    console.log('⏳ Testing resource reading...');
    const resourceResult = await server.readResource('agent://instances');
    const resourceContent = JSON.parse(resourceResult.contents[0].text);
    console.log(`✅ Resource read successful`);
    console.log(`   Active agents: ${resourceContent.totalCount}\n`);

    // Test another tool
    console.log('⏳ Testing code analysis tool...');
    const analysisResult = await server.callTool('analyze_code_quality', {
      filePath: './package.json',
      metrics: ['complexity']
    });
    console.log('✅ Code analysis tool executed successfully\n');

    console.log('🎉 SMOKE TEST PASSED!');
    console.log('=====================================');
    console.log('✅ Server initialization: WORKING');
    console.log('✅ Tool definitions: WORKING');
    console.log('✅ Resource definitions: WORKING');
    console.log('✅ Agent creation: WORKING');
    console.log('✅ Resource reading: WORKING');
    console.log('✅ Tool execution: WORKING');
    console.log('=====================================');
    console.log('🚀 AOMA Mesh MCP Server is functional!\n');

  } catch (error) {
    console.error('❌ SMOKE TEST FAILED!');
    console.error('=====================================');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the smoke test
runSmokeTest();
