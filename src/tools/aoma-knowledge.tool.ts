/**
 * AOMA Knowledge Query Tool
 * 
 * Queries the Sony Music AOMA knowledge base using OpenAI assistant
 * with semantic vector search capabilities.
 */

import { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { BaseTool, ToolExecutionContext } from '../base/tool.interface.js';
import { OpenAIService } from '../../services/openai.service.js';
import { SupabaseService } from '../../services/supabase.service.js';
import { AOMAQueryRequest } from '../../types/requests.js';

export class AOMAKnowledgeTool extends BaseTool {
  readonly definition: Tool = {
    name: 'query_aoma_knowledge',
    description: 'Query Sony Music AOMA knowledge base using AI assistant with 1000+ documents',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Natural language query about AOMA systems, procedures, or technical guidance',
          minLength: 1,
          maxLength: 2000,
        },
        strategy: {
          type: 'string',
          enum: ['comprehensive', 'focused', 'rapid'],
          description: 'Response strategy: comprehensive (detailed), focused (specific), rapid (concise)',
          default: 'focused',
        },
        context: {
          type: 'string',
          description: 'Additional context about your current task or system',
          maxLength: 1000,
        },
        maxResults: {
          type: 'number',
          description: 'Maximum knowledge base results to consider',
          minimum: 1,
          maximum: 20,
          default: 10,
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
  };

  constructor(
    private readonly openaiService: OpenAIService,
    private readonly supabaseService: SupabaseService
  ) {
    super();
  }

  async execute(args: Record<string, unknown>, context: ToolExecutionContext): Promise<CallToolResult> {
    const request = args as AOMAQueryRequest;
    const { query, strategy = 'focused', context: additionalContext, maxResults = 10 } = request;

    context.logger.info('Executing AOMA knowledge query', {
      query: query.slice(0, 100),
      strategy,
      maxResults,
      hasContext: !!additionalContext
    });

    try {
      // First, search for relevant knowledge base entries
      const vectorResults = await this.supabaseService.searchKnowledge(query, maxResults, 0.7);
      
      context.logger.debug('Vector search completed', {
        resultCount: vectorResults.length,
        avgSimilarity: vectorResults.length > 0 
          ? (vectorResults.reduce((sum, r) => sum + r.similarity, 0) / vectorResults.length).toFixed(3)
          : 0
      });

      // Enhance query with vector search context
      const contextualQuery = this.buildContextualQuery(query, vectorResults, additionalContext);

      // Get AI-powered response using OpenAI assistant
      const response = await this.openaiService.queryKnowledge(contextualQuery, strategy, additionalContext);

      const result = {
        response,
        vectorResults: vectorResults.map(r => ({
          title: r.title,
          similarity: r.similarity,
          url: r.url,
          snippet: r.content.slice(0, 200) + '...'
        })),
        strategy,
        queryMetadata: {
          originalQuery: query,
          vectorResultCount: vectorResults.length,
          responseLength: response.length,
          timestamp: new Date().toISOString()
        }
      };

      context.logger.info('AOMA knowledge query completed successfully', {
        responseLength: response.length,
        vectorResultCount: vectorResults.length
      });

      return this.success(result);
    } catch (error) {
      context.logger.error('AOMA knowledge query failed', { error });
      return this.error('Failed to query AOMA knowledge base', { error: error instanceof Error ? error.message : error });
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; error?: string }> {
    try {
      // Test both OpenAI and Supabase connectivity
      const [openaiHealth, supabaseHealth] = await Promise.all([
        this.openaiService.healthCheck(),
        this.supabaseService.healthCheck()
      ]);

      if (!openaiHealth.healthy) {
        return { healthy: false, error: `OpenAI service unhealthy: ${openaiHealth.error}` };
      }

      if (!supabaseHealth.healthy) {
        return { healthy: false, error: `Supabase service unhealthy: ${supabaseHealth.error}` };
      }

      return { healthy: true };
    } catch (error) {
      return { 
        healthy: false, 
        error: error instanceof Error ? error.message : 'Unknown health check error' 
      };
    }
  }

  private buildContextualQuery(originalQuery: string, vectorResults: any[], context?: string): string {
    if (vectorResults.length === 0) {
      return originalQuery;
    }

    const relevantContext = vectorResults
      .slice(0, 3) // Top 3 most relevant
      .map(r => `- ${r.title}: ${r.content.slice(0, 300)}...`)
      .join('\n');

    const contextSection = context ? `\nAdditional Context: ${context}` : '';

    return `Query: ${originalQuery}

Relevant AOMA Knowledge Base Entries:
${relevantContext}${contextSection}

Please provide a comprehensive response based on the query and the relevant knowledge base entries above.`;
  }
}
