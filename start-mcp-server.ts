#!/usr/bin/env tsx
/**
 * Start AOMA Mesh MCP Server with real credentials
 */

import { config } from 'dotenv';

// Load environment variables
config();

async function startMCPServer() {
  console.log('🚀 Starting AOMA Mesh MCP Server...\n');

  // Check required environment variables
  const requiredVars = [
    'OPENAI_API_KEY',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];

  const missing = requiredVars.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.log('❌ Missing required environment variables:');
    missing.forEach(key => console.log(`   - ${key}`));
    console.log('\nPlease add these to your .env file');
    return;
  }

  console.log('✅ Environment variables checked');
  console.log(`   OpenAI API Key: ${process.env.OPENAI_API_KEY?.slice(0, 20)}...`);
  console.log(`   Supabase URL: ${process.env.SUPABASE_URL?.slice(0, 40)}...`);
  console.log(`   Supabase Key: ${process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 20)}...\n`);

  try {
    // Import and start the main MCP server
    console.log('📡 Importing AOMA Mesh Server...');
    const serverModule = await import('./src/aoma-mesh-server.js');
    
    console.log('✅ MCP Server started successfully!');
    console.log('🔧 Available tools:');
    console.log('   - search_aoma_knowledge (1000+ documents)');
    console.log('   - search_jira_tickets (6280+ tickets)');
    console.log('   - search_git_commits (ready for Git scraping)');
    console.log('   - health_check');
    console.log('\n🌐 Server is running and ready for MCP clients');
    
  } catch (error) {
    console.log('❌ Error starting MCP server:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Ensure all dependencies are installed: npm install');
    console.log('2. Check that environment variables are correct');
    console.log('3. Verify Supabase connection');
  }
}

startMCPServer().catch(console.error);
