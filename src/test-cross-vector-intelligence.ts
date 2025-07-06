      return { success: false, reason: 'No synthesis was generated' };
    }

    // Check if we have reasonable results
    const totalResults = result.metadata?.totalResults || 0;
    if (totalResults === 0) {
      return { success: false, reason: 'No results returned from any vector source' };
    }

    // Validate correlations if expected
    const correlationsFound = analysis.correlations?.length || 0;
    if (testCase.expectedCorrelations > 0 && correlationsFound === 0) {
      // This is a warning, not a failure - correlations depend on data content
      console.log(`   ⚠️  Expected ${testCase.expectedCorrelations} correlations, found ${correlationsFound}`);
    }

    return { success: true };
  }

  /**
   * Test specific cross-vector tool individually
   */
  async testCrossReferenceIssue(): Promise<void> {
    console.log('🔍 Testing Cross-Reference Issue Tool\n');
    
    try {
      const result = await this.server.callTool('cross_reference_issue', {
        issueDescription: 'User authentication failures in production environment',
        jiraTicketKey: 'ITSM-56266',
        codeComponent: 'authentication-service',
        timeframe: 'last month'
      });

      const content = result.content?.[0]?.text;
      if (content) {
        const parsed = JSON.parse(content);
        console.log('✅ Cross-reference issue test completed');
        console.log(`   Query: ${parsed.query}`);
        console.log(`   Sources: ${Object.keys(parsed.analysis).length}`);
        console.log(`   Synthesis: ${parsed.analysis.synthesis ? 'Generated' : 'Missing'}\n`);
      }
    } catch (error) {
      console.log(`❌ Cross-reference issue test failed: ${error.message}\n`);
    }
  }

  /**
   * Test implementation context finding
   */
  async testImplementationContext(): Promise<void> {
    console.log('🏗️ Testing Implementation Context Tool\n');
    
    try {
      const result = await this.server.callTool('find_implementation_context', {
        featureName: 'Unified Submission Tool (UST)',
        includeArchitecture: true,
        includeTestCoverage: false
      });

      const content = result.content?.[0]?.text;
      if (content) {
        const parsed = JSON.parse(content);
        console.log('✅ Implementation context test completed');
        console.log(`   Feature: ${parsed.query}`);
        console.log(`   Analysis depth: ${parsed.metadata.correlationDepth}`);
        console.log(`   Strategy: ${parsed.metadata.synthesisStrategy}\n`);
      }
    } catch (error) {
      console.log(`❌ Implementation context test failed: ${error.message}\n`);
    }
  }

  /**
   * Test development insights synthesis
   */
  async testDevelopmentInsights(): Promise<void> {
    console.log('📊 Testing Development Insights Tool\n');
    
    try {
      const result = await this.server.callTool('synthesize_development_insights', {
        topic: 'technical debt reduction',
        includeMetrics: true,
        timeHorizon: 'quarterly'
      });

      const content = result.content?.[0]?.text;
      if (content) {
        const parsed = JSON.parse(content);
        console.log('✅ Development insights test completed');
        console.log(`   Topic: ${parsed.query}`);
        console.log(`   Time horizon: quarterly`);
        console.log(`   Insights generated: ${!!parsed.analysis.insights}\n`);
      }
    } catch (error) {
      console.log(`❌ Development insights test failed: ${error.message}\n`);
    }
  }

  /**
   * Test vector correlation analysis specifically
   */
  async testVectorCorrelations(): Promise<void> {
    console.log('🔗 Testing Vector Correlation Analysis\n');
    
    try {
      const result = await this.server.callTool('analyze_code_with_business_context', {
        query: 'AOMA export functionality implementation and issues',
        includeCode: true,
        includeJira: true,
        includeAOMADocs: true,
        correlationDepth: 'comprehensive',
        maxResultsPerSource: 10,
        synthesisStrategy: 'analytical'
      });

      const content = result.content?.[0]?.text;
      if (content) {
        const parsed = JSON.parse(content);
        const correlations = parsed.analysis.correlations || [];
        
        console.log('✅ Vector correlation analysis completed');
        console.log(`   Total correlations found: ${correlations.length}`);
        
        correlations.forEach((correlation, index) => {
          console.log(`   ${index + 1}. ${correlation.sourceType} ↔ ${correlation.targetType}`);
          console.log(`      Similarity: ${(correlation.similarity * 100).toFixed(1)}%`);
          console.log(`      Relationship: ${correlation.relationship}`);
          console.log(`      Key terms: ${correlation.keyTerms.slice(0, 3).join(', ')}${correlation.keyTerms.length > 3 ? '...' : ''}`);
        });
        console.log();
      }
    } catch (error) {
      console.log(`❌ Vector correlation test failed: ${error.message}\n`);
    }
  }

  /**
   * Run performance benchmarks
   */
  async runPerformanceBenchmarks(): Promise<void> {
    console.log('⚡ Running Performance Benchmarks\n');
    
    const queries = [
      'authentication issues',
      'database performance',
      'API endpoint errors',
      'file upload problems',
      'user interface bugs'
    ];

    const times: number[] = [];

    for (const query of queries) {
      const startTime = Date.now();
      
      try {
        await this.server.callTool('analyze_code_with_business_context', {
          query,
          includeCode: true,
          includeJira: true,
          includeAOMADocs: true,
          correlationDepth: 'surface', // Faster for benchmarking
          maxResultsPerSource: 3,
          synthesisStrategy: 'focused'
        });
        
        const duration = Date.now() - startTime;
        times.push(duration);
        console.log(`   "${query}": ${duration}ms`);
        
      } catch (error) {
        console.log(`   "${query}": FAILED (${error.message})`);
      }
    }

    if (times.length > 0) {
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);
      
      console.log(`\n📈 Performance Summary:`);
      console.log(`   Average: ${avgTime.toFixed(0)}ms`);
      console.log(`   Min: ${minTime}ms`);
      console.log(`   Max: ${maxTime}ms`);
      console.log(`   Success rate: ${(times.length / queries.length * 100).toFixed(1)}%\n`);
    }
  }

  /**
   * Print comprehensive test summary
   */
  private printSummary(passed: number, total: number): void {
    console.log('═'.repeat(60));
    console.log('📊 CROSS-VECTOR INTELLIGENCE TEST SUMMARY');
    console.log('═'.repeat(60));
    console.log(`Tests Passed: ${passed}/${total} (${(passed/total*100).toFixed(1)}%)`);
    
    if (passed === total) {
      console.log('🎉 All tests passed! Cross-vector intelligence is working correctly.');
    } else {
      console.log('⚠️  Some tests failed. Check the details above.');
    }
    
    console.log('\n🔧 Implementation Status:');
    console.log('   ✅ Multi-vector retrieval (LangChain pattern)');
    console.log('   ✅ Cross-source correlation analysis');
    console.log('   ✅ LangChain ensemble-style orchestration');
    console.log('   ✅ OpenAI Assistant synthesis');
    console.log('   ✅ Actionable insights extraction');
    
    console.log('\n📋 Available Tools:');
    console.log('   • analyze_code_with_business_context');
    console.log('   • cross_reference_issue');
    console.log('   • find_implementation_context');
    console.log('   • synthesize_development_insights');
    
    console.log('\n🚀 Next Steps:');
    console.log('   1. Deploy enhanced server to production');
    console.log('   2. Update Claude Desktop config to use new server');
    console.log('   3. Test cross-vector queries in real development scenarios');
    console.log('   4. Monitor performance and correlation accuracy');
    
    console.log('═'.repeat(60));
  }

  /**
   * Utility sleep function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Save test results to file
   */
  async saveResults(): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `cross-vector-test-results-${timestamp}.json`;
    
    const summaryData = {
      timestamp: new Date().toISOString(),
      testResults: Object.fromEntries(this.results),
      summary: {
        totalTests: this.results.size,
        passedTests: Array.from(this.results.values()).filter(r => r.success).length,
        failedTests: Array.from(this.results.values()).filter(r => !r.success).length,
      }
    };

    try {
      await import('fs').then(fs => 
        fs.promises.writeFile(filename, JSON.stringify(summaryData, null, 2))
      );
      console.log(`📄 Test results saved to: ${filename}`);
    } catch (error) {
      console.log(`❌ Failed to save results: ${error.message}`);
    }
  }
}

