#!/usr/bin/env tsx
/**
 * Quick verification that hallucination fixes are deployed
 */

import { config } from 'dotenv';
config({ path: '.env' });

async function verifyDeployment() {
  console.log('🚀 Verifying Railway deployment hallucination fixes...\n');
  
  // Test USM query specifically
  const response = await fetch('https://luminous-dedication-production.up.railway.app/rpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'query_aoma_knowledge',
        arguments: {
          query: 'What does USM stand for?',
          strategy: 'focused'
        }
      }
    })
  });

  const data = await response.json();
  const result = JSON.parse(data.result.content[0].text);
  
  console.log('Response:', result.response.slice(0, 200) + '...\n');
  
  const hasCorrectUSM = result.response.includes('Unified Session Manager');
  const hasWrongUSM = result.response.includes('Universal Supply Model');
  
  if (hasCorrectUSM && !hasWrongUSM) {
    console.log('✅ DEPLOYMENT SUCCESSFUL - Hallucination fixes are active!');
    console.log('   USM correctly identified as Unified Session Manager');
  } else if (hasWrongUSM) {
    console.log('❌ DEPLOYMENT PENDING - Still showing old behavior');
    console.log('   USM incorrectly showing as Universal Supply Model');
  } else {
    console.log('⚠️  UNEXPECTED RESPONSE - Check deployment status');
  }
  
  if (result.metadata?.validation) {
    console.log('\n📊 Validation Metadata:');
    console.log(`   Confidence: ${(result.metadata.validation.confidence * 100).toFixed(0)}%`);
    console.log(`   Issues: ${result.metadata.validation.issues?.join(', ') || 'None'}`);
  }
}

verifyDeployment().catch(console.error);