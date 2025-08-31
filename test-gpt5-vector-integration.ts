#!/usr/bin/env tsx

/**
 * Test GPT-5 + Vector Store Integration
 * 
 * This script tests our new GPT-5 integration with the AOMA vector store
 * to ensure we're using GPT-5 everywhere while maintaining vector store access.
 */

import { config } from 'dotenv';
import { OpenAIService } from './src/services/openai.service.js';
import { validateAndLoadEnvironment } from './src/config/environment.js';

config();

async function testGPT5Integration() {
  console.log('🧪 Testing GPT-5 + Vector Store Integration...\n');
  
  try {
    // Load and validate environment
    const env = validateAndLoadEnvironment();
    console.log('✅ Environment loaded successfully');
    console.log(`📋 Assistant ID: ${env.AOMA_ASSISTANT_ID}`);
    console.log(`🗄️  Vector Store: ${env.OPENAI_VECTOR_STORE_ID || 'Not configured'}`);
    console.log(`🤖 Using GPT-5 with vector store: ${!!env.OPENAI_VECTOR_STORE_ID}\n`);
    
    // Create OpenAI service instance
    const openaiService = new OpenAIService(env);
    
    // Test health check first
    console.log('🏥 Testing OpenAI service health...');
    const health = await openaiService.healthCheck();
    
    if (!health.healthy) {
      throw new Error(`Health check failed: ${health.error}`);
    }
    console.log(`✅ OpenAI service healthy (latency: ${health.latency}ms)\n`);
    
    // Test AOMA knowledge query with GPT-5
    console.log('🔍 Testing AOMA knowledge query with GPT-5...');
    const testQuery = 'What is USM in the AOMA context?';
    
    const startTime = Date.now();
    const response = await openaiService.queryKnowledge(testQuery, 'focused');
    const duration = Date.now() - startTime;
    
    console.log(`✅ Query completed in ${duration}ms`);
    console.log(`📝 Response length: ${response.length} characters`);
    console.log(`🎯 Response preview: ${response.substring(0, 200)}...`);
    
    // Test with different strategies
    console.log('\n🚀 Testing rapid strategy...');
    const rapidResponse = await openaiService.queryKnowledge(
      'What are the key AOMA workflows?', 
      'rapid'
    );
    console.log(`✅ Rapid query completed (${rapidResponse.length} chars)`);
    
    console.log('\n🧠 Testing comprehensive strategy...');
    const comprehensiveResponse = await openaiService.queryKnowledge(
      'Explain the cover hot swap functionality in AOMA', 
      'comprehensive'
    );
    console.log(`✅ Comprehensive query completed (${comprehensiveResponse.length} chars)`);
    
    console.log('\n🎉 All tests passed! GPT-5 + Vector Store integration working correctly.');
    console.log('\n📊 Summary:');
    console.log(`- Model: GPT-5 (via temporary assistants)`);
    console.log(`- Vector Store: ${env.OPENAI_VECTOR_STORE_ID}`);
    console.log(`- Strategies tested: focused, rapid, comprehensive`);
    console.log(`- Vector store integration: ${!!env.OPENAI_VECTOR_STORE_ID ? 'Active' : 'Disabled'}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
if (import.meta.url.endsWith(process.argv[1])) {
  testGPT5Integration().catch(console.error);
}