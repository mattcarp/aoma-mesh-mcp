/**
 * OpenAI Service
 * 
 * Manages OpenAI client operations including assistant interactions,
 * vector store operations, and completion requests.
 */

import OpenAI from 'openai';
import { Environment } from '../config/environment.js';
import { createLogger } from '../utils/logger.js';
import { withRetry, withTimeout } from '../utils/errors.js';

const logger = createLogger('OpenAIService');

export class OpenAIService {
  private readonly client: OpenAI;
  private readonly assistantId: string;
  private readonly vectorStoreId?: string;
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly environment: Environment;
  private gpt5AssistantId?: string; // Cache for our GPT-5 assistant

  constructor(config: Environment) {
    this.environment = config;
    this.client = new OpenAI({
      apiKey: config.OPENAI_API_KEY,
      timeout: config.TIMEOUT_MS,
      maxRetries: config.MAX_RETRIES,
    });
    
    this.assistantId = config.AOMA_ASSISTANT_ID;
    this.vectorStoreId = config.OPENAI_VECTOR_STORE_ID;
    this.timeout = config.TIMEOUT_MS;
    this.maxRetries = config.MAX_RETRIES;
    
    logger.info('OpenAI service initialized', {
      assistantId: this.assistantId,
      hasVectorStore: !!this.vectorStoreId,
      timeout: this.timeout,
      maxRetries: this.maxRetries
    });
  }

  /**
   * Get or create a persistent GPT-5 assistant with vector store access
   * This avoids the performance overhead of creating/destroying assistants per query
   */
  private async ensureGPT5Assistant(): Promise<string> {
    // Return cached assistant if available
    if (this.gpt5AssistantId) {
      try {
        // Verify it still exists
        await this.client.beta.assistants.retrieve(this.gpt5AssistantId);
        return this.gpt5AssistantId;
      } catch (error) {
        logger.warn('Cached GPT-5 assistant no longer exists, creating new one', { error });
        this.gpt5AssistantId = undefined;
      }
    }

    // Create new GPT-5 assistant with vector store
    const baseInstructions = `You are an expert AOMA (Automated Operations and Metadata Assistant) system analyst with deep knowledge of Sony Music's technical infrastructure.

You have access to a comprehensive AOMA knowledge base through file search. Always search the knowledge base first for Sony Music-specific information about:
- USM (Unified Session Manager)  
- AOMA workflows and processes
- Digital asset management
- Cover hot swap functionality
- Metadata management systems
- Technical integrations and APIs

Provide accurate, detailed responses based on the knowledge base content, and clearly indicate when information comes from the AOMA knowledge base versus general knowledge.`;

    try {
      const assistant = await this.client.beta.assistants.create({
        name: 'AOMA-GPT5-Assistant',
        instructions: baseInstructions,
        model: 'gpt-5',
        tools: this.vectorStoreId ? [{ type: 'file_search' }] : [],
        tool_resources: this.vectorStoreId ? {
          file_search: {
            vector_store_ids: [this.vectorStoreId]
          }
        } : undefined
      });

      this.gpt5AssistantId = assistant.id;
      logger.info('Created persistent GPT-5 assistant', { 
        assistantId: this.gpt5AssistantId,
        vectorStoreId: this.vectorStoreId
      });
      
      return this.gpt5AssistantId;
    } catch (error) {
      logger.error('Failed to create GPT-5 assistant', { error });
      throw new Error(`Failed to create GPT-5 assistant: ${error}`);
    }
  }

