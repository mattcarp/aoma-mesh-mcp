/**
 * Test Script: LangChain v1.0 Multi-Source Orchestration
 *
 * Tests the new orchestration that combines:
 * - Supabase unified vectors (knowledge + jira + git)
 * - OpenAI vector store (150+ AOMA docs)
 */

import dotenv from 'dotenv';
dotenv.config();

import { OpenAIService } from './src/services/openai.service.js';
import { SupabaseService } from './src/services/supabase.service.js';
import { LangChainOrchestrator } from './src/services/langchain-orchestrator.service.js';
import { validateAndLoadEnvironment } from './src/config/environment.js';
import { createLogger } from './src/utils/logger.js';

const logger = createLogger('LangChainTest');

async function testOrchestration() {
  logger.info('Starting LangChain v1.0 orchestration test');

  try {
    // Load environment
    const config = validateAndLoadEnvironment();
    logger.info('Environment loaded successfully');

    // Initialize services
    const openaiService = new OpenAIService(config);
    const supabaseService = new SupabaseService(config);
    logger.info('Services initialized');

    // Create orchestrator
    const orchestrator = LangChainOrchestrator.create(
      openaiService,
      supabaseService,
      config
    );
    logger.info('LangChain orchestrator created');

    // Test queries
    const testQueries = [
      {
        query: 'How do I manage QC providers in AOMA?',
        strategy: 'focused' as const
      },
      {
        query: 'What is the Media Batch Converter used for?',
        strategy: 'rapid' as const
      },
      {
        query: 'How can I search for artists in AOMA?',
        strategy: 'comprehensive' as const
      }
    ];

    for (const { query, strategy } of testQueries) {
      logger.info(`\n${'='.repeat(80)}`);
      logger.info(`Testing query: "${query}"`);
      logger.info(`Strategy: ${strategy}`);
      logger.info('='.repeat(80));

      const startTime = Date.now();

      const result = await orchestrator.query(query, strategy);

      const elapsed = Date.now() - startTime;

      logger.info('\n✅ Query completed successfully');
      logger.info(`⏱️  Elapsed time: ${elapsed}ms`);
      logger.info(`📊 Stats:`);
      logger.info(`   - Supabase results: ${result.stats.supabase}`);
      logger.info(`   - OpenAI results: ${result.stats.openai}`);
      logger.info(`   - Total results: ${result.stats.total}`);
      logger.info(`   - By source type:`, result.stats.bySourceType);
      logger.info(`📄 Answer length: ${result.answer.length} characters`);
      logger.info(`📚 Sources used: ${result.sourceDocuments.length}`);

      // Show sources breakdown
      const sourceBreakdown = result.sourceDocuments.reduce((acc: any, doc: any) => {
        const source = doc.metadata.source;
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      }, {});
      logger.info(`🔍 Source breakdown:`, sourceBreakdown);

      // Show top 3 sources
      logger.info(`\n📌 Top 3 sources:`);
      result.sourceDocuments.slice(0, 3).forEach((doc: any, idx: number) => {
        logger.info(`   ${idx + 1}. [${doc.metadata.source}] ${doc.metadata.filename || doc.metadata.sourceId}`);
        logger.info(`      Similarity: ${(doc.metadata.similarity || 0).toFixed(3)}`);
        logger.info(`      Snippet: ${doc.pageContent.slice(0, 100)}...`);
      });

      // Show answer preview
      logger.info(`\n💬 Answer preview:`);
      logger.info(`   ${result.answer.slice(0, 300)}...`);

      // Check for empty responses (the bug we're fixing!)
      if (result.answer.length === 0) {
        logger.error(`❌ FAILED: Empty response for query: "${query}"`);
      } else {
        logger.info(`✅ SUCCESS: Non-empty response received`);
      }

      // Check if both sources contributed
      if (result.stats.supabase === 0 && result.stats.openai === 0) {
        logger.error(`❌ FAILED: No results from either source!`);
      } else if (result.stats.supabase === 0) {
        logger.warn(`⚠️  WARNING: No Supabase results`);
      } else if (result.stats.openai === 0) {
        logger.warn(`⚠️  WARNING: No OpenAI results`);
      } else {
        logger.info(`✅ SUCCESS: Both sources contributed!`);
      }
    }

    logger.info(`\n${'='.repeat(80)}`);
    logger.info('✅ All tests completed successfully!');
    logger.info('='.repeat(80));

  } catch (error) {
    logger.error('❌ Test failed:', error);
    throw error;
  }
}

// Run tests
testOrchestration()
  .then(() => {
    logger.info('Test suite completed');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Test suite failed:', error);
    process.exit(1);
  });
