#!/usr/bin/env tsx
/**
 * Test GPT-5 with AOMA-specific queries that should match vector store
 */

import { config } from 'dotenv';
import { OpenAIService } from './src/services/openai.service.js';
import { Environment } from './src/config/environment.js';

// Load environment variables
config();

async function testAOMAQueries() {
  console.log('🧪 Testing GPT-5 with AOMA Queries\n');
  console.log('═'.repeat(60));

  // Initialize OpenAI service
  const env: Environment = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
    AOMA_ASSISTANT_ID: process.env.AOMA_ASSISTANT_ID || '',
    OPENAI_VECTOR_STORE_ID: process.env.OPENAI_VECTOR_STORE_ID,
    TIMEOUT_MS: 60000,
    MAX_RETRIES: 3,
  } as Environment;

  const openaiService = new OpenAIService(env);

  // Test with multiple AOMA queries
  const queries = [
    'How do I manage QC providers in AOMA?',
    'What is the Media Batch Converter used for?',
    'How can I search for artists in AOMA?',
  ];

  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];
    console.log(`\n${i + 1}️⃣ Query ${i + 1}: "${query}"`);
    console.log('─'.repeat(60));

    const startTime = Date.now();

    try {
      const result = await openaiService.queryKnowledgeFast(query, 'focused');
      const duration = Date.now() - startTime;

      console.log(`   ✓ Response received in ${duration}ms (${(duration / 1000).toFixed(1)}s)`);
      console.log(`   ✓ Response length: ${result.length} characters`);

      if (result.length > 0) {
        console.log(`\n   Preview (first 300 chars):\n   ${result.substring(0, 300)}...`);
      } else {
        console.log(`   ⚠️  Empty response!`);
      }

    } catch (error: any) {
      console.error(`   ✗ Query failed:`, error.message);
    }
  }

  console.log('\n═'.repeat(60));
  console.log('✅ All AOMA queries tested!\n');
}

// Run tests
testAOMAQueries().catch((error) => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});
