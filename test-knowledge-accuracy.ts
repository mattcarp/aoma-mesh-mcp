#!/usr/bin/env tsx
/**
 * Test Suite for AOMA Knowledge Base Query Accuracy
 * 
 * Tests the improved query processing to ensure:
 * 1. No hallucinations
 * 2. Proper acronym handling
 * 3. Accurate responses from knowledge base
 */

import { config } from 'dotenv';

config({ path: '.env' });

interface TestCase {
  name: string;
  query: string;
  expectedKeywords: string[];
  shouldNotContain: string[];
  expectedConfidence: number;
}

async function testKnowledgeAccuracy() {
  console.log('🧪 AOMA Knowledge Base Accuracy Test Suite');
  console.log('=' .repeat(60));
  console.log();

  const testCases: TestCase[] = [
    {
      name: 'USM Acronym Test',
      query: 'What does USM stand for?',
      expectedKeywords: ['Unified Session Manager', 'session', 'authentication'],
      shouldNotContain: ['Universal Supply Model', 'supply chain', 'distribution model'],
      expectedConfidence: 0.7
    },
    {
      name: 'USM Detailed Query',
      query: 'Explain the USM architecture in AOMA',
      expectedKeywords: ['Unified Session Manager', 'session store', 'authentication gateway'],
      shouldNotContain: ['Universal Supply', 'typically', 'generally', 'presumably'],
      expectedConfidence: 0.6
    },
    {
      name: 'Non-existent Concept Test',
      query: 'What is the XYZ protocol in AOMA?',
      expectedKeywords: ['not found', 'knowledge base', 'no information'],
      shouldNotContain: ['XYZ protocol is', 'typically used', 'generally provides'],
      expectedConfidence: 1.0
    },
    {
      name: 'AOMA Architecture Test',
      query: 'Describe AOMA system architecture',
      expectedKeywords: ['AOMA', 'Asset', 'Offering', 'Management'],
      shouldNotContain: ['typically', 'usually', 'it appears'],
      expectedConfidence: 0.6
    },
    {
      name: 'Cover Hot Swap Test',
      query: 'How does cover hot swap work in AOMA?',
      expectedKeywords: ['cover', 'artwork', 'replacement'],
      shouldNotContain: ['hypothetically', 'in theory', 'presumably'],
      expectedConfidence: 0.5
    },
    {
      name: 'Troubleshooting Test',
      query: 'How to troubleshoot AOMA asset processing failures?',
      expectedKeywords: ['troubleshoot', 'asset', 'processing', 'error'],
      shouldNotContain: ['Universal Supply', 'typically happens'],
      expectedConfidence: 0.6
    }
  ];

  let passedTests = 0;
  let failedTests = 0;
  const results: any[] = [];

  for (const testCase of testCases) {
    console.log(`\n📝 Test: ${testCase.name}`);
    console.log(`   Query: "${testCase.query}"`);
    console.log('-' .repeat(40));

    try {
      // Make the API call to the Railway deployment
      const response = await fetch('https://luminous-dedication-production.up.railway.app/rpc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: 'query_aoma_knowledge',
            arguments: {
              query: testCase.query,
              strategy: 'focused'
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message);
      }

      // Parse the response
      const result = JSON.parse(data.result.content[0].text);
      const responseText = result.response;
      const metadata = result.metadata;
      
      // Check for expected keywords
      const foundKeywords = testCase.expectedKeywords.filter(keyword => 
        responseText.toLowerCase().includes(keyword.toLowerCase())
      );
      
      // Check for hallucination indicators
      const foundProblematic = testCase.shouldNotContain.filter(phrase => 
        responseText.toLowerCase().includes(phrase.toLowerCase())
      );
      
      // Evaluate test results
      const keywordScore = foundKeywords.length / testCase.expectedKeywords.length;
      const noHallucination = foundProblematic.length === 0;
      const confidenceOk = !metadata.validation || 
                          metadata.validation.confidence >= testCase.expectedConfidence;
      
      const passed = keywordScore >= 0.5 && noHallucination && confidenceOk;
      
      if (passed) {
        console.log('   ✅ PASSED');
        passedTests++;
      } else {
        console.log('   ❌ FAILED');
        failedTests++;
      }
      
      // Display detailed results
      console.log(`   Keywords found: ${foundKeywords.length}/${testCase.expectedKeywords.length}`);
      if (foundKeywords.length < testCase.expectedKeywords.length) {
        const missing = testCase.expectedKeywords.filter(k => !foundKeywords.includes(k));
        console.log(`   Missing: ${missing.join(', ')}`);
      }
      
      if (foundProblematic.length > 0) {
        console.log(`   ⚠️  Problematic phrases found: ${foundProblematic.join(', ')}`);
      }
      
      if (metadata.validation) {
        console.log(`   Confidence: ${(metadata.validation.confidence * 100).toFixed(0)}%`);
        if (metadata.validation.issues && metadata.validation.issues.length > 0) {
          console.log(`   Issues: ${metadata.validation.issues.join(', ')}`);
        }
      }
      
      if (metadata.preprocessedQuery && metadata.preprocessedQuery !== testCase.query) {
        console.log(`   Preprocessed: "${metadata.preprocessedQuery}"`);
      }
      
      // Store results
      results.push({
        testCase: testCase.name,
        passed,
        keywordScore,
        noHallucination,
        confidence: metadata.validation?.confidence || 1.0,
        foundProblematic,
        response: responseText.slice(0, 200) + '...'
      });
      
    } catch (error: any) {
      console.log(`   ❌ ERROR: ${error.message}`);
      failedTests++;
      results.push({
        testCase: testCase.name,
        passed: false,
        error: error.message
      });
    }
  }

  // Summary
  console.log('\n');
  console.log('📊 TEST SUMMARY');
  console.log('=' .repeat(60));
  console.log(`✅ Passed: ${passedTests}/${testCases.length}`);
  console.log(`❌ Failed: ${failedTests}/${testCases.length}`);
  console.log(`📈 Success Rate: ${((passedTests / testCases.length) * 100).toFixed(1)}%`);
  
  // Detailed report
  console.log('\n📋 DETAILED RESULTS:');
  console.log('-' .repeat(40));
  results.forEach(r => {
    console.log(`\n${r.testCase}: ${r.passed ? '✅ PASS' : '❌ FAIL'}`);
    if (!r.passed && r.error) {
      console.log(`   Error: ${r.error}`);
    } else {
      console.log(`   Keyword Score: ${(r.keywordScore * 100).toFixed(0)}%`);
      console.log(`   No Hallucination: ${r.noHallucination ? 'Yes' : 'No'}`);
      console.log(`   Confidence: ${(r.confidence * 100).toFixed(0)}%`);
    }
  });
  
  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  console.log('-' .repeat(40));
  
  if (failedTests > 0) {
    console.log('1. Review failed test cases and update knowledge base accordingly');
    console.log('2. Consider adding more explicit documentation for failed queries');
    console.log('3. Update OpenAI Assistant instructions if hallucinations persist');
  }
  
  if (passedTests === testCases.length) {
    console.log('🎉 All tests passed! The knowledge base improvements are working.');
    console.log('Consider adding more test cases for edge scenarios.');
  }
  
  // Save test results
  const reportPath = `knowledge-test-results-${new Date().toISOString().split('T')[0]}.json`;
  const fs = await import('fs');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      total: testCases.length,
      passed: passedTests,
      failed: failedTests,
      successRate: `${((passedTests / testCases.length) * 100).toFixed(1)}%`
    },
    results
  }, null, 2));
  
  console.log(`\n📁 Test results saved to: ${reportPath}`);
}

// Run the tests
console.log('🚀 Starting AOMA Knowledge Base accuracy tests...\n');
testKnowledgeAccuracy().catch(console.error);