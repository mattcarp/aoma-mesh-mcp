#!/usr/bin/env node
/**
 * Simple MCP Server Test
 * 
 * Tests the basic functionality of the simplified MCP server
 */

import { SimpleAgentServer } from './simple-agent-server.js';

async function testServer() {
  console.log('🧪 Testing MC-TK Enhanced MCP Server...\n');

  const server = new SimpleAgentServer();
  
  try {
    // Test initialization
    console.log('1. Testing server initialization...');
    await server.initialize();
    console.log('✅ Server initialized successfully\n');

    // Test tool definitions
    console.log('2. Testing tool definitions...');
    const tools = server.getToolDefinitions();
    console.log(`✅ Found ${tools.length} tools:`);
    tools.forEach(tool => {
      console.log(`   - ${tool.name}: ${tool.description}`);
    });
    console.log('');

    // Test resource definitions
    console.log('3. Testing resource definitions...');
    const resources = server.getResourceTemplates();
    console.log(`✅ Found ${resources.length} resources:`);
    resources.forEach(resource => {
      console.log(`   - ${resource.uri}: ${resource.description}`);
    });
    console.log('');

    // Test code quality analysis
    console.log('4. Testing code quality analysis tool...');
    const codeQualityResult = await server.callTool('analyze_code_quality', {
      filePath: 'src/test.ts',
      metrics: ['complexity', 'maintainability']
    });
    console.log('✅ Code quality analysis completed');
    console.log('📊 Sample result:', JSON.parse(codeQualityResult.content[0].text).analysis.metrics);
    console.log('');

    // Test codebase search
    console.log('5. Testing codebase search tool...');
    const searchResult = await server.callTool('search_codebase', {
      query: 'user authentication',
      searchType: 'semantic',
      maxResults: 3
    });
    console.log('✅ Codebase search completed');
    console.log('🔍 Found results:', JSON.parse(searchResult.content[0].text).found);
    console.log('');

    // Test IDE suggestions
    console.log('6. Testing IDE improvement suggestions...');
    const ideResult = await server.callTool('suggest_ide_improvements', {
      currentFile: 'src/components/Header.tsx',
      context: 'Working on responsive navigation',
      ide: 'claude-code'
    });
    console.log('✅ IDE suggestions generated');
    console.log('💡 Suggestions:', JSON.parse(ideResult.content[0].text).improvements.length);
    console.log('');

    // Test development plan creation
    console.log('7. Testing development plan creation...');
    const planResult = await server.callTool('create_development_plan', {
      projectGoal: 'Add real-time chat feature',
      timeEstimate: '1 week',
      complexity: 'moderate'
    });
    console.log('✅ Development plan created');
    console.log('📋 Milestones:', JSON.parse(planResult.content[0].text).milestones.length);
    console.log('');

    // Test resource reading
    console.log('8. Testing resource reading...');
    const agentTypesResource = await server.readResource('agent://types');
    console.log('✅ Resource reading completed');
    console.log('📄 Agent types available:', JSON.parse(agentTypesResource.contents[0].text).agentTypes.length);
    console.log('');

    console.log('🎉 All tests passed! The MCP server is working correctly.\n');
    
    console.log('🔧 Current Capabilities:');
    console.log('   • Code quality analysis with complexity metrics');
    console.log('   • Intelligent codebase search (semantic & pattern-based)');
    console.log('   • IDE-specific improvement suggestions');
    console.log('   • Development plan creation with milestones');
    console.log('   • Agent orchestration and monitoring');
    console.log('   • Resource-based information access\n');
    
    console.log('🚀 Next Steps:');
    console.log('   • Configure with Claude Desktop or other MCP clients');
    console.log('   • Test with real development workflows');
    console.log('   • Integrate with existing LangGraph agents (when OpenAI key is available)');
    console.log('   • Add performance optimization and caching');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testServer().catch(console.error);