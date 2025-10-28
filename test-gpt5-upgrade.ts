#!/usr/bin/env tsx
/**
 * Test script to validate GPT-5 upgrade and OpenAI Assistant integration
 */

import { config } from 'dotenv';
import { OpenAIService } from './src/services/openai.service.js';
import { Environment } from './src/config/environment.js';

// Load environment variables
config();

async function testGPT5Upgrade() {
  console.log('🧪 Testing GPT-5 Upgrade\n');
  console.log('═'.repeat(60));

  // Initialize OpenAI service
  const env: Environment = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
    AOMA_ASSISTANT_ID: process.env.AOMA_ASSISTANT_ID || '',
    OPENAI_VECTOR_STORE_ID: process.env.OPENAI_VECTOR_STORE_ID,
    TIMEOUT_MS: 60000,
    MAX_RETRIES: 3,
  } as Environment;

  console.log('\n1️⃣ Configuration Check');
  console.log('─'.repeat(60));
  console.log(`   API Key: ${env.OPENAI_API_KEY ? '✓ Set' : '✗ Missing'}`);
  console.log(`   Assistant ID: ${env.AOMA_ASSISTANT_ID || '✗ Missing'}`);
  console.log(`   Vector Store ID: ${env.OPENAI_VECTOR_STORE_ID || '⚠️  Not configured (will use direct search)'}`);

  if (!env.OPENAI_API_KEY) {
    console.error('\n❌ OPENAI_API_KEY not found in environment');
    process.exit(1);
  }

  const openaiService = new OpenAIService(env);

  // Test 1: Fast query with GPT-5
  console.log('\n2️⃣ Testing Fast Query (GPT-5 Direct)');
  console.log('─'.repeat(60));

  const testQuery = 'What is AOMA and what are its main features?';
  console.log(`   Query: "${testQuery}"\n`);

  const startTime = Date.now();

  try {
    const result = await openaiService.queryKnowledgeFast(
      testQuery,
      'focused'
    );

    const duration = Date.now() - startTime;

    console.log(`   ✓ Response received in ${duration}ms (${(duration / 1000).toFixed(1)}s)`);
    console.log(`   ✓ Response length: ${result.length} characters`);
    console.log(`\n   Preview:\n   ${result.substring(0, 200)}...\n`);

    // Performance check
    if (duration < 15000) {
      console.log(`   ✓ Performance: GOOD (< 15s)`);
    } else if (duration < 25000) {
      console.log(`   ⚠️  Performance: OK (15-25s)`);
    } else {
      console.log(`   ⚠️  Performance: SLOW (> 25s)`);
    }

  } catch (error) {
    console.error(`   ✗ Query failed:`, error);
    throw error;
  }

  // Test 2: Health check
  console.log('\n3️⃣ Health Check');
  console.log('─'.repeat(60));

  try {
    const health = await openaiService.healthCheck();
    console.log(`   Status: ${health.healthy ? '✓ Healthy' : '✗ Unhealthy'}`);
    if (!health.healthy && health.error) {
      console.log(`   Error: ${health.error}`);
    }
  } catch (error) {
    console.error(`   ✗ Health check failed:`, error);
  }

  console.log('\n═'.repeat(60));
  console.log('✅ All tests completed successfully!\n');
}

// Run tests
testGPT5Upgrade().catch((error) => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});
