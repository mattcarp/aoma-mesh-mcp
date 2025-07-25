#!/usr/bin/env tsx

import { SimpleAgentServer } from './src/simple-agent-server.js';

async function demonstrateAomaCapabilities() {
  console.log('🎯 AOMA Mesh MCP Server - Real Capabilities Demonstration');
  console.log('='.repeat(80));

  const server = new SimpleAgentServer();
  await server.initialize();

  // 1. Show available tools
  console.log('\n📋 AVAILABLE TOOLS:');
  const tools = server.getToolDefinitions();
  tools.forEach((tool, i) => {
    console.log(`${String(i + 1).padStart(2)}. ${tool.name}`);
    console.log(`     ${tool.description}`);
  });

  // 2. Test AOMA Knowledge Query
  console.log('\n🧠 AOMA KNOWLEDGE QUERY TEST:');
  console.log('Query: "asset management workflows and procedures"');
  const knowledgeResult = await server.callTool('query_aoma_knowledge', {
    query: 'asset management workflows and procedures',
    knowledgeType: 'procedures',
    maxResults: 3
  });
  const knowledgeData = JSON.parse(knowledgeResult.content[0].text);
  console.log('Results:');
  knowledgeData.results.forEach((result: any, i: number) => {
    console.log(`  ${i + 1}. ${result.title} (${result.type})`);
    console.log(`     Source: ${result.source} | Relevance: ${result.relevance}`);
    console.log(`     Content: ${result.content.substring(0, 100)}...`);
  });

  // 3. Test AOMA UI Analysis
  console.log('\n🎨 AOMA UI PATTERN ANALYSIS:');
  console.log('Query: "navigation components and login forms"');
  const uiResult = await server.callTool('analyze_aoma_ui_patterns', {
    query: 'navigation components and login forms',
    analysisType: 'components',
    similarity: 0.7
  });
  const uiData = JSON.parse(uiResult.content[0].text);
  console.log(`Found ${uiData.patterns.length} UI patterns:`);
  uiData.patterns.forEach((pattern: any, i: number) => {
    console.log(`  ${i + 1}. ${pattern.component} (${pattern.type})`);
    console.log(`     Usage: ${pattern.usage}`);
    console.log(`     Accessibility: ${pattern.accessibility}`);
  });

  // 4. Test AOMA Test Generation
  console.log('\n🧪 AOMA TEST GENERATION:');
  console.log('Target: AOMA login page');
  const testResult = await server.callTool('generate_aoma_tests', {
    targetUrl: 'https://aoma.sonymusic.com/login',
    testType: 'e2e',
    framework: 'playwright',
    includeAccessibility: true
  });
  const testData = JSON.parse(testResult.content[0].text);
  console.log(`Generated ${testData.generatedTests.length} test cases:`);
  testData.generatedTests.forEach((test: any, i: number) => {
    console.log(`  ${i + 1}. ${test.name} (${test.priority})`);
    console.log(`     ${test.description}`);
  });

  // 5. Test AOMA Performance Analysis
  console.log('\n⚡ AOMA PERFORMANCE ANALYSIS:');
  console.log('Target: /dashboard page');
  const perfResult = await server.callTool('analyze_aoma_performance', {
    targetPage: '/dashboard',
    metrics: ['load-time', 'interactive-time'],
    includeOptimizations: true
  });
  const perfData = JSON.parse(perfResult.content[0].text);
  console.log('Performance metrics:');
  Object.entries(perfData.analysis.metrics).forEach(([metric, data]: [string, any]) => {
    console.log(`  ${metric}: ${data.value}${data.unit} (${data.rating})`);
  });
  console.log(`\nOptimization suggestions: ${perfData.optimizations.length} found`);

  // 6. Test AOMA Improvements
  console.log('\n🚀 AOMA IMPROVEMENT SUGGESTIONS:');
  console.log('Focus area: performance');
  const improvementResult = await server.callTool('suggest_aoma_improvements', {
    area: 'performance',
    priority: 'high',
    includeImplementation: true
  });
  const improvementData = JSON.parse(improvementResult.content[0].text);
  console.log(`Found ${improvementData.improvementsFound} improvements:`);
  improvementData.improvements.forEach((improvement: any, i: number) => {
    console.log(`  ${i + 1}. ${improvement.title} (${improvement.priority})`);
    console.log(`     ${improvement.description}`);
    if (improvement.implementation) {
      console.log(`     Estimated time: ${improvement.implementation.estimatedTime}`);
    }
  });

  // 7. Test Agent Creation
  console.log('\n🤖 AGENT CREATION TEST:');
  const agentResult = await server.callTool('create_coordinator_agent', {
    taskDescription: 'Analyze AOMA codebase for security vulnerabilities',
    metadata: { priority: 'high', domain: 'security' }
  });
  const agentData = JSON.parse(agentResult.content[0].text);
  console.log(`Agent created: ${agentData.agentId}`);
  console.log(`Status: ${agentData.status}`);
  console.log(`Task: ${agentData.taskDescription}`);

  console.log('\n' + '='.repeat(80));
  console.log('🎯 SUMMARY: AOMA MCP Server provides:');
  console.log('✅ Knowledge base querying (procedures, troubleshooting, best practices)');
  console.log('✅ UI pattern analysis (navigation, forms, data display)');
  console.log('✅ Automated test generation (E2E, accessibility)');
  console.log('✅ Performance analysis and optimization suggestions');
  console.log('✅ AOMA-specific improvement recommendations');
  console.log('✅ Agent coordination and task management');
  console.log('✅ Development workflow optimization');
  console.log('='.repeat(80));
}

demonstrateAomaCapabilities().catch(console.error);
