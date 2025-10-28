/**
 * OpenAI Vector Store Retriever
 *
 * Wraps existing OpenAI Assistant vector store in LangChain v1.0 BaseRetriever interface
 * Provides standardized Document[] output for orchestration
 */

import { BaseRetriever, type BaseRetrieverInput } from '@langchain/core/retrievers';
import { Document } from '@langchain/core/documents';
import { OpenAIService } from '../openai.service.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('OpenAIVectorRetriever');

export interface OpenAIVectorRetrieverInput extends BaseRetrieverInput {
  openaiService: OpenAIService;
  k?: number;
}

/**
 * LangChain v1.0 retriever for OpenAI vector store
 * Wraps the existing 150+ AOMA documentation files
 */
export class OpenAIVectorRetriever extends BaseRetriever {
  lc_namespace = ['aoma-mesh-mcp', 'retrievers', 'openai-vector'];

  private openaiService: OpenAIService;
  private k: number;

  constructor(input: OpenAIVectorRetrieverInput) {
    super(input);
    this.openaiService = input.openaiService;
    this.k = input.k || 10;
  }

  async _getRelevantDocuments(query: string): Promise<Document[]> {
    try {
      logger.debug('Querying OpenAI vector store', {
        query: query.slice(0, 100),
        k: this.k
      });

      // Use existing direct vector store search
      const results = await this.openaiService.queryVectorStoreDirect(query, this.k);

      // Convert to LangChain Documents
      const documents = results.map((result: any) => {
        // Extract text content from OpenAI result format
        const content = this.extractContent(result);

        return new Document({
          pageContent: content,
          metadata: {
            source: 'openai_vector_store',
            filename: result.filename || 'unknown',
            score: result.score || 0,
            similarity: result.score || 0, // Normalize to same field as Supabase
            id: result.id,
            ...(result.metadata || {})
          }
        });
      });

      logger.info('OpenAI retrieval completed', {
        query: query.slice(0, 100),
        resultCount: documents.length,
        avgScore: documents.length > 0
          ? (documents.reduce((sum, d) => sum + (d.metadata.score || 0), 0) / documents.length).toFixed(3)
          : 0
      });

      return documents;

    } catch (error) {
      logger.error('OpenAI retriever error', { error });
      // Return empty array instead of throwing to allow graceful degradation
      return [];
    }
  }

  /**
   * Extract text content from OpenAI vector store result
   * Handles various result formats from OpenAI API
   */
  private extractContent(result: any): string {
    // OpenAI vector store returns content in different formats
    if (typeof result.content === 'string') {
      return result.content;
    }

    if (Array.isArray(result.content) && result.content.length > 0) {
      // Extract text from content array (common format)
      const textContent = result.content
        .filter((item: any) => item.type === 'text' || item.text)
        .map((item: any) => item.text || item)
        .join('\n');
      return textContent || '';
    }

    // Fallback: try to extract any text-like fields
    if (result.text) return result.text;
    if (result.pageContent) return result.pageContent;

    logger.warn('Could not extract content from OpenAI result', {
      filename: result.filename,
      contentType: typeof result.content
    });

    return '';
  }

  /**
   * Factory: Create retriever with custom k value
   */
  static create(
    openaiService: OpenAIService,
    k: number = 10
  ): OpenAIVectorRetriever {
    return new OpenAIVectorRetriever({
      openaiService,
      k
    });
  }
}
