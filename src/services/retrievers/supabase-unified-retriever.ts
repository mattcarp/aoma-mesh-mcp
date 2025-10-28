/**
 * Supabase Unified Vector Retriever
 *
 * Retrieves documents from the unified aoma_unified_vectors table
 * using LangChain v1.0 BaseRetriever interface
 */

import { BaseRetriever, type BaseRetrieverInput } from '@langchain/core/retrievers';
import { Document } from '@langchain/core/documents';
import { SupabaseClient } from '@supabase/supabase-js';
import { OpenAIEmbeddings } from '@langchain/openai';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('SupabaseUnifiedRetriever');

export interface SupabaseUnifiedRetrieverInput extends BaseRetrieverInput {
  supabaseClient: SupabaseClient;
  embeddings: OpenAIEmbeddings;
  sourceTypes?: string[];
  k?: number;
  threshold?: number;
}

/**
 * LangChain v1.0 retriever for Supabase unified vector store
 * Queries aoma_unified_vectors table with source_type filtering
 */
export class SupabaseUnifiedRetriever extends BaseRetriever {
  lc_namespace = ['aoma-mesh-mcp', 'retrievers', 'supabase-unified'];

  private supabaseClient: SupabaseClient;
  private embeddings: OpenAIEmbeddings;
  private sourceTypes: string[];
  private k: number;
  private threshold: number;

  constructor(input: SupabaseUnifiedRetrieverInput) {
    super(input);
    this.supabaseClient = input.supabaseClient;
    this.embeddings = input.embeddings;
    this.sourceTypes = input.sourceTypes || ['knowledge', 'jira', 'git'];
    this.k = input.k || 10;
    this.threshold = input.threshold || 0.7;
  }

  async _getRelevantDocuments(query: string): Promise<Document[]> {
    try {
      // 1. Get query embedding using OpenAI
      logger.debug('Generating embedding for query', {
        query: query.slice(0, 100),
        sourceTypes: this.sourceTypes
      });

      const queryEmbedding = await this.embeddings.embedQuery(query);

      // 2. DUAL-QUERY STRATEGY: Query both unified table AND legacy git_file_embeddings
      logger.debug('Querying Supabase with dual-query strategy', {
        sourceTypes: this.sourceTypes,
        k: this.k,
        threshold: this.threshold
      });

      // Query unified table
      const unifiedPromise = this.supabaseClient.rpc('match_aoma_vectors', {
        query_embedding: queryEmbedding,
        match_threshold: this.threshold,
        match_count: this.k,
        filter_source_types: this.sourceTypes
      });

      // Query legacy git_file_embeddings table (if 'git' is in sourceTypes)
      // NOTE: Function name is match_git_files not search_git_files
      const gitPromise = this.sourceTypes.includes('git')
        ? this.supabaseClient.rpc('match_git_files', {
            query_embedding: queryEmbedding,
            match_count: this.k,
            match_threshold: this.threshold
          })
        : Promise.resolve({ data: [], error: null });

      // Execute both queries in parallel
      const [unifiedResult, gitResult] = await Promise.all([unifiedPromise, gitPromise]);

      if (unifiedResult.error) {
        logger.warn('Unified table search failed', { error: unifiedResult.error });
      }

      if (gitResult.error) {
        logger.warn('Git files search failed', { error: gitResult.error });
      }

      // 3. Convert unified table results to LangChain Documents
      const unifiedDocs = (unifiedResult.data || []).map((item: any) => new Document({
        pageContent: item.content || '',
        metadata: {
          source: 'supabase_unified',
          sourceType: item.source_type,
          sourceId: item.source_id,
          similarity: item.similarity || 0,
          id: item.id,
          createdAt: item.created_at,
          ...(item.metadata || {})
        }
      }));

      // 4. Convert legacy git results to LangChain Documents
      const gitDocs = (gitResult.data || []).map((item: any) => new Document({
        pageContent: item.content || '',
        metadata: {
          source: 'supabase_git_legacy',
          sourceType: 'git',
          sourceId: item.file_path,
          similarity: item.similarity || 0,
          id: item.id,
          repoPath: item.repo_path,
          filePath: item.file_path
        }
      }));

      // 5. Merge and deduplicate results
      const allDocs = [...unifiedDocs, ...gitDocs];

      // Sort by similarity and take top k
      allDocs.sort((a, b) => (b.metadata.similarity || 0) - (a.metadata.similarity || 0));
      const documents = allDocs.slice(0, this.k);

      logger.info('Dual-query retrieval completed', {
        query: query.slice(0, 100),
        unifiedResults: unifiedDocs.length,
        legacyGitResults: gitDocs.length,
        totalMerged: allDocs.length,
        finalCount: documents.length,
        avgSimilarity: documents.length > 0
          ? (documents.reduce((sum, d) => sum + (d.metadata.similarity || 0), 0) / documents.length).toFixed(3)
          : 0,
        bySourceType: this.countBySourceType(documents)
      });

      return documents;

    } catch (error) {
      logger.error('Supabase retriever error', { error });
      // Return empty array instead of throwing to allow graceful degradation
      return [];
    }
  }

  /**
   * Count documents by source type for analytics
   */
  private countBySourceType(docs: Document[]): Record<string, number> {
    const counts: Record<string, number> = {};
    docs.forEach(doc => {
      const type = doc.metadata.sourceType || 'unknown';
      counts[type] = (counts[type] || 0) + 1;
    });
    return counts;
  }

  /**
   * Factory: Create retriever for knowledge docs only
   */
  static forKnowledge(
    supabaseClient: SupabaseClient,
    embeddings: OpenAIEmbeddings,
    k = 10,
    threshold = 0.7
  ): SupabaseUnifiedRetriever {
    return new SupabaseUnifiedRetriever({
      supabaseClient,
      embeddings,
      sourceTypes: ['knowledge'],
      k,
      threshold
    });
  }

  /**
   * Factory: Create retriever for JIRA tickets only
   */
  static forJira(
    supabaseClient: SupabaseClient,
    embeddings: OpenAIEmbeddings,
    k = 10,
    threshold = 0.6
  ): SupabaseUnifiedRetriever {
    return new SupabaseUnifiedRetriever({
      supabaseClient,
      embeddings,
      sourceTypes: ['jira'],
      k,
      threshold: threshold // JIRA uses slightly lower threshold
    });
  }

  /**
   * Factory: Create retriever for all populated sources
   * Excludes 'email' as it's not yet populated
   */
  static forAll(
    supabaseClient: SupabaseClient,
    embeddings: OpenAIEmbeddings,
    k = 10,
    threshold = 0.7
  ): SupabaseUnifiedRetriever {
    return new SupabaseUnifiedRetriever({
      supabaseClient,
      embeddings,
      sourceTypes: ['knowledge', 'jira', 'git'], // Exclude unpopulated sources
      k,
      threshold
    });
  }
}
