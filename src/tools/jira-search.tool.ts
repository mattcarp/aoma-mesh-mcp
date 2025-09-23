/**
 * Jira Search Tool
 * 
 * Searches enterprise Jira tickets using semantic vector search
 * with advanced filtering capabilities.
 */

import { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { BaseTool, ToolExecutionContext } from '../base/tool.interface';
import { SupabaseService } from '../../services/supabase.service';
import { JiraSearchRequest } from '../../types/requests';

export class JiraSearchTool extends BaseTool {
  readonly definition: Tool = {
    name: 'search_jira_tickets',
    description: 'Search enterprise Jira tickets using semantic vector search',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Natural language search query for Jira tickets',
          minLength: 1,
          maxLength: 500,
        },
        projectKey: {
          type: 'string',
          description: 'Specific Jira project key to filter results',
          pattern: '^[A-Z]+$',
        },
        status: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by ticket status (e.g., ["Open", "In Progress", "Resolved"])',
        },
        priority: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by priority (e.g., ["High", "Critical", "Medium"])',
        },
        maxResults: {
          type: 'number',
          description: 'Maximum tickets to return',
          minimum: 1,
          maximum: 50,
          default: 15,
        },
        threshold: {
          type: 'number',
          description: 'Semantic similarity threshold (0-1)',
          minimum: 0,
          maximum: 1,
          default: 0.6,
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
  };

  constructor(private readonly supabaseService: SupabaseService) {
    super();
  }

  async execute(args: Record<string, unknown>, context: ToolExecutionContext): Promise<CallToolResult> {
    const request = args as JiraSearchRequest;
    const { 
      query, 
      projectKey, 
      status, 
      priority, 
      maxResults = 15, 
      threshold = 0.6 
    } = request;

    context.logger.info('Executing Jira ticket search', {
      query: query.slice(0, 100),
      projectKey,
      status,
      priority,
      maxResults,
      threshold
    });

    try {
      const tickets = await this.supabaseService.searchJiraTickets(query, {
        projectKey,
        status,
        priority,
        maxResults,
        threshold
      });

      // Format results for better readability
      const formattedResults = tickets.map(ticket => ({
        key: ticket.key,
        summary: ticket.summary,
        status: ticket.status,
        priority: ticket.priority,
        assignee: ticket.assignee,
        reporter: ticket.reporter,
        created: ticket.created,
        updated: ticket.updated,
        project: ticket.project,
        similarity: Number(ticket.similarity?.toFixed(3)) || 0,
        description: ticket.description ? 
          (ticket.description.length > 200 ? ticket.description.slice(0, 200) + '...' : ticket.description) : 
          null,
        url: ticket.url || `https://sonymusic.atlassian.net/browse/${ticket.key}`
      }));

      const result = {
        query,
        filters: {
          projectKey: projectKey || 'All Projects',
          status: status || ['All Statuses'],
          priority: priority || ['All Priorities'],
          threshold
        },
        results: formattedResults,
        metadata: {
          totalResults: formattedResults.length,
          maxResults,
          avgSimilarity: formattedResults.length > 0 
            ? (formattedResults.reduce((sum, t) => sum + t.similarity, 0) / formattedResults.length).toFixed(3)
            : 0,
          searchTimestamp: new Date().toISOString()
        }
      };

      context.logger.info('Jira search completed successfully', {
        resultCount: formattedResults.length,
        avgSimilarity: result.metadata.avgSimilarity
      });

      return this.success(result);
    } catch (error) {
      context.logger.error('Jira search failed', { error });
      return this.error('Failed to search Jira tickets', { error: error instanceof Error ? error.message : error });
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
