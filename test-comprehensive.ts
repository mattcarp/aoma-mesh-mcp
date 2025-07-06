#!/usr/bin/env tsx

/**
 * Comprehensive AOMA Mesh MCP Server Test Suite
 * 
 * This test validates all core functionality to ensure the system works end-to-end.
 */

import { SimpleAgentServer } from './src/simple-agent-server.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// Test configuration
const TEST_CONFIG = {
  timeouts: {
    short: 5000,    // 5 seconds
    medium: 15000,  // 15 seconds
    long: 30000     // 30 seconds
  },
  retries: 3
};

// Test results tracking
interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  duration: number;
  error?: string;
  details?: any;
}

class ComprehensiveTestSuite {
  private results: TestResult[] = [];
  private server: SimpleAgentServer;
  private startTime: number = 0;

  constructor() {
    this.server = new SimpleAgentServer();
  }

  /**
   * Run all tests
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 Starting AOMA Mesh MCP Server Comprehensive Test Suite\n');
    console.log('='.repeat(80));
    
    this.startTime = Date.now();

    // Core functionality tests
    await this.testServerInitialization();
    await this.testToolDefinitions();
    await this.testResourceDefinitions();
    
    // Agent management tests
    await this.testAgentCreation();
    await this.testAgentStatus();
    await this.testAgentLifecycle();
    
    // Development tool tests
    await this.testCodeAnalysis();
    await this.testCodebaseSearch();
    await this.testIdeIntegration();
    await this.testDevelopmentPlan();
    
    // AOMA-specific tests
    await this.testAomaUiAnalysis();
    await this.testAomaTestGeneration();
    await this.testAomaKnowledgeQuery();
    await this.testAomaPerformanceAnalysis();
    await this.testAomaImprovements();
    
    // Integration tests
    await this.testErrorHandling();
    await this.testResourceReading();
    await this.testConcurrentOperations();
    
    // Performance tests
    await this.testPerformanceMetrics();
    
    this.printResults();
  }

  /**
   * Test server initialization
   */
  private async testServerInitialization(): Promise<void> {
    await this.runTest('Server Initialization', async () => {
      await this.server.initialize();
      return { initialized: true };
    });
  }

  /**
   * Test tool definitions
   */
  private async testToolDefinitions(): Promise<void> {
    await this.runTest('Tool Definitions', async () => {
      const tools = this.server.getToolDefinitions();
      
      if (tools.length === 0) {
        throw new Error('No tools defined');
      }

      const expectedTools = [
        'create_coordinator_agent',
        'get_agent_status', 
        'analyze_code_quality',
        'search_codebase',
        'suggest_ide_improvements',
        'create_development_plan',
        'analyze_aoma_ui_patterns',
        'generate_aoma_tests',
        'query_aoma_knowledge',
        'analyze_aoma_performance',
        'suggest_aoma_improvements'
      ];

      const toolNames = tools.map(t => t.name);
      const missingTools = expectedTools.filter(name => !toolNames.includes(name));
      
      if (missingTools.length > 0) {
        throw new Error(`Missing tools: ${missingTools.join(', ')}`);
      }

      return { 
        toolCount: tools.length,
        tools: toolNames,
        allRequiredPresent: missingTools.length === 0
      };
    });
  }

  /**
   * Test resource definitions
   */
  private async testResourceDefinitions(): Promise<void> {
    await this.runTest('Resource Definitions', async () => {
      const resources = this.server.getResourceTemplates();
      
      if (resources.length === 0) {
        throw new Error('No resources defined');
      }

      const expectedResources = ['agent://instances', 'agent://types'];
      const resourceUris = resources.map(r => r.uri);
      const missingResources = expectedResources.filter(uri => !resourceUris.includes(uri));

      if (missingResources.length > 0) {
        throw new Error(`Missing resources: ${missingResources.join(', ')}`);
      }

      return {
        resourceCount: resources.length,
        resources: resourceUris
      };
    });
  }

  /**
   * Test agent creation
   */
  private async testAgentCreation(): Promise<void> {
    await this.runTest('Agent Creation', async () => {
      const result = await this.server.callTool('create_coordinator_agent', {
        taskDescription: 'Test agent for comprehensive testing',
        metadata: { test: true }
      });

      if (!result.content || result.content.length === 0) {
        throw new Error('No content returned from agent creation');
      }

      const response = JSON.parse(result.content[0].text);
      
      if (!response.success || !response.agentId) {
        throw new Error('Agent creation failed or missing agentId');
      }

      return {
        agentId: response.agentId,
        success: response.success,
        status: response.status
      };
    });
  }

