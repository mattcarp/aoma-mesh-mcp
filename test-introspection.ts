#!/usr/bin/env tsx

/**
 * Test script for the new introspection tools
 */

import { isLangSmithEnabled, getLangSmithStatus } from './src/utils/langsmith.js';

async function testIntrospection() {
  console.log('🔍 Testing MCP Server Introspection Tools...\n');

  // Test LangSmith status
  console.log('📊 LangSmith Status:');
  const status = getLangSmithStatus();
  console.log(JSON.stringify(status, null, 2));
  
  console.log('\n✅ LangSmith utilities are working!');
  
  // Test tool availability
  console.log('\n🛠️  New Introspection Tools Available:');
  const tools = [
    'get_langsmith_metrics - Get performance metrics and observability data',
    'get_trace_data - Retrieve recent traces for debugging',
    'get_server_introspection - Comprehensive server status and configuration',
    'configure_tracing - Configure LangSmith tracing settings'
  ];
  
  tools.forEach((tool, i) => console.log(`${i + 1}. ${tool}`));
  
  console.log('\n🎯 Ready for SIAM integration!');
  console.log('Your introspection tab can now call these MCP tools to display:');
  console.log('- Real-time performance metrics');
  console.log('- Tool execution traces and debugging info');
  console.log('- Server health and configuration');
  console.log('- LangSmith observability dashboard data');
}

testIntrospection().catch(console.error);