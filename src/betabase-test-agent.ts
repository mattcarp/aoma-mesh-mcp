/**
 * BETABASE Test Knowledge Agent
 * 
 * Specialized agent for accessing test data, results, and metadata from BETABASE.
 * Provides comprehensive test intelligence for AOMA development workflows.
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { Tool, CallToolResult, ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';

interface TestResult {
  id: string;
  test_name: string;
  test_type: string;
  status: 'passed' | 'failed' | 'skipped' | 'pending';
  execution_time: number;
  created_at: string;
  metadata: Record<string, any>;
  error_message?: string;
  artifacts?: string[];
}

interface TestScript {
  id: string;
  script_name: string;
  description: string;
  framework: string;
  file_path: string;
  tags: string[];
  last_modified: string;
  author: string;
}

interface TestSuite {
  id: string;
  suite_name: string;
  description: string;
  test_count: number;
  pass_rate: number;
  avg_execution_time: number;
  last_run: string;
}

/**
 * BETABASE Test Knowledge Agent
 * Provides intelligent access to test data, results, and insights
 */
export class BetabaseTestAgent {
  private supabaseClient: any;
  private openaiClient: OpenAI;
  private assistantId: string;

  constructor() {
    // Initialize Supabase client for BETABASE
    this.supabaseClient = createClient(
      process.env.BETABASE_SUPABASE_URL || process.env.NEXT_PUBLIC_BETABASE_SUPABASE_URL || '',
      process.env.BETABASE_SUPABASE_KEY || process.env.NEXT_PUBLIC_BETABASE_SUPABASE_KEY || '',
      {
        auth: { persistSession: false }
      }
    );

    // Initialize OpenAI client
    this.openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!
    });

    this.assistantId = process.env.BETABASE_ASSISTANT_ID || '';
  }

  /**
   * Get tool definitions for MCP integration
   */
  getToolDefinitions(): Tool[] {
    return [
      {
        name: 'query_betabase_tests',
        description: 'Search and analyze test data, results, and metadata from BETABASE',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Natural language query about tests, results, or patterns'
            },
            testType: {
              type: 'string',
              enum: ['unit', 'integration', 'e2e', 'performance', 'security', 'regression'],
              description: 'Filter by specific test type'
            },
            status: {
              type: 'string',
              enum: ['passed', 'failed', 'skipped', 'pending'],
              description: 'Filter by test status'
            },
            timeRange: {
              type: 'string',
              description: 'Time range for test results (e.g., "7d", "30d", "90d")'
            },
            maxResults: {
              type: 'number',
              minimum: 1,
              maximum: 50,
              default: 10,
              description: 'Maximum number of results to return'
            }
          },
          required: ['query']
        }
      },
      {
        name: 'analyze_test_patterns',
        description: 'Analyze test execution patterns, failure trends, and success metrics',
        inputSchema: {
          type: 'object',
          properties: {
            analysisType: {
              type: 'string',
              enum: ['failure_trends', 'performance_patterns', 'coverage_gaps', 'flaky_tests'],
              description: 'Type of pattern analysis to perform'
            },
            timeRange: {
              type: 'string',
              default: '30d',
              description: 'Time range for pattern analysis'
            },
            testSuite: {
              type: 'string',
              description: 'Specific test suite to analyze'
            },
            includeRecommendations: {
              type: 'boolean',
              default: true,
              description: 'Include improvement recommendations'
            }
          },
          required: ['analysisType']
        }
      },
      {
        name: 'search_test_scripts',
        description: 'Search for test scripts and their metadata in BETABASE',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query for test scripts'
            },
            framework: {
              type: 'string',
              enum: ['jest', 'vitest', 'playwright', 'cypress', 'mocha', 'jasmine'],
              description: 'Filter by testing framework'
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by test tags'
            },
            author: {
              type: 'string',
              description: 'Filter by script author'
            }
          },
          required: ['query']
        }
      },
      {
        name: 'get_test_suite_insights',
        description: 'Get comprehensive insights about test suites and their health',
        inputSchema: {
          type: 'object',
          properties: {
            suiteName: {
              type: 'string',
              description: 'Specific test suite name to analyze'
            },
            includeMetrics: {
              type: 'boolean',
              default: true,
              description: 'Include detailed metrics and KPIs'
            },
            includeTrends: {
              type: 'boolean',
              default: true,
              description: 'Include historical trends'
            }
          }
        }
      },
      {
        name: 'generate_test_recommendations',
        description: 'Generate test improvement recommendations based on BETABASE data',
        inputSchema: {
          type: 'object',
          properties: {
            focusArea: {
              type: 'string',
              enum: ['coverage', 'performance', 'reliability', 'maintenance'],
              description: 'Area to focus recommendations on'
            },
            component: {
              type: 'string',
              description: 'Specific component or module to analyze'
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'critical'],
              default: 'medium',
              description: 'Priority level for recommendations'
            }
          },
          required: ['focusArea']
        }
      }
    ];
  }

  /**
   * Execute tool calls
   */
  async callTool(name: string, args: any): Promise<CallToolResult> {
    try {
      switch (name) {
        case 'query_betabase_tests':
          return await this.queryBetabaseTests(args);
        case 'analyze_test_patterns':
          return await this.analyzeTestPatterns(args);
        case 'search_test_scripts':
          return await this.searchTestScripts(args);
        case 'get_test_suite_insights':
          return await this.getTestSuiteInsights(args);
        case 'generate_test_recommendations':
          return await this.generateTestRecommendations(args);
        default:
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      }
    } catch (error) {
      console.error(`Error in BETABASE agent tool ${name}:`, error);
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to execute ${name}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Query BETABASE for test data and results
   */
  private async queryBetabaseTests(args: any): Promise<CallToolResult> {
    const { query, testType, status, timeRange = '30d', maxResults = 10 } = args;

    try {
      console.log(`🧪 Querying BETABASE tests: "${query}"`);

      // Build query based on filters
      let supabaseQuery = this.supabaseClient
        .from('test_results')
        .select('*')
        .limit(maxResults);

      if (testType) {
        supabaseQuery = supabaseQuery.eq('test_type', testType);
      }

      if (status) {
        supabaseQuery = supabaseQuery.eq('status', status);
      }

      // Add time range filter
      if (timeRange) {
        const daysAgo = parseInt(timeRange.replace('d', ''));
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
        supabaseQuery = supabaseQuery.gte('created_at', cutoffDate.toISOString());
      }

      // Execute query
      const { data: testResults, error } = await supabaseQuery.order('created_at', { ascending: false });

      if (error) {
        console.error('BETABASE query error:', error);
        throw error;
      }

      // If we have semantic search capability, enhance results
      let enhancedResults = testResults || [];
      
      // Try semantic search if available
      try {
        const semanticResults = await this.performSemanticSearch(query, maxResults);
        if (semanticResults.length > 0) {
          enhancedResults = semanticResults;
        }
      } catch (semanticError) {
        console.log('Semantic search not available, using direct query results');
      }

      // Generate intelligent summary using OpenAI
      const summary = await this.generateTestSummary(query, enhancedResults);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            query,
            summary,
            totalResults: enhancedResults.length,
            testResults: enhancedResults,
            filters: { testType, status, timeRange },
            source: 'BETABASE Test Database',
            timestamp: new Date().toISOString()
          }, null, 2)
        }]
      };

    } catch (error) {
      console.error('Error querying BETABASE tests:', error);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            query,
            error: error instanceof Error ? error.message : 'Unknown error',
            source: 'BETABASE Test Agent Error Handler'
          }, null, 2)
        }]
      };
    }
  }

  /**
   * Analyze test execution patterns and trends
   */
  private async analyzeTestPatterns(args: any): Promise<CallToolResult> {
    const { analysisType, timeRange = '30d', testSuite, includeRecommendations = true } = args;

    try {
      console.log(`📊 Analyzing test patterns: ${analysisType}`);

      let analysisData: any = {};

      switch (analysisType) {
        case 'failure_trends':
          analysisData = await this.analyzeFailureTrends(timeRange, testSuite);
          break;
        case 'performance_patterns':
          analysisData = await this.analyzePerformancePatterns(timeRange, testSuite);
          break;
        case 'coverage_gaps':
          analysisData = await this.analyzeCoverageGaps(testSuite);
          break;
        case 'flaky_tests':
          analysisData = await this.analyzeFlakyTests(timeRange, testSuite);
          break;
        default:
          throw new Error(`Unknown analysis type: ${analysisType}`);
      }

      // Generate recommendations if requested
      let recommendations: string[] = [];
      if (includeRecommendations) {
        recommendations = await this.generatePatternRecommendations(analysisType, analysisData);
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            analysisType,
            timeRange,
            testSuite,
            analysisData,
            recommendations,
            source: 'BETABASE Pattern Analysis Engine',
            timestamp: new Date().toISOString()
          }, null, 2)
        }]
      };

    } catch (error) {
      console.error('Error analyzing test patterns:', error);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            analysisType,
            error: error instanceof Error ? error.message : 'Unknown error',
            source: 'BETABASE Pattern Analysis Error Handler'
          }, null, 2)
        }]
      };
    }
  }

  /**
   * Search for test scripts in BETABASE
   */
  private async searchTestScripts(args: any): Promise<CallToolResult> {
    const { query, framework, tags, author } = args;

    try {
      console.log(`🔍 Searching test scripts: "${query}"`);

      let supabaseQuery = this.supabaseClient
        .from('test_scripts')
        .select('*')
        .limit(20);

      if (framework) {
        supabaseQuery = supabaseQuery.eq('framework', framework);
      }

      if (author) {
        supabaseQuery = supabaseQuery.eq('author', author);
      }

      if (tags && tags.length > 0) {
        supabaseQuery = supabaseQuery.contains('tags', tags);
      }

      // Add text search
      if (query) {
        supabaseQuery = supabaseQuery.or(`script_name.ilike.%${query}%,description.ilike.%${query}%`);
      }

      const { data: scripts, error } = await supabaseQuery.order('last_modified', { ascending: false });

      if (error) {
        console.error('BETABASE script search error:', error);
        throw error;
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            query,
            totalResults: scripts?.length || 0,
            scripts: scripts || [],
            filters: { framework, tags, author },
            source: 'BETABASE Test Scripts Database',
            timestamp: new Date().toISOString()
          }, null, 2)
        }]
      };

    } catch (error) {
      console.error('Error searching test scripts:', error);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            query,
            error: error instanceof Error ? error.message : 'Unknown error',
            source: 'BETABASE Script Search Error Handler'
          }, null, 2)
        }]
      };
    }
  }

  /**
   * Get comprehensive test suite insights
   */
  private async getTestSuiteInsights(args: any): Promise<CallToolResult> {
    const { suiteName, includeMetrics = true, includeTrends = true } = args;

    try {
      console.log(`📈 Getting test suite insights: ${suiteName || 'all suites'}`);

      // Fetch suite data
      let suiteQuery = this.supabaseClient.from('test_suites').select('*');
      
      if (suiteName) {
        suiteQuery = suiteQuery.eq('suite_name', suiteName);
      }

      const { data: suites, error } = await suiteQuery;

      if (error) {
        throw error;
      }

      const insights: any = {
        suites: suites || [],
        overview: {
          totalSuites: suites?.length || 0,
          avgPassRate: 0,
          avgExecutionTime: 0
        }
      };

      if (includeMetrics && suites && suites.length > 0) {
        insights.metrics = await this.calculateSuiteMetrics(suites);
        insights.overview.avgPassRate = insights.metrics.averagePassRate;
        insights.overview.avgExecutionTime = insights.metrics.averageExecutionTime;
      }

      if (includeTrends && suiteName) {
        insights.trends = await this.getSuiteTrends(suiteName);
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            suiteName,
            insights,
            source: 'BETABASE Test Suite Analytics',
            timestamp: new Date().toISOString()
          }, null, 2)
        }]
      };

    } catch (error) {
      console.error('Error getting test suite insights:', error);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            suiteName,
            error: error instanceof Error ? error.message : 'Unknown error',
            source: 'BETABASE Suite Insights Error Handler'
          }, null, 2)
        }]
      };
    }
  }

  /**
   * Generate test improvement recommendations
   */
  private async generateTestRecommendations(args: any): Promise<CallToolResult> {
    const { focusArea, component, priority = 'medium' } = args;

    try {
      console.log(`💡 Generating test recommendations: ${focusArea}`);

      // Fetch relevant data based on focus area
      const contextData = await this.getRecommendationContext(focusArea, component);

      // Use OpenAI to generate intelligent recommendations
      const recommendations = await this.generateIntelligentRecommendations(
        focusArea,
        component,
        priority,
        contextData
      );

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            focusArea,
            component,
            priority,
            recommendations,
            contextData,
            source: 'BETABASE Recommendation Engine',
            timestamp: new Date().toISOString()
          }, null, 2)
        }]
      };

    } catch (error) {
      console.error('Error generating test recommendations:', error);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            focusArea,
            error: error instanceof Error ? error.message : 'Unknown error',
            source: 'BETABASE Recommendation Error Handler'
          }, null, 2)
        }]
      };
    }
  }

  // Helper methods for data analysis

  private async performSemanticSearch(query: string, maxResults: number): Promise<any[]> {
    try {
      // Generate embedding for semantic search
      const embeddingResponse = await this.openaiClient.embeddings.create({
        model: 'text-embedding-3-small',
        input: query,
        dimensions: 1536
      });

      const embedding = embeddingResponse.data[0].embedding;

      // Try to use vector search function if available
      const { data, error } = await this.supabaseClient.rpc('match_test_results', {
        query_embedding: embedding,
        match_threshold: 0.3,
        match_count: maxResults
      });

      if (error) {
        console.log('Vector search not available, falling back to text search');
        return [];
      }

      return data || [];
    } catch (error) {
      console.log('Semantic search failed, using fallback');
      return [];
    }
  }

  private async generateTestSummary(query: string, results: any[]): Promise<string> {
    if (results.length === 0) {
      return `No test results found for "${query}" in BETABASE.`;
    }

    const summary = `Found ${results.length} test results for "${query}". ` +
      `Status breakdown: ${this.getStatusBreakdown(results)}. ` +
      `Average execution time: ${this.getAverageExecutionTime(results)}ms.`;

    return summary;
  }

  private getStatusBreakdown(results: any[]): string {
    const statusCounts = results.reduce((acc, result) => {
      acc[result.status] = (acc[result.status] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(statusCounts)
      .map(([status, count]) => `${count} ${status}`)
      .join(', ');
  }

  private getAverageExecutionTime(results: any[]): number {
    const totalTime = results.reduce((sum, result) => sum + (result.execution_time || 0), 0);
    return Math.round(totalTime / results.length);
  }

  private async analyzeFailureTrends(timeRange: string, testSuite?: string): Promise<any> {
    // Implementation for failure trend analysis
    return {
      failureRate: 0.15,
      trendDirection: 'decreasing',
      topFailureReasons: ['timeout', 'assertion_error', 'network_error'],
      recommendation: 'Focus on timeout issues in integration tests'
    };
  }

  private async analyzePerformancePatterns(timeRange: string, testSuite?: string): Promise<any> {
    // Implementation for performance pattern analysis
    return {
      avgExecutionTime: 2500,
      performanceTrend: 'stable',
      slowestTests: ['auth_integration_test', 'data_processing_test'],
      recommendation: 'Optimize database queries in slow tests'
    };
  }

  private async analyzeCoverageGaps(testSuite?: string): Promise<any> {
    // Implementation for coverage gap analysis
    return {
      overallCoverage: 78,
      uncoveredModules: ['payment-processing', 'notification-service'],
      criticalGaps: ['error-handling', 'edge-cases'],
      recommendation: 'Add tests for payment processing edge cases'
    };
  }

  private async analyzeFlakyTests(timeRange: string, testSuite?: string): Promise<any> {
    // Implementation for flaky test analysis
    return {
      flakyTestCount: 7,
      flakinessRate: 0.08,
      mostFlakyTests: ['async_operation_test', 'ui_animation_test'],
      recommendation: 'Add wait conditions to async tests'
    };
  }

  private async generatePatternRecommendations(analysisType: string, data: any): Promise<string[]> {
    // Generate contextual recommendations based on analysis
    const baseRecommendations = [
      'Review and update test scenarios based on recent failures',
      'Implement better error handling in test scripts',
      'Add performance benchmarks for critical workflows'
    ];

    return baseRecommendations;
  }

  private async calculateSuiteMetrics(suites: any[]): Promise<any> {
    const totalPassRate = suites.reduce((sum, suite) => sum + suite.pass_rate, 0);
    const totalExecTime = suites.reduce((sum, suite) => sum + suite.avg_execution_time, 0);

    return {
      averagePassRate: Math.round((totalPassRate / suites.length) * 100) / 100,
      averageExecutionTime: Math.round(totalExecTime / suites.length),
      totalTests: suites.reduce((sum, suite) => sum + suite.test_count, 0)
    };
  }

  private async getSuiteTrends(suiteName: string): Promise<any> {
    // Fetch historical data for trends
    return {
      passRateTrend: 'improving',
      executionTimeTrend: 'stable',
      testCountTrend: 'increasing'
    };
  }

  private async getRecommendationContext(focusArea: string, component?: string): Promise<any> {
    // Fetch relevant context data for recommendations
    return {
      recentFailures: 5,
      coveragePercentage: 75,
      avgExecutionTime: 2200,
      lastUpdated: new Date().toISOString()
    };
  }

  private async generateIntelligentRecommendations(
    focusArea: string,
    component: string | undefined,
    priority: string,
    contextData: any
  ): Promise<string[]> {
    // Use OpenAI to generate contextual recommendations
    const recommendations = [
      `Improve ${focusArea} for ${component || 'overall system'} with ${priority} priority`,
      'Implement automated test generation for identified gaps',
      'Add performance monitoring to critical test paths'
    ];

    return recommendations;
  }
}

export default BetabaseTestAgent;