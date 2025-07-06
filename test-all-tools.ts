#!/usr/bin/env tsx
/**
 * Comprehensive MCP Tools Test Suite
 * 
 * Tests all 18 MCP tools systematically to identify working and broken functionality
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '..', '.env.local') });
config({ path: join(__dirname, '..', '.env') });

interface ToolTestResult {
  tool: string;
  category: string;
  status: 'pass' | 'fail' | 'skip';
  message: string;
  executionTime?: number;
  data?: any;
  error?: any;
}

class MCPToolsComprehensiveTester {
  private results: ToolTestResult[] = [];
  private mcpServer: any;

  async runAllTests(): Promise<void> {
    console.log('🧪 Starting Comprehensive MCP Tools Test Suite...\n');
    console.log('Testing all 18 MCP tools systematically...\n');

    // Initialize MCP Server
    await this.initializeMCPServer();

    // Test all tool categories
    await this.testAgentManagementTools();
    await this.testSpecializedAgentOperations();
    await this.testEnhancedDevelopmentTools();
    await this.testIDESpecificIntegrationTools();

    // Print comprehensive results
    this.printComprehensiveResults();
  }

  private async initializeMCPServer(): Promise<void> {
    console.log('🚀 Initializing MCP Server...');
    
    try {
      const { AgentServer } = await import('./src/agent-server.js');
      this.mcpServer = new AgentServer();
      await this.mcpServer.initialize();
      
      console.log('✅ MCP Server initialized successfully');
      console.log(`📋 Available tools: ${this.mcpServer.getToolDefinitions().length}`);
      console.log();
    } catch (error) {
      console.log('❌ Failed to initialize MCP Server:', error);
      this.results.push({
        tool: 'MCP Server Initialization',
        category: 'Infrastructure',
        status: 'fail',
        message: 'Failed to initialize MCP server',
        error
      });
    }
  }

  private async testAgentManagementTools(): Promise<void> {
    console.log('🔧 Testing Agent Management Tools (6 tools)...');
    console.log('=' .repeat(50));

    const agentManagementTools = [
      {
        name: 'create_coordinator_agent',
        description: 'Create a new coordinator agent',
        testArgs: {
          taskDescription: 'Test task for coordinator agent',
          strategy: 'thorough',
          maxAgents: 3
        }
      },
      {
        name: 'get_agent_status',
        description: 'Get agent status',
        testArgs: {
          agentId: 'test-agent-1'
        }
      },
      {
        name: 'get_agent_events',
        description: 'Get agent events',
        testArgs: {
          agentId: 'test-agent-1'
        }
      },
      {
        name: 'submit_agent_feedback',
        description: 'Submit human feedback',
        testArgs: {
          agentId: 'test-agent-1',
          feedback: 'This is a test feedback',
          rating: 5
        }
      },
      {
        name: 'list_active_agents',
        description: 'List active agents',
        testArgs: {}
      },
      {
        name: 'terminate_agent',
        description: 'Terminate agent',
        testArgs: {
          agentId: 'test-agent-1'
        }
      }
    ];

    for (const tool of agentManagementTools) {
      await this.testTool(tool.name, tool.description, 'Agent Management', tool.testArgs);
    }
    console.log();
  }

  private async testSpecializedAgentOperations(): Promise<void> {
    console.log('🎯 Testing Specialized Agent Operations (4 tools)...');
    console.log('=' .repeat(50));

    const specializedTools = [
      {
        name: 'query_jira_tickets',
        description: 'Search Jira tickets',
        testArgs: {
          query: 'authentication login issues',
          projectKey: 'AOMA',
          maxResults: 5
        }
      },
      {
        name: 'analyze_git_repository',
        description: 'Analyze Git repository',
        testArgs: {
          repositoryPath: '/Users/mcarpent/Documents/projects/mc-tk',
          analysisType: 'structure'
        }
      },
      {
        name: 'generate_test_plan',
        description: 'Generate test plan',
        testArgs: {
          feature: 'User authentication system',
          testTypes: ['unit', 'integration', 'e2e'],
          framework: 'playwright'
        }
      },
      {
        name: 'create_diagram',
        description: 'Create mermaid diagram',
        testArgs: {
          description: 'User authentication flow diagram',
          diagramType: 'flowchart'
        }
      }
    ];

    for (const tool of specializedTools) {
      await this.testTool(tool.name, tool.description, 'Specialized Operations', tool.testArgs);
    }
    console.log();
  }

  private async testEnhancedDevelopmentTools(): Promise<void> {
    console.log('⚡ Testing Enhanced Development Tools (6 tools)...');
    console.log('=' .repeat(50));

    const developmentTools = [
      {
        name: 'analyze_code_quality',
        description: 'Analyze code quality',
        testArgs: {
          filePath: '/Users/mcarpent/Documents/projects/mc-tk/src/components/chat/ChatInterface.tsx',
          metrics: ['complexity', 'maintainability', 'security']
        }
      },
      {
        name: 'analyze_architecture',
        description: 'Analyze project architecture',
        testArgs: {
          projectPath: '/Users/mcarpent/Documents/projects/mc-tk',
          analysisDepth: 'medium'
        }
      },
      {
        name: 'suggest_refactoring',
        description: 'Suggest refactoring',
        testArgs: {
          filePath: '/Users/mcarpent/Documents/projects/mc-tk/src/lib/agents/langgraph/agent-service.ts',
          focusAreas: ['performance', 'maintainability']
        }
      },
      {
        name: 'search_codebase',
        description: 'Search codebase',
        testArgs: {
          query: 'authentication useAuth',
          searchType: 'semantic',
          maxResults: 10
        }
      },
      {
        name: 'generate_documentation',
        description: 'Generate documentation',
        testArgs: {
          componentPath: '/Users/mcarpent/Documents/projects/mc-tk/src/components/chat/ChatInterface.tsx',
          docType: 'api'
        }
      },
      {
        name: 'analyze_dependencies',
        description: 'Analyze dependencies',
        testArgs: {
          packageJsonPath: '/Users/mcarpent/Documents/projects/mc-tk/package.json',
          analysisType: 'security'
        }
      }
    ];

    for (const tool of developmentTools) {
      await this.testTool(tool.name, tool.description, 'Development Tools', tool.testArgs);
    }
    console.log();
  }

  private async testIDESpecificIntegrationTools(): Promise<void> {
    console.log('🔧 Testing IDE-Specific Integration Tools (6 tools)...');
    console.log('=' .repeat(50));

    const ideTools = [
      {
        name: 'analyze_workspace',
        description: 'Analyze workspace',
        testArgs: {
          workspacePath: '/Users/mcarpent/Documents/projects/mc-tk',
          ide: 'vscode'
        }
      },
      {
        name: 'suggest_ide_improvements',
        description: 'Suggest IDE improvements',
        testArgs: {
          ide: 'vscode',
          projectType: 'nextjs',
          currentConfig: {}
        }
      },
      {
        name: 'generate_ide_snippets',
        description: 'Generate IDE snippets',
        testArgs: {
          ide: 'vscode',
          language: 'typescript',
          context: 'react-component'
        }
      },
      {
        name: 'analyze_development_context',
        description: 'Analyze development context',
        testArgs: {
          currentFile: '/Users/mcarpent/Documents/projects/mc-tk/src/components/chat/ChatInterface.tsx',
          analysisType: 'context'
        }
      },
      {
        name: 'optimize_workflow',
        description: 'Optimize workflow',
        testArgs: {
          currentWorkflow: 'development',
          projectType: 'nextjs',
          teamSize: 1
        }
      },
      {
        name: 'create_development_plan',
        description: 'Create development plan',
        testArgs: {
          feature: 'Enhanced authentication system',
          timeline: '2 weeks',
          resources: ['1 developer']
        }
      }
    ];

    for (const tool of ideTools) {
      await this.testTool(tool.name, tool.description, 'IDE Integration', tool.testArgs);
    }
    console.log();
  }

  private async testTool(toolName: string, description: string, category: string, testArgs: any): Promise<void> {
    const startTime = Date.now();
    
    console.log(`🔍 Testing ${toolName}...`);
    
    try {
      if (!this.mcpServer) {
        throw new Error('MCP Server not initialized');
      }

      // Check if tool exists
      const tools = this.mcpServer.getToolDefinitions();
      const tool = tools.find((t: any) => t.name === toolName);
      
      if (!tool) {
        this.results.push({
          tool: toolName,
          category,
          status: 'fail',
          message: `Tool '${toolName}' not found in MCP server`,
          executionTime: Date.now() - startTime
        });
        console.log(`❌ ${toolName}: Tool not found`);
        return;
      }

      // Attempt to call the tool
      const result = await this.mcpServer.callTool(toolName, testArgs);
      
      const executionTime = Date.now() - startTime;
      
      if (result && !result.isError) {
        this.results.push({
          tool: toolName,
          category,
          status: 'pass',
          message: `${description} - Success`,
          executionTime,
          data: result
        });
        console.log(`✅ ${toolName}: SUCCESS (${executionTime}ms)`);
      } else {
        this.results.push({
          tool: toolName,
          category,
          status: 'fail',
          message: `${description} - Tool returned error`,
          executionTime,
          error: result
        });
        console.log(`❌ ${toolName}: FAILED - Tool returned error`);
      }

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      this.results.push({
        tool: toolName,
        category,
        status: 'fail',
        message: `${description} - Exception thrown`,
        executionTime,
        error: error.message || error
      });
      console.log(`❌ ${toolName}: FAILED - ${error.message || error}`);
    }
  }

  private printComprehensiveResults(): void {
    console.log('📊 COMPREHENSIVE TEST RESULTS');
    console.log('=' .repeat(80));
    
    // Summary statistics
    const totalTests = this.results.length;
    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const skipped = this.results.filter(r => r.status === 'skip').length;
    
    console.log(`\n📈 SUMMARY:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   ✅ Passed: ${passed} (${Math.round(passed/totalTests*100)}%)`);
    console.log(`   ❌ Failed: ${failed} (${Math.round(failed/totalTests*100)}%)`);
    console.log(`   ⏭️ Skipped: ${skipped} (${Math.round(skipped/totalTests*100)}%)`);
    
    // Results by category
    const categories = [...new Set(this.results.map(r => r.category))];
    console.log(`\n📋 RESULTS BY CATEGORY:`);
    
    categories.forEach(category => {
      const categoryResults = this.results.filter(r => r.category === category);
      const categoryPassed = categoryResults.filter(r => r.status === 'pass').length;
      const categoryTotal = categoryResults.length;
      
      console.log(`\n🔧 ${category}:`);
      console.log(`   Score: ${categoryPassed}/${categoryTotal} (${Math.round(categoryPassed/categoryTotal*100)}%)`);
      
      categoryResults.forEach(result => {
        const icon = result.status === 'pass' ? '✅' : 
                     result.status === 'fail' ? '❌' : '⏭️';
        const timing = result.executionTime ? ` (${result.executionTime}ms)` : '';
        console.log(`   ${icon} ${result.tool}: ${result.message}${timing}`);
        if (result.error && result.status === 'fail') {
          console.log(`      Error: ${result.error}`);
        }
      });
    });
    
    // Recommendations
    console.log(`\n🔧 RECOMMENDATIONS:`);
    const failedTools = this.results.filter(r => r.status === 'fail');
    
    if (failedTools.length === 0) {
      console.log('   🎉 All tools are working correctly! No action needed.');
    } else {
      console.log(`   📝 ${failedTools.length} tools need attention:`);
      failedTools.forEach(result => {
        console.log(`   - Fix ${result.tool}: ${result.message}`);
      });
    }
    
    // Performance insights
    const successfulTests = this.results.filter(r => r.status === 'pass' && r.executionTime);
    if (successfulTests.length > 0) {
      const avgTime = successfulTests.reduce((sum, r) => sum + (r.executionTime || 0), 0) / successfulTests.length;
      const slowTests = successfulTests.filter(r => (r.executionTime || 0) > avgTime * 2);
      
      console.log(`\n⚡ PERFORMANCE INSIGHTS:`);
      console.log(`   Average execution time: ${Math.round(avgTime)}ms`);
      if (slowTests.length > 0) {
        console.log(`   Slow tools (>2x average):`);
        slowTests.forEach(test => {
          console.log(`   - ${test.tool}: ${test.executionTime}ms`);
        });
      }
    }

    console.log('\n' + '=' .repeat(80));
    console.log('🎯 TEST SUITE COMPLETED');
  }
}

// Run the comprehensive test suite
const tester = new MCPToolsComprehensiveTester();
tester.runAllTests().catch(console.error);