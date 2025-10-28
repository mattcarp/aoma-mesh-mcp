#!/usr/bin/env tsx
/**
 * Detailed test script for GPT-5 to see actual response
 */

import { config } from 'dotenv';
import OpenAI from 'openai';

// Load environment variables
config();

async function testGPT5Direct() {
  console.log('🔍 Testing GPT-5 Direct API Call\n');
  console.log('═'.repeat(60));

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
  });

  console.log('\n1️⃣ Making Direct GPT-5 Completion Call');
  console.log('─'.repeat(60));

  const testQuery = 'What is 2+2? Answer in one sentence.';
  console.log(`   Query: "${testQuery}"\n`);

  const startTime = Date.now();

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-5',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant. Answer questions concisely.'
        },
        {
          role: 'user',
          content: testQuery
        }
      ],
      temperature: 1,
      max_completion_tokens: 100
    });

    const duration = Date.now() - startTime;

    console.log(`   ✓ Response received in ${duration}ms (${(duration / 1000).toFixed(1)}s)`);
    console.log(`   Model used: ${completion.model}`);
    console.log(`   Finish reason: ${completion.choices[0]?.finish_reason}`);
    console.log(`   Content: "${completion.choices[0]?.message?.content}"`);
    console.log(`   Content length: ${completion.choices[0]?.message?.content?.length || 0} characters\n`);

    // Full response for debugging
    console.log('   Full completion object:');
    console.log(JSON.stringify(completion, null, 2));

  } catch (error: any) {
    console.error(`   ✗ Query failed:`, error);
    if (error.response) {
      console.error(`   Response status: ${error.response.status}`);
      console.error(`   Response data:`, error.response.data);
    }
    throw error;
  }

  console.log('\n═'.repeat(60));
  console.log('✅ Test completed!\n');
}

// Run test
testGPT5Direct().catch((error) => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});