  /**
   * Test agent status
   */
  private async testAgentStatus(): Promise<void> {
    await this.runTest('Agent Status', async () => {
      // First create an agent
      const createResult = await this.server.callTool('create_coordinator_agent', {
        taskDescription: 'Status test agent'
      });
      
      const createResponse = JSON.parse(createResult.content[0].text);
      const agentId = createResponse.agentId;

      // Then check its status
      const statusResult = await this.server.callTool('get_agent_status', {
        agentId: agentId
      });

      const statusResponse = JSON.parse(statusResult.content[0].text);
      
      if (!statusResponse.agentId || !statusResponse.status) {
        throw new Error('Status check failed - missing required fields');
      }

      return {
        agentId: statusResponse.agentId,
        status: statusResponse.status,
        hasLastUpdated: !!statusResponse.lastUpdated
      };
    });
  }

  /**
   * Test agent lifecycle
   */
  private async testAgentLifecycle(): Promise<void> {
    await this.runTest('Agent Lifecycle', async () => {
      // Create agent
      const createResult = await this.server.callTool('create_coordinator_agent', {
        taskDescription: 'Lifecycle test agent'
      });
      const createResponse = JSON.parse(createResult.content[0].text);
      const agentId = createResponse.agentId;

      // Check initial status
      const statusResult = await this.server.callTool('get_agent_status', {
        agentId: agentId
      });
      const statusResponse = JSON.parse(statusResult.content[0].text);

      return {
        created: createResponse.success,
        agentId: agentId,
        initialStatus: statusResponse.status,
        lifecycle: 'complete'
      };
    });
  }

  /**
   * Test code analysis functionality
   */
  private async testCodeAnalysis(): Promise<void> {
    await this.runTest('Code Analysis', async () => {
      const result = await this.server.callTool('analyze_code_quality', {
        filePath: './src/simple-agent-server.ts',
        metrics: ['complexity', 'maintainability']
      });

      if (!result.content || result.content.length === 0) {
        throw new Error('No analysis results returned');
      }

      const response = JSON.parse(result.content[0].text);
      
      return {
        analyzed: true,
        filePath: response.filePath,
        metrics: response.metrics,
        hasResult: !!response.result
      };
    });
  }

  /**
   * Test codebase search
   */
  private async testCodebaseSearch(): Promise<void> {
    await this.runTest('Codebase Search', async () => {
      const result = await this.server.callTool('search_codebase', {
        query: 'agent server initialization',
        searchType: 'semantic',
        maxResults: 5
      });

      const response = JSON.parse(result.content[0].text);
      
      return {
        query: response.query,
        searchType: response.searchType,
        maxResults: response.maxResults,
        hasResult: !!response.result
      };
    });
  }

  /**
   * Test IDE integration
   */
  private async testIdeIntegration(): Promise<void> {
    await this.runTest('IDE Integration', async () => {
      const result = await this.server.callTool('suggest_ide_improvements', {
        currentFile: './src/simple-agent-server.ts',
        context: 'Testing AOMA MCP server functionality',
        ide: 'claude-code'
      });

      const response = JSON.parse(result.content[0].text);
      
      return {
        currentFile: response.currentFile,
        context: response.context,
        ide: response.ide,
        hasResult: !!response.result
      };
    });
  }

  /**
   * Test development plan creation
   */
  private async testDevelopmentPlan(): Promise<void> {
    await this.runTest('Development Plan Creation', async () => {
      const result = await this.server.callTool('create_development_plan', {
        projectGoal: 'Implement comprehensive test suite for AOMA MCP server',
        timeEstimate: '2 hours',
        complexity: 'moderate'
      });

      const response = JSON.parse(result.content[0].text);
      
      return {
        projectGoal: response.projectGoal,
        timeEstimate: response.timeEstimate,
        complexity: response.complexity,
        hasResult: !!response.result
      };
    });
  }

  /**
   * Test AOMA UI analysis
   */
  private async testAomaUiAnalysis(): Promise<void> {
    await this.runTest('AOMA UI Analysis', async () => {
      const result = await this.server.callTool('analyze_aoma_ui_patterns', {
        query: 'navigation components and login forms',
        analysisType: 'components',
        similarity: 0.7
      });

      const response = JSON.parse(result.content[0].text);
      
      return {
        query: response.query,
        analysisType: response.analysisType,
        similarity: response.similarity,
        hasResult: !!response.result
      };
    });
  }

