/**
 * AOMA Knowledge Query Tool
 * 
 * Queries the enterprise AOMA knowledge base using OpenAI assistant
 * with semantic vector search capabilities.
 */

import { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { BaseTool, ToolExecutionContext } from '../base/tool.interface';
import { OpenAIService } from '../../services/openai.service';
import { SupabaseService } from '../../services/supabase.service';
import { LangChainOrchestrator } from '../../services/langchain-orchestrator.service';
import { Environment } from '../../types/environment';
import { AOMAQueryRequest } from '../../types/requests';

export class AOMAKnowledgeTool extends BaseTool {
  readonly definition: Tool = {
    name: 'query_aoma_knowledge',
    description: 'Query enterprise AOMA knowledge base using multi-source AI orchestration (Supabase + OpenAI vector stores)',
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
          description: 'Maximum knowledge base results to consider (deprecated - now handled by strategy)',
          minimum: 1,
          maximum: 20,
          default: 10,
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
  };

  private orchestrator: LangChainOrchestrator;

  constructor(
    private readonly openaiService: OpenAIService,
    private readonly supabaseService: SupabaseService,
    private readonly config: Environment
  ) {
    super();
    // Initialize LangChain v1.0 orchestrator
    this.orchestrator = LangChainOrchestrator.create(
      openaiService,
      supabaseService,
      config
    );
  }

  async execute(args: Record<string, unknown>, context: ToolExecutionContext): Promise<CallToolResult> {
    const request = args as AOMAQueryRequest;
    const { query, strategy = 'focused', context: additionalContext } = request;

    context.logger.info('Executing multi-source AOMA knowledge query', {
      query: query.slice(0, 100),
      strategy,
      hasContext: !!additionalContext
    });

    try {
      // Use LangChain v1.0 orchestrator for multi-source retrieval
      // This queries BOTH Supabase (knowledge + jira + git) AND OpenAI vector store in parallel
      const orchestrationResult = await this.orchestrator.query(
        query,
        strategy as 'comprehensive' | 'focused' | 'rapid',
        additionalContext
      );

      context.logger.debug('Multi-source orchestration completed', {
        sources: {
          supabase: orchestrationResult.stats.supabase,
          openai: orchestrationResult.stats.openai,
          total: orchestrationResult.stats.total
        },
        bySourceType: orchestrationResult.stats.bySourceType
      });

      const result = {
        response: orchestrationResult.answer,
        sources: orchestrationResult.sourceDocuments.map(doc => ({
          source: doc.metadata.source,
          sourceType: doc.metadata.sourceType,
          filename: doc.metadata.filename || doc.metadata.sourceId,
          similarity: doc.metadata.similarity,
          snippet: doc.pageContent.slice(0, 200) + '...'
        })),
        strategy,
        queryMetadata: {
          originalQuery: query,
          sourceStats: orchestrationResult.stats,
          responseLength: orchestrationResult.answer.length,
          timestamp: new Date().toISOString()
        }
      };

      context.logger.info('Multi-source AOMA knowledge query completed successfully', {
        responseLength: orchestrationResult.answer.length,
        sourcesUsed: orchestrationResult.sourceDocuments.length,
        supabaseSources: orchestrationResult.stats.supabase,
        openaiSources: orchestrationResult.stats.openai
      });

      return this.success(result);
    } catch (error) {
      context.logger.error('Multi-source AOMA knowledge query failed', { error });
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
}
