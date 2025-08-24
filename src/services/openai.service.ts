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

  constructor(config: Environment) {
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
   * Query AOMA knowledge base using assistant
   */
  async queryKnowledge(
    query: string,
    strategy: 'comprehensive' | 'focused' | 'rapid' = 'focused',
    context?: string
  ): Promise<string> {
    return withTimeout(
      () => withRetry(async () => {
        logger.debug('Querying AOMA knowledge', { query, strategy, hasContext: !!context });

        const instructions = this.buildInstructions(strategy, context);
        const thread = await this.client.beta.threads.create({
          messages: [
            {
              role: 'user',
              content: `${instructions}\n\nQuery: ${query}`
            }
          ]
        });

        const run = await this.client.beta.threads.runs.create(thread.id, {
          assistant_id: this.assistantId,
        });

        const result = await this.waitForRunCompletion(thread.id, run.id);
        
        if (!result.success) {
          throw new Error(result.error || 'Assistant run failed');
        }

        logger.info('AOMA knowledge query completed', {
          query: query.slice(0, 100),
          strategy,
          responseLength: result.response?.length || 0
        });

        return result.response || 'No response generated';
      }, this.maxRetries, 1000, 'AOMA knowledge query'),
      this.timeout,
      'AOMA knowledge query timeout'
    );
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
}
