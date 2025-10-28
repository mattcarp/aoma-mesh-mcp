/**
 * LangChain v1.0 Orchestrator Service
 *
 * Orchestrates multi-source RAG using:
 * - Supabase unified vectors (knowledge + jira + git)
 * - OpenAI vector store (150+ AOMA docs)
 *
 * Combines results, reranks by relevance, and generates comprehensive answers using GPT-5
 */

import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { Document } from '@langchain/core/documents';
import { SupabaseUnifiedRetriever } from './retrievers/supabase-unified-retriever.js';
import { OpenAIVectorRetriever } from './retrievers/openai-vector-retriever.js';
import { OpenAIService } from './openai.service.js';
import { SupabaseService } from './supabase.service.js';
import { Environment } from '../types/environment.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('LangChainOrchestrator');

export interface OrchestrationResult {
  answer: string;
  sourceDocuments: Document[];
  stats: {
    supabase: number;
    openai: number;
    total: number;
    bySourceType: Record<string, number>;
  };
}

export type OrchestrationStrategy = 'comprehensive' | 'focused' | 'rapid';

/**
 * Multi-source RAG orchestrator using LangChain v1.0
 */
export class LangChainOrchestrator {
  private chatModel: ChatOpenAI;
  private embeddings: OpenAIEmbeddings;
  private supabaseRetriever: SupabaseUnifiedRetriever;
  private openaiRetriever: OpenAIVectorRetriever;

  constructor(
    private openaiService: OpenAIService,
    private supabaseService: SupabaseService,
    private config: Environment
  ) {
    // Initialize GPT-5 chat model
    this.chatModel = new ChatOpenAI({
      modelName: 'gpt-5-2025-08-07',
      temperature: 1,
      openAIApiKey: config.OPENAI_API_KEY,
    });

    // Initialize OpenAI embeddings for Supabase queries
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: config.OPENAI_API_KEY,
      modelName: 'text-embedding-ada-002',
    });

    // Initialize retrievers
    this.supabaseRetriever = SupabaseUnifiedRetriever.forAll(
      this.supabaseService.client,
      this.embeddings,
      10,
      0.7
    );

    this.openaiRetriever = OpenAIVectorRetriever.create(this.openaiService, 10);
  }

  /**
   * Main query method - orchestrates multi-source retrieval and synthesis
   */
  async query(
    query: string,
    strategy: OrchestrationStrategy = 'focused',
    additionalContext?: string
  ): Promise<OrchestrationResult> {
    const startTime = Date.now();

    logger.info('Starting multi-source orchestration', {
      query: query.slice(0, 100),
      strategy,
      hasAdditionalContext: !!additionalContext
    });

    try {
      // 1. Retrieve from BOTH sources in parallel
      const [supabaseResults, openaiResults] = await Promise.all([
        this.supabaseRetriever.getRelevantDocuments(query).catch((error) => {
          logger.error('Supabase retrieval failed', { error });
          return [];
        }),
        this.openaiRetriever.getRelevantDocuments(query).catch((error) => {
          logger.error('OpenAI retrieval failed', { error });
          return [];
        }),
      ]);

      logger.debug('Retrieved documents from sources', {
        supabase: supabaseResults.length,
        openai: openaiResults.length
      });

      // 2. Combine and rank by similarity score
      const allDocs = [...supabaseResults, ...openaiResults];
      allDocs.sort((a, b) => (b.metadata.similarity || 0) - (a.metadata.similarity || 0));

      // 3. Select top N based on strategy
      const topN = this.getTopN(strategy);
      const topDocs = allDocs.slice(0, topN);

      logger.info('Reranked and filtered documents', {
        total: allDocs.length,
        selected: topDocs.length,
        topN
      });

      // 4. Generate answer using GPT-5 with context
      const answer = await this.generateAnswer(query, topDocs, additionalContext);

      const elapsed = Date.now() - startTime;

      logger.info('Orchestration complete', {
        query: query.slice(0, 100),
        elapsed: `${elapsed}ms`,
        answerLength: answer.length,
        sourcesUsed: topDocs.length
      });

      return {
        answer,
        sourceDocuments: topDocs,
        stats: {
          supabase: supabaseResults.length,
          openai: openaiResults.length,
          total: allDocs.length,
          bySourceType: this.countBySourceType(supabaseResults)
        }
      };

    } catch (error) {
      logger.error('Orchestration failed', { error, query: query.slice(0, 100) });
      throw error;
    }
  }

  /**
   * Generate answer using LangChain v1.0 RunnableSequence
   */
  private async generateAnswer(
    query: string,
    documents: Document[],
    additionalContext?: string
  ): Promise<string> {
    // Build context string from documents
    const contextParts = documents.map((doc, idx) => {
      const source = doc.metadata.sourceType || doc.metadata.source || 'unknown';
      const filename = doc.metadata.filename || doc.metadata.sourceId || 'unknown';
      const similarity = (doc.metadata.similarity || 0).toFixed(3);

      return `[Source ${idx + 1}: ${source}/${filename} (similarity: ${similarity})]\n${doc.pageContent}`;
    });

    const context = contextParts.join('\n\n---\n\n');

    // Build prompt
    const promptTemplate = ChatPromptTemplate.fromMessages([
      ['system', `You are an expert AOMA (Asset and Offering Management Application) analyst with access to comprehensive knowledge from multiple sources including:
- AOMA documentation and user guides
- JIRA tickets and issue history
- Git commit history and code changes

Provide detailed, accurate answers citing specific sources when possible. If information is not available, say so clearly.`],
      ['user', `Context from multiple sources:

{context}

${additionalContext ? `\nAdditional context: ${additionalContext}\n` : ''}
Question: {question}

Provide a comprehensive answer based on the available sources.`]
    ]);

    // Create chain using RunnableSequence (LangChain v1.0 pattern)
    const chain = RunnableSequence.from([
      promptTemplate,
      this.chatModel,
      new StringOutputParser()
    ]);

    // Execute chain
    const answer = await chain.invoke({
      context,
      question: query
    });

    return answer;
  }

  /**
   * Get top N documents based on strategy
   */
  private getTopN(strategy: OrchestrationStrategy): number {
    switch (strategy) {
      case 'comprehensive':
        return 20;
      case 'focused':
        return 10;
      case 'rapid':
        return 5;
      default:
        return 10;
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
   * Factory: Create orchestrator with specific strategy defaults
   */
  static create(
    openaiService: OpenAIService,
    supabaseService: SupabaseService,
    config: Environment
  ): LangChainOrchestrator {
    return new LangChainOrchestrator(openaiService, supabaseService, config);
  }
}
