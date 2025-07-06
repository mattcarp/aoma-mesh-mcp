#!/usr/bin/env tsx

/**
 * Test script for the MC-TK Agent MCP Server
 * 
 * This script validates that the MCP server can be initialized
 * and that all tools are properly registered.
 */

import { AgentServer } from './agent-server.js';
import { setupEnvironment } from './utils/environment.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../.env.local' });
dotenv.config({ path: '../.env' });

async function testServer() {
  console.log('🧪 Testing MC-TK Agent MCP Server...\n');

  try {
    // Setup environment
    console.log('1. Setting up environment...');
    await setupEnvironment();
    console.log('✅ Environment setup successful\n');

    // Initialize server
    console.log('2. Initializing agent server...');
    const server = new AgentServer();
    await server.initialize();
    console.log('✅ Agent server initialized\n');

    // Test tool definitions
    console.log('3. Testing tool definitions...');
    const tools = server.getToolDefinitions();
    console.log(`✅ Found ${tools.length} tools:`);
    tools.forEach(tool => {
      console.log(`   - ${tool.name}: ${tool.description}`);
    });
    console.log('');

    // Test resource definitions
    console.log('4. Testing resource definitions...');
    const resources = server.getResourceDefinitions();
    console.log(`✅ Found ${resources.length} resources:`);
    resources.forEach(resource => {
      console.log(`   - ${resource.uri}: ${resource.name}`);
    });
    console.log('');

    // Test reading a basic resource
    console.log('5. Testing resource reading...');
    const agentTypesResource = await server.readResource('agent://types');
    console.log('✅ Successfully read agent types resource');
    const agentTypes = JSON.parse(agentTypesResource.contents[0].text!);
    console.log(`   Found ${agentTypes.agentTypes.length} agent types\n`);

    // Test listing active agents (should be empty initially)
    console.log('6. Testing list active agents tool...');
    const listResult = await server.callTool('list_active_agents', { includeCompleted: false });
    console.log('✅ Successfully called list_active_agents tool');
    const activeAgents = JSON.parse(listResult.content[0].text!);
    console.log(`   Active agents: ${activeAgents.totalCount}\n`);

    console.log('🎉 All tests passed! MCP server is ready to use.');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
if (import.meta.url === `file://${process.argv[1]}`) {
  testServer().catch((error) => {
    console.error('Failed to run tests:', error);
    process.exit(1);
  });
}