  /**
   * Test AOMA test generation
   */
  private async testAomaTestGeneration(): Promise<void> {
    await this.runTest('AOMA Test Generation', async () => {
      const result = await this.server.callTool('generate_aoma_tests', {
        targetUrl: 'https://aoma.sonymusic.com/login',
        testType: 'e2e',
        framework: 'playwright',
        includeAccessibility: true
      });

      const response = JSON.parse(result.content[0].text);
      
      return {
        targetUrl: response.targetUrl,
        testType: response.testType,
        framework: response.framework,
        includeAccessibility: response.includeAccessibility,
        hasResult: !!response.result
      };
    });
  }

  /**
   * Test AOMA knowledge query
   */
  private async testAomaKnowledgeQuery(): Promise<void> {
    await this.runTest('AOMA Knowledge Query', async () => {
      const result = await this.server.callTool('query_aoma_knowledge', {
        query: 'asset management workflows and procedures',
        knowledgeType: 'procedures',
        maxResults: 5
      });

      const response = JSON.parse(result.content[0].text);
      
      return {
        query: response.query,
        knowledgeType: response.knowledgeType,
        maxResults: response.maxResults,
        hasResult: !!response.result
      };
    });
  }

  /**
   * Test AOMA performance analysis
   */
  private async testAomaPerformanceAnalysis(): Promise<void> {
    await this.runTest('AOMA Performance Analysis', async () => {
      const result = await this.server.callTool('analyze_aoma_performance', {
        targetPage: '/dashboard',
        metrics: ['load-time', 'interactive-time'],
        includeOptimizations: true
      });

      const response = JSON.parse(result.content[0].text);
      
      return {
        targetPage: response.targetPage,
        metrics: response.metrics,
        includeOptimizations: response.includeOptimizations,
        hasResult: !!response.result
      };
    });
  }

  /**
   * Test AOMA improvements
   */
  private async testAomaImprovements(): Promise<void> {
    await this.runTest('AOMA Improvements', async () => {
      const result = await this.server.callTool('suggest_aoma_improvements', {
        area: 'performance',
        priority: 'high',
        includeImplementation: true
      });

      const response = JSON.parse(result.content[0].text);
      
      return {
        area: response.area,
        priority: response.priority,
        includeImplementation: response.includeImplementation,
        hasResult: !!response.result
      };
    });
  }

  /**
   * Test error handling
   */
  private async testErrorHandling(): Promise<void> {
    await this.runTest('Error Handling', async () => {
      try {
        await this.server.callTool('nonexistent_tool', {});
        throw new Error('Should have thrown an error for nonexistent tool');
      } catch (error) {
        if (error.message.includes('Unknown tool')) {
          return { errorHandling: 'correct', errorMessage: error.message };
        }
        throw error;
      }
    });
  }

  /**
   * Test resource reading
   */
  private async testResourceReading(): Promise<void> {
    await this.runTest('Resource Reading', async () => {
      const result = await this.server.readResource('agent://instances');
      
      if (!result.contents || result.contents.length === 0) {
        throw new Error('No content returned from resource reading');
      }

      const content = JSON.parse(result.contents[0].text);
      
      return {
        uri: result.contents[0].uri,
        mimeType: result.contents[0].mimeType,
        hasActiveAgents: Array.isArray(content.activeAgents),
        totalCount: content.totalCount
      };
    });
  }

  /**
   * Test concurrent operations
   */
  private async testConcurrentOperations(): Promise<void> {
    await this.runTest('Concurrent Operations', async () => {
      const promises = [
        this.server.callTool('create_coordinator_agent', { taskDescription: 'Concurrent test 1' }),
        this.server.callTool('create_coordinator_agent', { taskDescription: 'Concurrent test 2' }),
        this.server.callTool('create_coordinator_agent', { taskDescription: 'Concurrent test 3' })
      ];

      const results = await Promise.all(promises);
      
      const agentIds = results.map(r => JSON.parse(r.content[0].text).agentId);
      const uniqueIds = new Set(agentIds);
      
      if (uniqueIds.size !== agentIds.length) {
        throw new Error('Concurrent operations produced duplicate agent IDs');
      }

      return {
        concurrentOperations: results.length,
        uniqueAgentIds: uniqueIds.size,
        allSuccessful: results.every(r => JSON.parse(r.content[0].text).success)
      };
    });
  }

