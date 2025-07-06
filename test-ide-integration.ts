#!/usr/bin/env tsx
/**
 * End-to-End IDE Integration Test for AOMA Agent Mesh
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { config } from 'dotenv';

config({ path: '../.env.local' });

async function testIDEIntegration() {
  console.log('🔌 AOMA AGENT MESH - IDE INTEGRATION TEST');
  console.log('=' .repeat(60));
  console.log();

  let testsPassed = 0;
  let totalTests = 0;

  // Test 1: Environment Validation
  console.log('1. 🔍 Environment Validation:');
  console.log('-' .repeat(40));
  totalTests++;
  
  try {
    const requiredEnvVars = [
      'OPENAI_API_KEY',
      'AOMA_ASSISTANT_ID', 
      'OPENAI_VECTOR_STORE_ID',
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY'
    ];

    const missingVars = requiredEnvVars.filter(key => !process.env[key]);
    
    if (missingVars.length === 0) {
      console.log('✅ All required environment variables present');
      testsPassed++;
    } else {
      console.log(`❌ Missing environment variables: ${missingVars.join(', ')}`);
    }
  } catch (error) {
    console.log('❌ Error validating environment:', error.message);
  }
  console.log();

  // Test 2: MCP Server Startup
  console.log('2. 🚀 MCP Server Startup Test:');
  console.log('-' .repeat(40));
  totalTests++;
  
  try {
    console.log('Starting AOMA Agent Mesh server...');
    const serverProcess = spawn('tsx', ['src/server.ts'], {
      stdio: 'pipe',
      cwd: path.join(__dirname),
      env: { ...process.env }
    });

    let serverOutput = '';
    let serverStarted = false;

    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      serverOutput += output;
      if (output.includes('Server initialized') || output.includes('listening')) {
        serverStarted = true;
      }
    });

    serverProcess.stderr.on('data', (data) => {
      serverOutput += data.toString();
    });

    // Wait for server startup
    await new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(null), 10000); // 10 second timeout
      const checkServer = setInterval(() => {
        if (serverStarted) {
          clearTimeout(timeout);
          clearInterval(checkServer);
          resolve(null);
        }
      }, 500);
    });

    if (serverStarted) {
      console.log('✅ MCP Server started successfully');
      testsPassed++;
    } else {
      console.log('❌ MCP Server failed to start within timeout');
      console.log('Server output:', serverOutput.slice(-500)); // Show last 500 chars
    }

    // Clean shutdown
    serverProcess.kill('SIGTERM');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
  } catch (error) {
    console.log('❌ Error testing server startup:', error.message);
  }
  console.log();

  // Test 3: Tool Availability
  console.log('3. 🛠️  Tool Availability Test:');
  console.log('-' .repeat(40));
  totalTests++;
  
  try {
    const { AgentServer } = await import('./src/agent-server.js');
    const server = new AgentServer();
    await server.initialize();
    
    const tools = server.getToolDefinitions();
    console.log(`✅ ${tools.length} tools available:`);
    
    // Test key tools
    const keyTools = [
      'query_aoma_assistant',
      'run_enhanced_jira_agent',
      'create_coordinator_agent',
      'search_aoma_vectors'
    ];
    
    const availableKeyTools = keyTools.filter(toolName => 
      tools.some(tool => tool.name === toolName)
    );
    
    console.log(`   Key tools available: ${availableKeyTools.length}/${keyTools.length}`);
    availableKeyTools.forEach(tool => console.log(`   ✅ ${tool}`));
    
    const missingTools = keyTools.filter(tool => !availableKeyTools.includes(tool));
    missingTools.forEach(tool => console.log(`   ❌ ${tool}`));
    
    if (availableKeyTools.length === keyTools.length) {
      testsPassed++;
    }
    
  } catch (error) {
    console.log('❌ Error testing tools:', error.message);
  }
  console.log();

  // Test 4: AOMA Assistant Connectivity
  console.log('4. 🧠 AOMA Assistant Connectivity:');
  console.log('-' .repeat(40));
  totalTests++;
  
  try {
    const { AgentServer } = await import('./src/agent-server.js');
    const server = new AgentServer();
    await server.initialize();
    
    console.log('Testing AOMA Assistant query...');
    const result = await server.callTool('query_aoma_assistant', {
      query: 'What is AOMA?',
      useKnowledgeBase: true
    });
    
    const response = JSON.parse(result.content[0].text);
    
    if (response.success && response.response && response.response.length > 50) {
      console.log('✅ AOMA Assistant responding correctly');
      console.log(`   Response length: ${response.response.length} characters`);
      testsPassed++;
    } else {
      console.log('❌ AOMA Assistant response insufficient');
      console.log('   Response:', response);
    }
    
  } catch (error) {
    console.log('❌ Error testing AOMA Assistant:', error.message);
  }
  console.log();

  // Test 5: Claude Desktop Configuration
  console.log('5. 🖥️  Claude Desktop Configuration:');
  console.log('-' .repeat(40));
  totalTests++;
  
  try {
    const configPath = path.join(
      process.env.HOME!,
      'Library/Application Support/Claude/claude_desktop_config.json'
    );
    
    const configExists = await fs.access(configPath).then(() => true).catch(() => false);
    
    if (configExists) {
      try {
        const configContent = await fs.readFile(configPath, 'utf8');
        const config = JSON.parse(configContent);
        
        if (config.mcpServers?.['aoma-agent-mesh']) {
          console.log('✅ Claude Desktop configured for AOMA Agent Mesh');
          console.log('   Configuration found and valid');
          testsPassed++;
        } else {
          console.log('⚠️  Claude Desktop config exists but missing AOMA Agent Mesh');
          console.log('   Please add the AOMA Agent Mesh server configuration');
        }
      } catch (parseError) {
        console.log('❌ Claude Desktop config exists but invalid JSON');
      }
    } else {
      console.log('⚠️  Claude Desktop configuration not found');
      console.log(`   Expected location: ${configPath}`);
      console.log('   This is normal if Claude Desktop is not installed');
    }
    
  } catch (error) {
    console.log('❌ Error checking Claude Desktop config:', error.message);
  }
  console.log();

  // Test 6: Multi-Agent Coordination Test
  console.log('6. 🤝 Multi-Agent Coordination Test:');
  console.log('-' .repeat(40));
  totalTests++;
  
  try {
    const { AgentServer } = await import('./src/agent-server.js');
    const server = new AgentServer();
    await server.initialize();
    
    console.log('Creating coordinator agent...');
    const coordinatorResult = await server.callTool('create_coordinator_agent', {
      taskDescription: 'Test multi-agent coordination capabilities',
      strategy: 'fast',
      maxAgents: 2
    });
    
    const coordinatorResponse = JSON.parse(coordinatorResult.content[0].text);
    
    if (coordinatorResponse.success && coordinatorResponse.agentId) {
      console.log('✅ Multi-agent coordinator created successfully');
      console.log(`   Agent ID: ${coordinatorResponse.agentId}`);
      
      // Test agent status
      const statusResult = await server.callTool('get_agent_status', {
        agentId: coordinatorResponse.agentId
      });
      
      const statusResponse = JSON.parse(statusResult.content[0].text);
      
      if (statusResponse.success) {
        console.log('✅ Agent status monitoring working');
        testsPassed++;
      } else {
        console.log('❌ Agent status monitoring failed');
      }
    } else {
      console.log('❌ Multi-agent coordinator creation failed');
      console.log('   Response:', coordinatorResponse);
    }
    
  } catch (error) {
    console.log('❌ Error testing multi-agent coordination:', error.message);
  }
  console.log();

  // Test Results Summary
  console.log('📊 TEST RESULTS SUMMARY:');
  console.log('=' .repeat(60));
  console.log(`✅ Tests Passed: ${testsPassed}/${totalTests}`);
  console.log(`❌ Tests Failed: ${totalTests - testsPassed}/${totalTests}`);
  console.log(`📈 Success Rate: ${((testsPassed / totalTests) * 100).toFixed(1)}%`);
  console.log();

  if (testsPassed === totalTests) {
    console.log('🎉 ALL TESTS PASSED! AOMA Agent Mesh is ready for IDE integration!');
    console.log();
    console.log('Next Steps:');
    console.log('1. Restart Claude Desktop to load the MCP server');
    console.log('2. Test in Claude Desktop: "Can you search the AOMA knowledge base?"');
    console.log('3. Test coordination: "Create a multi-agent workflow to analyze recent issues"');
  } else {
    console.log('⚠️  Some tests failed. Please address the issues above before deployment.');
  }
  console.log();
  console.log('🚀 AOMA Agent Mesh - Your AI-Powered Development Assistant');
  console.log('   Ready to orchestrate intelligent multi-agent workflows!');
}

// Run the test
testIDEIntegration().catch(console.error);