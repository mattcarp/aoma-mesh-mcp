#!/usr/bin/env tsx

// Test script to verify LangSmith integration is working

import { initializeLangSmith, traceToolCall, isLangSmithEnabled } from './src/utils/langsmith.js';

async function testLangSmithIntegration() {
  console.log('Testing LangSmith Integration...\n');
  
  // Initialize LangSmith
  initializeLangSmith();
  
  console.log(`LangSmith enabled: ${isLangSmithEnabled()}`);
  console.log(`Project: ${process.env.LANGCHAIN_PROJECT || 'default'}`);
  console.log(`Endpoint: ${process.env.LANGCHAIN_ENDPOINT || 'https://api.smith.langchain.com'}\n`);
  
  if (!isLangSmithEnabled()) {
    console.log('LangSmith is not enabled. Please check your environment variables:');
    console.log('- LANGCHAIN_TRACING_V2=true');
    console.log('- LANGCHAIN_API_KEY=your_api_key');
    return;
  }
  
  // Test a simple tool call trace
  try {
    console.log('Testing tool call trace...');
    
    const result = await traceToolCall(
      'test_tool',
      { message: 'Hello LangSmith!' },
      async () => {
        // Simulate some work
        await new Promise(resolve => setTimeout(resolve, 100));
        return { success: true, data: 'Test completed' };
      },
      { test: true, version: '1.0.0' }
    );
    
    console.log('Tool call result:', result);
    console.log('\n✅ LangSmith integration is working!');
    console.log('Check your LangSmith dashboard at https://smith.langchain.com');
    console.log(`Look for traces in project: ${process.env.LANGCHAIN_PROJECT || 'default'}`);
    
  } catch (error) {
    console.error('❌ LangSmith test failed:', error);
  }
}

// Run the test
testLangSmithIntegration().catch(console.error);