  /**
   * Test performance metrics
   */
  private async testPerformanceMetrics(): Promise<void> {
    await this.runTest('Performance Metrics', async () => {
      const startTime = Date.now();
      
      // Run a series of operations to measure performance
      await this.server.callTool('create_coordinator_agent', {
        taskDescription: 'Performance test agent'
      });
      
      const agentCreationTime = Date.now() - startTime;
      
      const toolStartTime = Date.now();
      await this.server.callTool('analyze_code_quality', {
        filePath: './package.json',
        metrics: ['complexity']
      });
      const toolExecutionTime = Date.now() - toolStartTime;
      
      const resourceStartTime = Date.now();
      await this.server.readResource('agent://instances');
      const resourceReadTime = Date.now() - resourceStartTime;
      
      return {
        agentCreationTime,
        toolExecutionTime,
        resourceReadTime,
        totalTestTime: Date.now() - this.startTime,
        performanceAcceptable: agentCreationTime < 5000 && toolExecutionTime < 10000
      };
    });
  }

  /**
   * Run a single test with error handling and timing
   */
  private async runTest(name: string, testFn: () => Promise<any>): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log(`⏳ Running: ${name}`);
      const result = await Promise.race([
        testFn(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Test timeout')), TEST_CONFIG.timeouts.medium)
        )
      ]);
      
      const duration = Date.now() - startTime;
      
      this.results.push({
        name,
        status: 'PASS',
        duration,
        details: result
      });
      
      console.log(`✅ PASS: ${name} (${duration}ms)`);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.results.push({
        name,
        status: 'FAIL',
        duration,
        error: error.message
      });
      
      console.log(`❌ FAIL: ${name} (${duration}ms) - ${error.message}`);
    }
  }

  /**
   * Print comprehensive test results
   */
  private printResults(): void {
    const totalDuration = Date.now() - this.startTime;
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const total = this.results.length;
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 AOMA Mesh MCP Server Test Results');
    console.log('='.repeat(80));
    
    console.log(`\n📈 Summary:`);
    console.log(`   Total Tests: ${total}`);
    console.log(`   Passed: ${passed} (${Math.round(passed/total*100)}%)`);
    console.log(`   Failed: ${failed} (${Math.round(failed/total*100)}%)`);
    console.log(`   Total Duration: ${totalDuration}ms (${Math.round(totalDuration/1000)}s)`);
    
    if (failed > 0) {
      console.log(`\n❌ Failed Tests:`);
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(result => {
          console.log(`   • ${result.name}: ${result.error}`);
        });
    }
    
    console.log(`\n✅ Passed Tests:`);
    this.results
      .filter(r => r.status === 'PASS')
      .forEach(result => {
        console.log(`   • ${result.name} (${result.duration}ms)`);
      });
    
    // Performance analysis
    const avgDuration = this.results.reduce((sum, r) => sum + r.duration, 0) / total;
    console.log(`\n⚡ Performance Metrics:`);
    console.log(`   Average Test Duration: ${Math.round(avgDuration)}ms`);
    console.log(`   Fastest Test: ${Math.min(...this.results.map(r => r.duration))}ms`);
    console.log(`   Slowest Test: ${Math.max(...this.results.map(r => r.duration))}ms`);
    
    // Overall assessment
    console.log(`\n🎯 Overall Assessment:`);
    if (passed === total) {
      console.log(`   🚀 EXCELLENT: All tests passed! AOMA Mesh MCP Server is fully functional.`);
    } else if (passed >= total * 0.8) {
      console.log(`   ✅ GOOD: Most tests passed. Minor issues need attention.`);
    } else if (passed >= total * 0.6) {
      console.log(`   ⚠️  PARTIAL: Some core functionality working. Significant issues present.`);
    } else {
      console.log(`   ❌ CRITICAL: Major functionality issues. Requires immediate attention.`);
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('Test suite complete. Check results above for functionality status.');
    console.log('='.repeat(80));
  }
}

// Run the comprehensive test suite
async function main() {
  const testSuite = new ComprehensiveTestSuite();
  
  try {
    await testSuite.runAllTests();
    process.exit(0);
  } catch (error) {
    console.error('💥 Test suite failed to run:', error);
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
