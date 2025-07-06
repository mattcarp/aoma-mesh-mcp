#!/usr/bin/env node
/**
 * Test AOMA-Specific MCP Tools
 */

import { SimpleAgentServer } from './simple-agent-server.js';

async function testAomaTools() {
  console.log('🧪 Testing AOMA-Specific MCP Tools...\n');

  const server = new SimpleAgentServer();
  await server.initialize();

  try {
    // Test AOMA UI pattern analysis
    console.log('1. Testing AOMA UI pattern analysis...');
    const uiResult = await server.callTool('analyze_aoma_ui_patterns', {
      query: 'equipment dashboard navigation patterns',
      analysisType: 'components',
      similarity: 0.8
    });
    const uiAnalysis = JSON.parse(uiResult.content[0].text);
    console.log('✅ Found UI patterns:', uiAnalysis.patterns.length);
    console.log('🎨 Pattern types:', uiAnalysis.patterns.map((p: any) => p.type).join(', '));
    console.log('');

    // Test AOMA test generation
    console.log('2. Testing AOMA test generation...');
    const testResult = await server.callTool('generate_aoma_tests', {
      targetUrl: 'https://aoma.gov/equipment',
      testType: 'e2e',
      framework: 'playwright',
      includeAccessibility: true
    });
    const testSuite = JSON.parse(testResult.content[0].text);
    console.log('✅ Generated tests:', testSuite.generatedTests.length);
    console.log('♿ Accessibility tests:', testSuite.accessibilityTests.length);
    console.log('');

    // Test AOMA knowledge query
    console.log('3. Testing AOMA knowledge query...');
    const knowledgeResult = await server.callTool('query_aoma_knowledge', {
      query: 'equipment maintenance scheduling procedures',
      knowledgeType: 'procedures',
      maxResults: 3
    });
    const knowledge = JSON.parse(knowledgeResult.content[0].text);
    console.log('✅ Knowledge results:', knowledge.results.length);
    console.log('📚 Knowledge types:', knowledge.results.map((r: any) => r.type).join(', '));
    console.log('');

    // Test AOMA performance analysis
    console.log('4. Testing AOMA performance analysis...');
    const perfResult = await server.callTool('analyze_aoma_performance', {
      targetPage: '/dashboard/equipment',
      metrics: ['load-time', 'interactive-time', 'largest-contentful-paint'],
      includeOptimizations: true
    });
    const performance = JSON.parse(perfResult.content[0].text);
    console.log('✅ Performance metrics analyzed:', Object.keys(performance.analysis).length);
    console.log('🚀 Optimization suggestions:', performance.optimizations.length);
    console.log('');

    // Test AOMA improvement suggestions
    console.log('5. Testing AOMA improvement suggestions...');
    const improvementResult = await server.callTool('suggest_aoma_improvements', {
      area: 'workflow',
      priority: 'high',
      includeImplementation: true
    });
    const improvements = JSON.parse(improvementResult.content[0].text);
    console.log('✅ Improvement suggestions:', improvements.suggestions.length);
    console.log('💡 Categories:', improvements.suggestions.map((s: any) => s.category).join(', '));
    console.log('');

    console.log('🎉 All AOMA tools tested successfully!\n');
    
    console.log('🔧 AOMA-Specific Capabilities:');
    console.log('   • UI pattern analysis for government operations interface');
    console.log('   • Automated test generation for critical operational workflows');
    console.log('   • Knowledge base querying for procedures and troubleshooting');
    console.log('   • Performance analysis with optimization recommendations');
    console.log('   • Operational improvement suggestions with implementation plans\n');
    
    console.log('🏛️ AOMA Development Context:');
    console.log('   • Mission-critical operations management system');
    console.log('   • Equipment maintenance and monitoring workflows');
    console.log('   • Government compliance and accessibility requirements');
    console.log('   • Field operator mobile interface optimization');
    console.log('   • Real-time equipment status and alerting systems\n');

    console.log('🚀 Ready for AOMA Development Workflows!');

  } catch (error) {
    console.error('❌ AOMA tool test failed:', error);
    process.exit(1);
  }
}

testAomaTools().catch(console.error);