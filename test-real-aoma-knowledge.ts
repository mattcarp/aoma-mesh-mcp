#!/usr/bin/env tsx

/**
 * Real AOMA Knowledge Test
 * Uses actual API keys and services to demonstrate what AOMA really knows
 */

import { RealAOMAServer } from './src/real-aoma-server.js';

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

// Validate required environment variables are set
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY not set in environment variables');
  process.exit(1);
}
if (!process.env.AOMA_ASSISTANT_ID) {
  console.error('❌ AOMA_ASSISTANT_ID not set in environment variables');
  process.exit(1);
}

async function testRealAOMAKnowledge() {
  console.log('🔍 TESTING REAL AOMA KNOWLEDGE WITH LIVE SYSTEMS');
  console.log('='.repeat(80));

  try {
    const server = new RealAOMAServer();
    await server.initialize();

    console.log('\n🧠 TESTING AOMA ASSISTANT WITH VECTOR STORE:');
    console.log('Query: "What is AOMA and what does it do?"');
    
    const aomaResult = await server.callTool('query_aoma_assistant', {
      query: 'What is AOMA and what does it do? Explain its purpose and main functions.',
      useKnowledgeBase: true
    });

    const aomaData = JSON.parse(aomaResult.content[0].text);
    console.log('AOMA Assistant Response:');
    console.log(aomaData.response);

    console.log('\n🎯 TESTING VECTOR SEARCH IN AOMA KNOWLEDGE BASE:');
    console.log('Query: "asset management workflows"');
    
    const vectorResult = await server.callTool('search_aoma_vectors', {
      query: 'asset management workflows',
      maxResults: 3,
      threshold: 0.3
    });

    const vectorData = JSON.parse(vectorResult.content[0].text);
    console.log(`Found ${vectorData.results.length} relevant documents:`);
    vectorData.results.forEach((result: any, i: number) => {
      console.log(`${i + 1}. ${result.title} (similarity: ${result.similarity.toFixed(3)})`);
      console.log(`   Content: ${result.content.substring(0, 150)}...`);
    });

    console.log('\n🎫 TESTING ENHANCED JIRA AGENT:');
    console.log('Query: "authentication issues and login problems"');
    
    const jiraResult = await server.callTool('run_enhanced_jira_agent', {
      query: 'authentication issues and login problems in the last month'
    });

    const jiraData = JSON.parse(jiraResult.content[0].text);
    console.log('Jira Analysis Results:');
    console.log(`Found ${jiraData.tickets?.length || 0} relevant tickets`);
    if (jiraData.tickets && jiraData.tickets.length > 0) {
      jiraData.tickets.slice(0, 3).forEach((ticket: any, i: number) => {
        console.log(`${i + 1}. ${ticket.key}: ${ticket.summary}`);
        console.log(`   Status: ${ticket.status} | Priority: ${ticket.priority}`);
      });
    }

    console.log('\n📋 TESTING AOMA CONTEXT RETRIEVAL:');
    console.log('Query: "deployment procedures and requirements"');
    
    const contextResult = await server.callTool('get_aoma_context', {
      query: 'deployment procedures and requirements',
      contextTypes: ['documentation', 'requirements'],
      maxResults: 3
    });

    const contextData = JSON.parse(contextResult.content[0].text);
    console.log('Context Results:');
    if (contextData.context && contextData.context.length > 0) {
      contextData.context.forEach((item: any, i: number) => {
        console.log(`${i + 1}. ${item.title} (${item.type})`);
        console.log(`   Source: ${item.source}`);
        console.log(`   Content: ${item.content.substring(0, 100)}...`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ REAL AOMA KNOWLEDGE TEST COMPLETED');
    console.log('This demonstrates the actual domain-specific knowledge available through:');
    console.log('• OpenAI Assistant with attached vector store');
    console.log('• Supabase vector database with embeddings');
    console.log('• Enhanced Jira ticket analysis');
    console.log('• AOMA context and documentation retrieval');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ FAILED TO ACCESS REAL AOMA KNOWLEDGE:', error.message);
    console.error('This could indicate:');
    console.error('• API keys are invalid or expired');
    console.error('• Vector store is not accessible');
    console.error('• Supabase database connection issues');
    console.error('• Network connectivity problems');
  }
}

testRealAOMAKnowledge();
