/**
 * Server Capabilities Tool
 * 
 * Provides comprehensive information about server capabilities,
 * supported environments, and version information.
 */

import { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { BaseTool, ToolExecutionContext } from '../base/tool.interface';
import { ToolRegistry } from '../base/tool.registry';
import { ServerCapabilitiesRequest } from '../../types/requests';

export class ServerCapabilitiesTool extends BaseTool {
  readonly definition: Tool = {
    name: 'get_server_capabilities',
    description: 'Get complete list of server capabilities, supported environments, and version info',
    inputSchema: {
      type: 'object',
      properties: {
        includeExamples: {
          type: 'boolean',
          description: 'Include usage examples for each tool',
          default: false,
        },
      },
      additionalProperties: false,
    },
  };

  constructor(
    private readonly toolRegistry: ToolRegistry,
    private readonly serverVersion: string,
    private readonly environment: string
  ) {
    super();
  }

  async execute(args: Record<string, unknown>, context: ToolExecutionContext): Promise<CallToolResult> {
    const request = args as ServerCapabilitiesRequest;
    const { includeExamples = false } = request;

    context.logger.info('Generating server capabilities report', { includeExamples });

    try {
      const toolMetadata = this.toolRegistry.getToolMetadata();
      
      const capabilities = {
        server: {
          name: '@sony-music/aoma-mesh-mcp-server',
          version: this.serverVersion,
          environment: this.environment,
          architecture: 'Modular MCP Server with Tool Registry',
          startupTime: new Date().toISOString()
        },
        transports: [
          {
            type: 'stdio',
            description: 'Standard Input/Output transport for Claude Desktop integration',
            protocols: ['MCP 1.0']
          },
          {
            type: 'http',
            description: 'HTTP REST API for web application integration',
            endpoints: ['/health', '/rpc', '/tools/:toolName', '/metrics']
          }
        ],
        tools: {
          total: toolMetadata.length,
          categories: this.categorizeTools(toolMetadata),
          list: toolMetadata.map(tool => ({
            name: tool.name,
            description: tool.description,
            category: this.getToolCategory(tool.name),
            parameterCount: tool.parameterCount,
            requiredParams: tool.requiredParams,
            hasHealthCheck: tool.hasHealthCheck,
            ...(includeExamples && { examples: this.getToolExamples(tool.name) })
          }))
        },
        services: {
          openai: {
            type: 'AI Assistant',
            capabilities: ['Knowledge Base Queries', 'Text Generation', 'Assistant Interactions']
          },
          supabase: {
            type: 'Vector Database',
            capabilities: ['Semantic Search', 'Vector Storage', 'SQL Queries', 'RPC Functions']
          }
        },
        features: [
          'Semantic Vector Search',
          'Multi-Agent Swarm Analysis',
          'Real-time Health Monitoring',
          'Comprehensive Error Handling',
          'Structured Logging',
          'Performance Metrics',
          'Graceful Shutdown',
          'Auto Port Management',
          'Tool Registry System',
          'Dependency Injection'
        ],
        supportedEnvironments: [
          'Claude Desktop',
          'Windsurf IDE',
          'VS Code with MCP extension',
          'Web applications via HTTP API',
          'Terminal/CLI via stdio'
        ],
        systemRequirements: {
          node: '>=16.0.0',
          dependencies: ['OpenAI API access', 'Supabase database', 'Environment variables'],
          optional: ['Jira access', 'Git repository access', 'Outlook integration']
        }
      };

      context.logger.info('Server capabilities report generated', {
        toolCount: capabilities.tools.total,
        categories: Object.keys(capabilities.tools.categories).length,
        includeExamples
      });

      return this.success(capabilities);
    } catch (error) {
      context.logger.error('Failed to generate capabilities report', { error });
      return this.error('Failed to get server capabilities', { error: error instanceof Error ? error.message : error });
    }
  }

  private categorizeTools(tools: Array<{ name: string }>): Record<string, number> {
    const categories: Record<string, number> = {};
    
    tools.forEach(tool => {
      const category = this.getToolCategory(tool.name);
      categories[category] = (categories[category] || 0) + 1;
    });
    
    return categories;
  }

  private getToolCategory(toolName: string): string {
    if (toolName.includes('aoma') || toolName.includes('knowledge')) return 'Knowledge Management';
    if (toolName.includes('jira')) return 'Issue Tracking';
    if (toolName.includes('git') || toolName.includes('code')) return 'Development';
    if (toolName.includes('outlook') || toolName.includes('email')) return 'Communication';
    if (toolName.includes('health') || toolName.includes('metrics')) return 'Monitoring';
    if (toolName.includes('swarm') || toolName.includes('agent')) return 'AI Orchestration';
    if (toolName.includes('failure') || toolName.includes('performance')) return 'Analytics';
    if (toolName.includes('server') || toolName.includes('capabilities')) return 'System';
    return 'Utility';
  }

  private getToolExamples(toolName: string): string[] {
    const examples: Record<string, string[]> = {
      'query_aoma_knowledge': [
        'How do I configure AOMA for new artists?',
        'What are the troubleshooting steps for metadata sync issues?'
      ],
      'search_jira_tickets': [
        'Find all critical bugs in the mobile app',
        'Show me recent feature requests for the dashboard'
      ],
      'search_git_commits': [
        'Find commits related to authentication changes',
        'Show me recent API improvements'
      ],
      'search_code_files': [
        'Find TypeScript files with error handling patterns',
        'Locate React components using the new design system'
      ],
      'get_system_health': [
        'Check overall system status',
        'Get detailed service diagnostics'
      ]
    };
    
    return examples[toolName] || ['No examples available'];
  }

  async healthCheck(): Promise<{ healthy: boolean; error?: string }> {
    // This tool is always healthy as it only reports on internal state
    return { healthy: true };
  }
}
