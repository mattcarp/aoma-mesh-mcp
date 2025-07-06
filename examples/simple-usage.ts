#!/usr/bin/env node
/**
 * Simple Usage Example for AOMA Mesh MCP Server
 * 
 * Shows how to integrate with Eleven Labs, LangChain, or any Node.js app
 */

import { AOMAMeshClient } from '../src/client.js';

async function main() {
  console.log('🚀 AOMA Mesh MCP Client Example\n');

  // Create client instance
  const aoma = new AOMAMeshClient();

  try {
    // 1. Quick health check
    console.log('1. Checking MCP server health...');
    const isHealthy = await aoma.quickHealthCheck();
    console.log(`   Status: ${isHealthy ? '✅ Healthy' : '❌ Unhealthy'}\n`);

    if (!isHealthy) {
      console.log('❌ MCP server is not available. Please check deployment.');
      return;
    }

    // 2. List available tools
    console.log('2. Available tools:');
    const tools = await aoma.listTools();
    tools.forEach(tool => {
      console.log(`   📋 ${tool.name}: ${tool.description}`);
    });
    console.log('');

    // 3. Query AOMA knowledge base
    console.log('3. Querying AOMA knowledge base...');
    const aomaInfo = await aoma.queryAOMAKnowledge('What is AOMA?', {
      strategy: 'focused'
    });
    console.log(`   📖 AOMA Info: ${aomaInfo.substring(0, 200)}...\n`);

    // 4. Search JIRA tickets
    console.log('4. Searching JIRA tickets...');
    const tickets = await aoma.searchJiraTickets('authentication issues', {
      maxResults: 3
    });
    console.log(`   🎫 Found ${tickets.length} related tickets`);
    tickets.forEach((ticket, i) => {
      console.log(`      ${i + 1}. ${ticket.key}: ${ticket.summary}`);
    });
    console.log('');

    // 5. Get detailed system health
    console.log('5. System health details:');
    const health = await aoma.getSystemHealth();
    console.log(`   🔧 OpenAI: ${health.services.openai.status ? '✅' : '❌'} (${health.services.openai.latency}ms)`);
    console.log(`   🔧 Supabase: ${health.services.supabase.status ? '✅' : '❌'} (${health.services.supabase.latency}ms)`);
    console.log(`   📊 Total Requests: ${health.metrics.totalRequests}`);
    console.log(`   ⏱️  Average Response: ${health.metrics.averageResponseTime}ms`);
    console.log(`   🕐 Version: ${health.metrics.version}\n`);

    console.log('✅ Example completed successfully!');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Example usage with Eleven Labs integration
async function elevenLabsIntegration() {
  console.log('\n🎵 Eleven Labs Integration Example\n');

  const aoma = new AOMAMeshClient();

  try {
    // Get business context from AOMA
    const context = await aoma.queryAOMAKnowledge('AOMA system overview for new developers');
    
    console.log('📋 Context retrieved for TTS generation:');
    console.log(context.substring(0, 300) + '...\n');

    // This is where you'd integrate with Eleven Labs
    console.log('🎙️  Next step: Use this context with Eleven Labs TTS');
    console.log('   const speech = await elevenLabs.textToSpeech({');
    console.log('     text: `Welcome to AOMA: ${context}`,');
    console.log('     voice: "your-voice-id"');
    console.log('   });');

  } catch (error) {
    console.error('❌ Eleven Labs integration error:', error);
  }
}

// Example usage with LangChain
async function langChainIntegration() {
  console.log('\n🦜 LangChain Integration Example\n');

  const aoma = new AOMAMeshClient();

  try {
    // Create a simple tool wrapper for LangChain
    class AOMAKnowledgeTool {
      name = 'aoma_knowledge';
      description = 'Query Sony Music AOMA knowledge base for business intelligence';

      async call(query: string): Promise<string> {
        return await aoma.queryAOMAKnowledge(query);
      }
    }

    const aomaKnowledgeTool = new AOMAKnowledgeTool();
    
    // Test the tool
    const result = await aomaKnowledgeTool.call('What are the main AOMA workflows?');
    console.log('🔧 LangChain tool result:');
    console.log(result.substring(0, 300) + '...\n');

    console.log('✅ Ready to integrate with LangChain agents!');

  } catch (error) {
    console.error('❌ LangChain integration error:', error);
  }
}

// Run examples
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then(() => elevenLabsIntegration())
    .then(() => langChainIntegration())
    .catch(console.error);
}
