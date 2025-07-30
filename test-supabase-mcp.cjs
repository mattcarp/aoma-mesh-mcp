#!/usr/bin/env node

// Quick test to verify Supabase MCP is working and explore your schema
const { spawn } = require('child_process');

async function testSupabaseMCP() {
  console.log('🚀 Testing Supabase MCP Connection...\n');
  
  const mcpProcess = spawn('npx', [
    '-y', '@supabase/mcp-server-supabase@latest',
    '--access-token=sbp_1a8f4f86627299d3d432b3061f405bec8d2c8370',
    '--project-ref=kfxetwuuzljhybfgmpuc'
  ], {
    env: {
      ...process.env,
      SUPABASE_ACCESS_TOKEN: 'sbp_1a8f4f86627299d3d432b3061f405bec8d2c8370',
      SUPABASE_PROJECT_REF: 'kfxetwuuzljhybfgmpuc'
    }
  });

  // Test 1: List available tools
  const listToolsRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list'
  };

  console.log('📋 Requesting available tools...');
  mcpProcess.stdin.write(JSON.stringify(listToolsRequest) + '\n');

  // Test 2: Execute a simple SQL query to see what tables exist
  setTimeout(() => {
    const sqlRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'execute_sql',
        arguments: {
          sql: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' LIMIT 10;"
        }
      }
    };
    
    console.log('🔍 Exploring your database schema...');
    mcpProcess.stdin.write(JSON.stringify(sqlRequest) + '\n');
  }, 1000);

  mcpProcess.stdout.on('data', (data) => {
    try {
      const lines = data.toString().split('\n').filter(line => line.trim());
      lines.forEach(line => {
        if (line.trim()) {
          const response = JSON.parse(line);
          if (response.result) {
            if (response.id === 1) {
              console.log('✅ Available MCP Tools:');
              response.result.tools.forEach(tool => {
                console.log(`   - ${tool.name}: ${tool.description?.slice(0, 60)}...`);
              });
              console.log('');
            } else if (response.id === 2) {
              console.log('✅ Your Database Tables:');
              response.result.content[0].text.split('\n').forEach(line => {
                if (line.includes('|') && !line.includes('table_name')) {
                  const tableName = line.split('|')[1]?.trim();
                  if (tableName) console.log(`   - ${tableName}`);
                }
              });
            }
          }
        }
      });
    } catch (e) {
      // Ignore JSON parse errors from partial data
    }
  });

  mcpProcess.stderr.on('data', (data) => {
    console.error('❌ Error:', data.toString());
  });

  // Cleanup after 5 seconds
  setTimeout(() => {
    mcpProcess.kill();
    console.log('\n🎯 MCP Server test complete!');
    process.exit(0);
  }, 5000);
}

testSupabaseMCP().catch(console.error);