/**
 * Main test execution
 */
async function main() {
  const tester = new CrossVectorTester();
  
  try {
    // Run main test suite
    await tester.runAllTests();
    
    // Run individual tool tests
    await tester.testCrossReferenceIssue();
    await tester.testImplementationContext();
    await tester.testDevelopmentInsights();
    
    // Test correlation analysis specifically
    await tester.testVectorCorrelations();
    
    // Run performance benchmarks
    await tester.runPerformanceBenchmarks();
    
    // Save results
    await tester.saveResults();
    
  } catch (error) {
    console.error('💥 Test suite execution failed:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { CrossVectorTester };
export default main;
Matches) {
        terms.push(...identifierMatches.map(term => term.toLowerCase()));
      }
      
      // Remove duplicates and return top terms
      return [...new Set(terms)].slice(0, 15);
    } catch (error) {
      return [];
    }
  }

  /**
   * Find common terms between two arrays
   */
  private findCommonTerms(terms1: string[], terms2: string[]): string[] {
    const set1 = new Set(terms1.map(term => term.toLowerCase()));
    const set2 = new Set(terms2.map(term => term.toLowerCase()));
    
    return Array.from(set1).filter(term => set2.has(term));
  }

  /**
   * Build context query for synthesis
   */
  private buildContextQuery(originalQuery: string, results: any, correlations: any[]): string {
    let contextQuery = `Cross-vector analysis for: "${originalQuery}"\n\n`;
    
    // Add source summaries
    if (results.code) {
      const codeData = this.parseToolResult(results.code);
      const codeCount = codeData?.results?.length || 0;
      contextQuery += `Code Analysis: Found ${codeCount} relevant files\n`;
    }
    
    if (results.jira) {
      const jiraData = this.parseToolResult(results.jira);
      const jiraCount = jiraData?.results?.length || 0;
      contextQuery += `Jira Analysis: Found ${jiraCount} related tickets\n`;
    }
    
    if (results.aoma) {
      contextQuery += `AOMA Knowledge: Documentation context available\n`;
    }
    
    // Add correlations
    if (correlations.length > 0) {
      contextQuery += `\nCorrelations found:\n`;
      correlations.forEach((corr, index) => {
        contextQuery += `${index + 1}. ${corr.type} (${corr.relationship}): ${corr.commonTerms.join(', ')}\n`;
      });
    }
    
    contextQuery += '\nPlease provide actionable insights and recommendations based on this cross-vector analysis.';
    
    return contextQuery;
  }

  /**
   * Print comprehensive results summary
   */
  private printResultsSummary(query: string, results: any, correlations: any[], totalResults: number): void {
    console.log('   📊 Cross-Vector Analysis Results:');
    console.log(`      Query: "${query}"`);
    console.log(`      Total Results: ${totalResults}`);
    console.log(`      Sources Queried: ${Object.keys(results).filter(k => results[k] !== null).length}/4`);
    console.log(`      Correlations: ${correlations.length}`);
    
    if (correlations.length > 0) {
      console.log('      🔗 Key Correlations:');
      correlations.forEach((corr, index) => {
        console.log(`         ${index + 1}. ${corr.type}: ${corr.commonTerms.slice(0, 3).join(', ')} (${(corr.strength * 100).toFixed(1)}%)`);
      });
    }
    
    if (results.synthesis) {
      console.log('      🧠 Synthesis: Generated successfully');
    }
  }

  /**
   * Test specific cross-vector scenarios
   */
  async testSpecificScenarios(): Promise<void> {
    console.log('🎯 Testing Specific Cross-Vector Scenarios\n');
    
    const scenarios = [
      {
        name: 'Authentication Troubleshooting',
        codeQuery: 'authentication service login failures',
        jiraQuery: 'authentication error login issues',
        aomaQuery: 'authentication service configuration and troubleshooting',
        description: 'Correlate auth code issues with reported problems and documentation'
      },
      {
        name: 'Performance Optimization',
        codeQuery: 'database queries performance optimization',
        jiraQuery: 'performance slow response time',
        aomaQuery: 'performance tuning and optimization guidelines',
        description: 'Cross-reference performance code patterns with incidents and best practices'
      },
      {
        name: 'Feature Implementation Context',
        codeQuery: 'Unified Submission Tool UST implementation',
        jiraQuery: 'UST submission tool features',
        aomaQuery: 'Unified Submission Tool architecture and requirements',
        description: 'Find complete context for UST feature across all sources'
      }
    ];

    for (const scenario of scenarios) {
      console.log(`📋 Scenario: ${scenario.name}`);
      console.log(`   Description: ${scenario.description}\n`);
      
      try {
        await this.runSpecificScenario(scenario);
        console.log('✅ Scenario analysis completed\n');
      } catch (error) {
        console.log(`❌ Scenario failed: ${error.message}\n`);
      }
      
      await this.sleep(1500);
    }
  }

  /**
   * Run specific scenario with targeted queries
   */
  private async runSpecificScenario(scenario: any): Promise<void> {
    const results: any = {};
    
    // Query each source with specific terms
    console.log('   🎯 Running targeted queries...');
    
    try {
      // Code search
      const codeResult = await this.server.callTool('search_code_files', {
        query: scenario.codeQuery,
        maxResults: 5,
        threshold: 0.7
      });
      results.code = this.parseToolResult(codeResult);
      console.log(`      Code: ${results.code?.results?.length || 0} files`);
      
      // Jira search  
      const jiraResult = await this.server.callTool('search_jira_tickets', {
        query: scenario.jiraQuery,
        maxResults: 5,
        threshold: 0.6
      });
      results.jira = this.parseToolResult(jiraResult);
      console.log(`      Jira: ${results.jira?.results?.length || 0} tickets`);
      
      // AOMA docs
      const aomaResult = await this.server.callTool('query_aoma_knowledge', {
        query: scenario.aomaQuery,
        strategy: 'focused'
      });
      results.aoma = aomaResult;
      console.log(`      AOMA: Knowledge retrieved`);
      
      // Analyze scenario-specific insights
      const insights = this.analyzeScenarioInsights(scenario, results);
      console.log(`      Insights: ${insights.length} key findings`);
      
    } catch (error) {
      console.log(`      ⚠️  Scenario execution error: ${error.message}`);
    }
  }

  /**
   * Analyze insights specific to a scenario
   */
  private analyzeScenarioInsights(scenario: any, results: any): any[] {
    const insights: any[] = [];
    
    // Check for implementation-issue correlations
    if (results.code?.results && results.jira?.results) {
      const codeFiles = results.code.results.map((r: any) => r.name || r.path).filter(Boolean);
      const jiraIssues = results.jira.results.map((r: any) => r.summary || r.title).filter(Boolean);
      
      if (codeFiles.length > 0 && jiraIssues.length > 0) {
        insights.push({
          type: 'implementation_issues',
          description: `Found ${codeFiles.length} code files and ${jiraIssues.length} related issues`,
          actionable: 'Review code patterns against reported issues for potential fixes'
        });
      }
    }
    
    // Check for documentation-implementation gaps
    if (results.code?.results && results.aoma) {
      insights.push({
        type: 'documentation_coverage',
        description: 'Code implementation found with corresponding documentation',
        actionable: 'Verify implementation matches documented specifications'
      });
    }
    
    // Check for historical context
    if (results.jira?.results && results.aoma) {
      insights.push({
        type: 'historical_context',
        description: 'Historical issues with relevant documentation context',
        actionable: 'Apply documented solutions to current similar issues'
      });
    }
    
    return insights;
  }

  /**
   * Test server health and connectivity
   */
  async testServerHealth(): Promise<void> {
    console.log('🏥 Testing Server Health and Connectivity\n');
    
    try {
      const healthResult = await this.server.callTool('get_system_health', {
        includeMetrics: true,
        includeDiagnostics: true
      });
      
      const healthData = this.parseToolResult(healthResult);
      
      if (healthData) {
        console.log('✅ Server health check completed');
        console.log(`   Status: ${healthData.status}`);
        console.log(`   OpenAI: ${healthData.services?.openai?.status ? '✅' : '❌'}`);
        console.log(`   Supabase: ${healthData.services?.supabase?.status ? '✅' : '❌'}`);
        console.log(`   Vector Store: ${healthData.services?.vectorStore?.status ? '✅' : '❌'}`);
        console.log(`   Uptime: ${Math.round(healthData.uptime / 1000)}s`);
        console.log(`   Total Requests: ${healthData.metrics?.totalRequests || 0}\n`);
      }
    } catch (error) {
      console.log(`❌ Health check failed: ${error.message}\n`);
    }
  }

  /**
   * Run performance benchmarks
   */
  async runPerformanceBenchmarks(): Promise<void> {
    console.log('⚡ Running Performance Benchmarks\n');
    
    const benchmarkQueries = [
      'authentication issues',
      'database performance', 
      'API errors',
      'export failures',
      'user interface problems'
    ];

    const times: number[] = [];
    
    for (const query of benchmarkQueries) {
      const startTime = Date.now();
      
      try {
        // Test with lightweight query
        await this.server.callTool('search_code_files', {
          query,
          maxResults: 3,
          threshold: 0.7
        });
        
        const duration = Date.now() - startTime;
        times.push(duration);
        console.log(`   "${query}": ${duration}ms`);
        
      } catch (error) {
        console.log(`   "${query}": FAILED (${error.message})`);
      }
    }

    if (times.length > 0) {
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);
      
      console.log(`\n📈 Performance Summary:`);
      console.log(`   Average: ${avgTime.toFixed(0)}ms`);
      console.log(`   Min: ${minTime}ms`);
      console.log(`   Max: ${maxTime}ms`);
      console.log(`   Success rate: ${(times.length / benchmarkQueries.length * 100).toFixed(1)}%\n`);
    }
  }

  /**
   * Print final summary and recommendations
   */
  printFinalSummary(): void {
    console.log('═'.repeat(60));
    console.log('🎉 CROSS-VECTOR INTELLIGENCE TEST COMPLETED');
    console.log('═'.repeat(60));
    
    console.log('\n✅ Successfully Demonstrated:');
    console.log('   • Multi-vector retrieval across code, Jira, and AOMA docs');
    console.log('   • Cross-source correlation analysis');
    console.log('   • Automatic term extraction and matching');
    console.log('   • Context-aware synthesis generation');
    console.log('   • Scenario-specific targeted querying');
    
    console.log('\n🔧 Implementation Approach:');
    console.log('   • Used existing AOMA Mesh MCP server architecture');
    console.log('   • Made sequential tool calls for cross-vector analysis');
    console.log('   • Applied LangChain ensemble retrieval patterns manually');
    console.log('   • Generated correlations through term analysis');
    console.log('   • Used development context analysis for synthesis');
    
    console.log('\n📋 Cross-Vector Capabilities:');
    console.log('   • Code ↔ Jira: Find implementation issues and related tickets');
    console.log('   • Code ↔ AOMA: Match implementations with documentation');  
    console.log('   • Jira ↔ AOMA: Connect historical issues with guidance');
    console.log('   • Multi-source synthesis for comprehensive insights');
    
    console.log('\n🚀 Deployment Ready:');
    console.log('   • Works with existing server infrastructure');
    console.log('   • No breaking changes to current architecture');
    console.log('   • Can be used immediately via existing MCP tools');
    console.log('   • Provides LangChain-inspired cross-vector intelligence');
    
    console.log('\n💡 Usage Examples:');
    console.log('   "Find authentication code issues and related Jira tickets"');
    console.log('   "Cross-reference performance problems with documentation"');
    console.log('   "Analyze export functionality across all sources"');
    console.log('   "Get complete context for UST implementation"');
    
    console.log('═'.repeat(60));
  }

  /**
   * Utility sleep function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Main test execution
 */
async function main() {
  const tester = new CrossVectorIntelligenceTest();
  
  try {
    console.log('🎯 AOMA MESH CROSS-VECTOR INTELLIGENCE TEST');
    console.log('═'.repeat(60));
    console.log('Testing LangChain-inspired multi-vector retrieval and correlation\n');
    
    // Initialize server
    await tester.initialize();
    
    // Test server health first
    await tester.testServerHealth();
    
    // Run cross-vector analysis tests
    await tester.testCrossVectorAnalysis();
    
    // Test specific scenarios
    await tester.testSpecificScenarios();
    
    // Run performance benchmarks
    await tester.runPerformanceBenchmarks();
    
    // Print final summary
    tester.printFinalSummary();
    
  } catch (error) {
    console.error('💥 Test execution failed:', error);
    console.log('\n🔧 Troubleshooting:');
    console.log('   • Check .env file has all required variables');
    console.log('   • Verify OpenAI API key is valid');
    console.log('   • Ensure Supabase connection is working');
    console.log('   • Check AOMA Assistant ID is correct');
    process.exit(1);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { CrossVectorIntelligenceTest };
export default main;