  /**
   * Query AOMA knowledge base using persistent GPT-5 assistant with vector store
   * Much faster than creating temporary assistants - reuses the same GPT-5 assistant
   */
  async queryKnowledge(
    query: string,
    strategy: 'comprehensive' | 'focused' | 'rapid' = 'focused',
    context?: string
  ): Promise<string> {
    return withTimeout(
      () => withRetry(async () => {
        logger.debug('Querying AOMA knowledge with persistent GPT-5 assistant', { 
          query, 
          strategy, 
          hasContext: !!context,
          vectorStoreId: this.vectorStoreId 
        });

        // Get persistent GPT-5 assistant (much faster than creating temporary ones)
        const gpt5AssistantId = await this.ensureGPT5Assistant();

        // Build strategy-specific additional instructions
        const strategyInstructions = this.buildInstructions(strategy, context);
        
        // Create thread with strategy-specific context in the user message
        const enhancedQuery = context ? 
          `${query}\n\n[Strategy: ${strategy}] ${strategyInstructions}` :
          `${query}\n\n[Strategy: ${strategy}]`;

        const thread = await this.client.beta.threads.create({
          messages: [{
            role: 'user',
            content: enhancedQuery
          }]
        });

        const run = await this.client.beta.threads.runs.create(thread.id, {
          assistant_id: gpt5AssistantId,
          temperature: strategy === 'rapid' ? 0.1 : strategy === 'focused' ? 0.3 : 0.5,
          max_completion_tokens: strategy === 'comprehensive' ? 8000 : strategy === 'focused' ? 4000 : 2000,
        });

        // Wait for completion
        const result = await this.waitForRunCompletion(thread.id, run.id);
        
        // Cleanup thread (but keep the assistant for reuse)
        try {
          await this.client.beta.threads.del(thread.id);
        } catch (error) {
          logger.warn('Failed to cleanup thread', { error });
        }

        if (!result.success || !result.response) {
          throw new Error(result.error || 'No response content generated');
        }

        logger.info('AOMA knowledge query completed with persistent GPT-5 assistant', {
          query: query.slice(0, 100),
          strategy,
          model: 'gpt-5',
          vectorStoreUsed: !!this.vectorStoreId,
          responseLength: result.response.length,
          assistantId: gpt5AssistantId,
          persistent: true
        });

        return result.response;
      }, this.maxRetries, 1000, 'AOMA knowledge query'),
      this.timeout,
      'AOMA knowledge query timeout'
    );
  }

  /**
   * Wait for assistant run to complete
   */
  private async waitForRunCompletion(threadId: string, runId: string): Promise<{
    success: boolean;
    response?: string;
    error?: string;
  }> {
    const maxWaitTime = 30000; // 30 seconds
    const pollInterval = 1000; // 1 second
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const run = await this.client.beta.threads.runs.retrieve(threadId, runId);
        
        if (run.status === 'completed') {
          const messages = await this.client.beta.threads.messages.list(threadId);
          const lastMessage = messages.data[0];
          
          if (lastMessage && lastMessage.content[0]?.type === 'text') {
            return {
              success: true,
              response: lastMessage.content[0].text.value
            };
          }
          
          return { success: false, error: 'No response content found' };
        }
        
        if (run.status === 'failed' || run.status === 'cancelled' || run.status === 'expired') {
          return {
            success: false,
            error: `Run ${run.status}: ${run.last_error?.message || 'Unknown error'}`
          };
        }
        
        // Still running, wait and poll again
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Polling error'
        };
      }
    }
    
    return { success: false, error: 'Run timeout exceeded' };
  }

  /**
   * Check OpenAI service health
   */
  async healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      await withTimeout(
        () => this.client.models.list(),
        5000,
        'OpenAI health check'
      );
      
      const latency = Date.now() - startTime;
      logger.debug('OpenAI health check passed', { latency });
      
      return { healthy: true, latency };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.warn('OpenAI health check failed', { error: errorMessage });
      
      return { 
        healthy: false, 
        error: errorMessage,
        latency: Date.now() - startTime
      };
    }
  }

  /**
   * Build instruction prompt based on strategy
   */
  private buildInstructions(strategy: string, context?: string): string {
    const baseInstructions = `You are an expert AOMA (Automated Operations and Metadata Assistant) system analyst with deep knowledge of Sony Music's technical infrastructure.`;
    
    const strategyInstructions = {
      comprehensive: 'Provide a detailed, thorough analysis covering all relevant aspects. Include technical details, context, and actionable recommendations.',
      focused: 'Provide a concise, targeted response that directly addresses the query with essential information and clear next steps.',
      rapid: 'Provide a brief, high-level summary focusing on the most critical points and immediate action items.'
    };

    const contextInstr = context ? `\n\nAdditional Context: ${context}` : '';
    
    return `${baseInstructions}\n\n${strategyInstructions[strategy as keyof typeof strategyInstructions] || strategyInstructions.focused}${contextInstr}`;
  }

  /**
   * Search vector store for relevant documents
   */
  async searchVectorStore(query: string, limit: number = 5): Promise<any[]> {
    try {
      if (!this.environment.OPENAI_VECTOR_STORE_ID) {
        return [];
      }
      
      // Use vector store search (placeholder - actual implementation would use embeddings)
      // For now, return empty array as this is used by LangGraph
      return [];
    } catch (error) {
      console.error('Vector store search error:', error);
      return [];
    }
  }

}
