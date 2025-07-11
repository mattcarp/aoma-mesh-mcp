/**
 * Jira Ticket Count Tool
 * 
 * Gets exact count of Jira tickets across all projects and statuses
 * with optional filtering capabilities.
 */

import { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { BaseTool, ToolExecutionContext } from '../base/tool.interface';
import { SupabaseService } from '../../services/supabase.service';
import { JiraCountRequest } from '../../types/requests';

export class JiraCountTool extends BaseTool {
  readonly definition: Tool = {
    name: 'get_jira_ticket_count',
    description: 'Get exact count of Jira tickets across all projects and statuses',
    inputSchema: {
      type: 'object',
      properties: {
        projectKey: {
          type: 'string',
          description: 'Optional: Count tickets for specific project (e.g., "ITSM")',
          pattern: '^[A-Z]+$',
        },
        status: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional: Count tickets with specific statuses',
        },
        priority: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional: Count tickets with specific priorities',
        },
      },
      additionalProperties: false,
    },
  };

  constructor(private readonly supabaseService: SupabaseService) {
    super();
  }

  async execute(args: Record<string, unknown>, context: ToolExecutionContext): Promise<CallToolResult> {
    const request = args as JiraCountRequest;
    const { projectKey, status, priority } = request;

    context.logger.info('Getting Jira ticket count', { projectKey, status, priority });

    try {
      const count = await this.supabaseService.getJiraTicketCount({
        projectKey,
        status,
        priority
      });

      const result = {
        count,
        filters: {
          projectKey: projectKey || 'All Projects',
          status: status || ['All Statuses'],
          priority: priority || ['All Priorities']
        },
        metadata: {
          timestamp: new Date().toISOString(),
          queryType: 'count'
        }
      };

      context.logger.info('Jira ticket count completed', { count, filters: result.filters });

      return this.success(result);
    } catch (error) {
      context.logger.error('Jira count failed', { error });
      return this.error('Failed to get Jira ticket count', { error: error instanceof Error ? error.message : error });
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; error?: string }> {
    try {
      const health = await this.supabaseService.healthCheck();
      return {
        healthy: health.healthy,
        error: health.error
      };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown health check error'
      };
    }
  }
}
