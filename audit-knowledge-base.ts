#!/usr/bin/env tsx
/**
 * Audit AOMA Knowledge Base Vector Store
 * 
 * This script helps identify:
 * 1. What files are in the vector store
 * 2. What topics are covered
 * 3. What acronyms are defined
 * 4. What's missing
 */

import { config } from 'dotenv';
import OpenAI from 'openai';
import { writeFileSync } from 'fs';

config({ path: '.env' });

interface AuditResult {
  vectorStoreId: string;
  vectorStoreName: string;
  fileCount: number;
  files: Array<{
    id: string;
    filename: string;
    bytes: number;
    status: string;
  }>;
  testQueries: Array<{
    query: string;
    expectedTopic: string;
    result: 'found' | 'not_found' | 'error';
    response?: string;
  }>;
  missingTopics: string[];
  recommendations: string[];
}

async function auditKnowledgeBase() {
  console.log('🔍 AOMA Knowledge Base Audit Tool');
  console.log('=' .repeat(60));
  console.log();

  const auditResult: AuditResult = {
    vectorStoreId: process.env.OPENAI_VECTOR_STORE_ID || '',
    vectorStoreName: '',
    fileCount: 0,
    files: [],
    testQueries: [],
    missingTopics: [],
    recommendations: []
  };

  try {
    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!
    });

    // Step 1: Get Vector Store Information
    console.log('📚 Step 1: Analyzing Vector Store');
    console.log('-' .repeat(40));
    
    if (!process.env.OPENAI_VECTOR_STORE_ID) {
      console.log('❌ No OPENAI_VECTOR_STORE_ID configured');
      auditResult.recommendations.push('Configure OPENAI_VECTOR_STORE_ID in .env');
    } else {
      try {
        const vectorStore = await openai.beta.vectorStores.retrieve(process.env.OPENAI_VECTOR_STORE_ID);
        
        auditResult.vectorStoreName = vectorStore.name || 'Unnamed';
        auditResult.fileCount = vectorStore.file_counts?.total || 0;
        
        console.log(`✅ Vector Store: ${vectorStore.name}`);
        console.log(`   ID: ${vectorStore.id}`);
        console.log(`   Files: ${vectorStore.file_counts?.total || 0}`);
        console.log(`   Status: ${vectorStore.status}`);
        console.log(`   Created: ${new Date(vectorStore.created_at * 1000).toISOString()}`);
        
        // List files in vector store
        const files = await openai.beta.vectorStores.files.list(process.env.OPENAI_VECTOR_STORE_ID);
        
        for (const file of files.data) {
          try {
            const fileDetails = await openai.files.retrieve(file.id);
            auditResult.files.push({
              id: file.id,
              filename: fileDetails.filename || 'unknown',
              bytes: fileDetails.bytes || 0,
              status: file.status
            });
            console.log(`   📄 ${fileDetails.filename} (${(fileDetails.bytes / 1024).toFixed(2)} KB)`);
          } catch (err) {
            console.log(`   ⚠️  File ${file.id}: Unable to retrieve details`);
          }
        }
      } catch (error: any) {
        console.log(`❌ Error accessing vector store: ${error.message}`);
        auditResult.recommendations.push('Verify vector store exists and is accessible');
      }
    }
    console.log();

    // Step 2: Test Critical Queries
    console.log('🧪 Step 2: Testing Critical Queries');
    console.log('-' .repeat(40));
    
    const testQueries = [
      { query: 'What is USM?', expectedTopic: 'Unified Session Manager' },
      { query: 'What does AOMA stand for?', expectedTopic: 'Asset and Offering Management Application' },
      { query: 'How does cover hot swap work?', expectedTopic: 'Cover replacement process' },
      { query: 'What is the AOMA architecture?', expectedTopic: 'System architecture' },
      { query: 'What are AOMA workflows?', expectedTopic: 'Workflow processes' },
      { query: 'How to troubleshoot asset processing failures?', expectedTopic: 'Troubleshooting' },
      { query: 'What is MDS in AOMA?', expectedTopic: 'Metadata Service' },
      { query: 'What authentication methods does AOMA support?', expectedTopic: 'Authentication' },
      { query: 'What is the JIRA integration in AOMA?', expectedTopic: 'JIRA integration' },
      { query: 'How does AOMA handle ingestion?', expectedTopic: 'Asset ingestion' }
    ];

    if (process.env.AOMA_ASSISTANT_ID) {
      for (const test of testQueries) {
        console.log(`\n🔍 Testing: "${test.query}"`);
        
        try {
          // Create thread and query
          const thread = await openai.beta.threads.create();
          
          await openai.beta.threads.messages.create(thread.id, {
            role: 'user',
            content: `Search the knowledge base for: ${test.query}`
          });
          
          const run = await openai.beta.threads.runs.create(thread.id, {
            assistant_id: process.env.AOMA_ASSISTANT_ID,
            additional_instructions: 'You MUST search the attached knowledge base files and only provide information found there. If not found, say "Not found in knowledge base".'
          });
          
          // Poll for completion
          let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
          let attempts = 0;
          
          while ((runStatus.status === 'in_progress' || runStatus.status === 'queued') && attempts < 20) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
            attempts++;
          }
          
          if (runStatus.status === 'completed') {
            const messages = await openai.beta.threads.messages.list(thread.id);
            const response = messages.data.find(msg => msg.role === 'assistant');
            
            if (response && response.content[0].type === 'text') {
              const responseText = response.content[0].text.value;
              const found = !responseText.toLowerCase().includes('not found') && 
                           responseText.length > 100;
              
              auditResult.testQueries.push({
                query: test.query,
                expectedTopic: test.expectedTopic,
                result: found ? 'found' : 'not_found',
                response: responseText.slice(0, 200)
              });
              
              console.log(`   ${found ? '✅' : '❌'} ${found ? 'Found' : 'Not Found'} - ${test.expectedTopic}`);
              
              if (!found) {
                auditResult.missingTopics.push(test.expectedTopic);
              }
            }
          } else {
            console.log(`   ⚠️  Query failed: ${runStatus.status}`);
            auditResult.testQueries.push({
              query: test.query,
              expectedTopic: test.expectedTopic,
              result: 'error'
            });
          }
          
          // Clean up thread
          await openai.beta.threads.del(thread.id);
          
        } catch (error: any) {
          console.log(`   ❌ Error: ${error.message}`);
          auditResult.testQueries.push({
            query: test.query,
            expectedTopic: test.expectedTopic,
            result: 'error'
          });
        }
      }
    }
    console.log();

    // Step 3: Analysis and Recommendations
    console.log('📊 Step 3: Analysis & Recommendations');
    console.log('-' .repeat(40));
    
    const foundCount = auditResult.testQueries.filter(q => q.result === 'found').length;
    const notFoundCount = auditResult.testQueries.filter(q => q.result === 'not_found').length;
    const errorCount = auditResult.testQueries.filter(q => q.result === 'error').length;
    
    console.log(`✅ Found: ${foundCount}/${testQueries.length}`);
    console.log(`❌ Not Found: ${notFoundCount}/${testQueries.length}`);
    console.log(`⚠️  Errors: ${errorCount}/${testQueries.length}`);
    console.log();
    
    // Generate recommendations
    if (auditResult.fileCount === 0) {
      auditResult.recommendations.push('CRITICAL: Vector store is empty - upload AOMA documentation files');
    }
    
    if (auditResult.missingTopics.length > 0) {
      console.log('📝 Missing Topics:');
      auditResult.missingTopics.forEach(topic => {
        console.log(`   - ${topic}`);
      });
      auditResult.recommendations.push(`Add documentation for: ${auditResult.missingTopics.join(', ')}`);
    }
    
    if (notFoundCount > 3) {
      auditResult.recommendations.push('Create comprehensive glossary document with all AOMA acronyms and terms');
      auditResult.recommendations.push('Add explicit "What is X" sections for key concepts');
    }
    
    // Step 4: Generate Glossary Template
    console.log();
    console.log('📄 Step 4: Generating Recommended Glossary');
    console.log('-' .repeat(40));
    
    const glossaryContent = `# AOMA Knowledge Base Glossary

## Critical Acronyms and Terms

### USM - Unified Session Manager
The Unified Session Manager (USM) is AOMA's centralized session management system responsible for:
- User authentication and authorization
- Session lifecycle management
- Single Sign-On (SSO) integration
- Token management and validation
- Session state persistence

### AOMA - Asset and Offering Management Application
AOMA is Sony Music's digital asset management system for:
- Digital asset ingestion and processing
- Metadata management
- Content distribution
- Rights management
- Workflow orchestration

### MDS - Metadata Service
The Metadata Service provides:
- Centralized metadata storage
- Metadata validation and enrichment
- Cross-system metadata synchronization
- Version control for metadata changes

### Other Key Terms
- **Cover Hot Swap**: Process for replacing album artwork without disrupting distribution
- **Asset Ingestion**: Automated process for importing digital content into AOMA
- **Workflow Orchestration**: Automated sequencing of asset processing tasks
- **JIRA Integration**: Ticket tracking and issue management connection
- **Rights Management**: System for tracking and enforcing content usage rights

## System Components
[Add specific AOMA components and their descriptions]

## Common Workflows
[Add step-by-step workflow descriptions]

## Troubleshooting Guide
[Add common issues and solutions]
`;
    
    writeFileSync('AOMA_GLOSSARY_TEMPLATE.md', glossaryContent);
    console.log('✅ Generated AOMA_GLOSSARY_TEMPLATE.md');
    
    // Save audit report
    const reportPath = `knowledge-base-audit-${new Date().toISOString().split('T')[0]}.json`;
    writeFileSync(reportPath, JSON.stringify(auditResult, null, 2));
    console.log(`✅ Saved detailed audit report to ${reportPath}`);
    
    console.log();
    console.log('📋 RECOMMENDATIONS:');
    console.log('=' .repeat(60));
    auditResult.recommendations.forEach((rec, i) => {
      console.log(`${i + 1}. ${rec}`);
    });
    
    console.log();
    console.log('🎯 NEXT STEPS:');
    console.log('1. Upload AOMA_GLOSSARY_TEMPLATE.md to the vector store');
    console.log('2. Update OpenAI Assistant instructions via platform.openai.com');
    console.log('3. Add any missing documentation files to the vector store');
    console.log('4. Re-run this audit to verify improvements');
    
  } catch (error: any) {
    console.log('❌ Audit failed:', error.message);
  }
}

// Run the audit
auditKnowledgeBase().catch(console.error);