# Claude Desktop Integration Guide for AOMA Agent Mesh

## Formal Name: **AOMA Agent Mesh (AAM)**
**Full Name:** Enterprise AOMA Agent Mesh - Intelligent Multi-Agent Development Assistant

## Claude Desktop Configuration

### 1. MCP Server Configuration File

Create or update your Claude Desktop configuration file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "aoma-agent-mesh": {
      "command": "node",
      "args": [
        "/Users/mcarpent/Documents/projects/mc-tk/mcp-server/dist/server.js"
      ],
      "cwd": "/Users/mcarpent/Documents/projects/mc-tk/mcp-server",
      "env": {
        "OPENAI_API_KEY": "your-openai-api-key",
        "SUPABASE_SERVICE_ROLE_KEY": "your-supabase-service-role-key",
        "NEXT_PUBLIC_SUPABASE_URL": "https://kfxetwuuzljhybfgmpuc.supabase.co",
        "AOMA_ASSISTANT_ID": "${AOMA_ASSISTANT_ID}",
        "OPENAI_VECTOR_STORE_ID": "vs_3dqHL3Wcmt1WrUof0qS4UQqo",
        "NODE_ENV": "production"
      }
    }
  }
}
```

### 2. Alternative: Using pnpm for Development

```json
{
  "mcpServers": {
    "aoma-agent-mesh-dev": {
      "command": "pnpm",
      "args": ["mcp:start"],
      "cwd": "/Users/mcarpent/Documents/projects/mc-tk",
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}
```

### 3. Production Build Setup

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "mcp:build": "tsc -p mcp-server/tsconfig.json",
    "mcp:start": "node mcp-server/dist/server.js",
    "mcp:dev": "tsx mcp-server/src/server.ts",
    "mcp:install": "cd mcp-server && npm install"
  }
}
```

### 4. Environment Variables Setup

Create `mcp-server/.env.production`:

```bash
# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key-here
AOMA_ASSISTANT_ID=your-assistant-id-here
OPENAI_VECTOR_STORE_ID=vs_3dqHL3Wcmt1WrUof0qS4UQqo

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://kfxetwuuzljhybfgmpuc.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key-here

# Server Configuration
NODE_ENV=production
MCP_SERVER_NAME=aoma-agent-mesh
MCP_SERVER_VERSION=1.0.0
```

## Windsurf Integration

### 1. Windsurf MCP Configuration

Create `.windsurf/mcp-config.json`:

```json
{
  "servers": {
    "aoma-agent-mesh": {
      "command": "pnpm",
      "args": ["mcp:start"],
      "cwd": ".",
      "description": "AOMA Agent Mesh - Multi-Agent Development Assistant",
      "capabilities": [
        "agent-orchestration",
        "jira-analysis", 
        "git-operations",
        "test-generation",
        "aoma-knowledge-base",
        "code-analysis"
      ]
    }
  }
}
```

### 2. Windsurf Integration Commands

Add to `.windsurf/commands.json`:

```json
{
  "commands": {
    "aoma-search": {
      "description": "Search AOMA knowledge base",
      "command": "mcp-call aoma-agent-mesh query_aoma_assistant"
    },
    "jira-analysis": {
      "description": "Analyze Jira tickets",
      "command": "mcp-call aoma-agent-mesh run_enhanced_jira_agent"
    },
    "create-coordinator": {
      "description": "Create multi-agent coordinator",
      "command": "mcp-call aoma-agent-mesh create_coordinator_agent"
    }
  }
}
```

## Cursor Integration

### 1. Cursor MCP Extension

Create `.cursor/mcp-servers.json`:

```json
{
  "aoma-agent-mesh": {
    "command": ["pnpm", "mcp:start"],
    "cwd": ".",
    "env": {
      "NODE_ENV": "development"
    },
    "description": "AOMA Agent Mesh for Enterprise Development",
    "tools": [
      "query_aoma_assistant",
      "run_enhanced_jira_agent", 
      "create_coordinator_agent",
      "search_aoma_vectors",
      "get_aoma_context"
    ]
  }
}
```

### 2. Cursor Workspace Settings

Add to `.vscode/settings.json`:

```json
{
  "mcp.servers": {
    "aoma-agent-mesh": {
      "enabled": true,
      "autoStart": true,
      "showInStatusBar": true
    }
  }
}
```

## VS Code Integration

### 1. VS Code MCP Extension Configuration

Create `.vscode/mcp.json`:

```json
{
  "servers": {
    "aoma-agent-mesh": {
      "command": "pnpm",
      "args": ["mcp:start"],
      "cwd": "${workspaceFolder}",
      "env": {
        "NODE_ENV": "development"
      },
      "capabilities": {
        "tools": true,
        "resources": true,
        "prompts": true
      }
    }
  }
}
```

## Testing IDE Integration

### 1. Integration Test Script

Create `mcp-server/test-ide-integration.ts`:

```typescript
#!/usr/bin/env tsx
/**
 * Test IDE Integration for AOMA Agent Mesh
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

async function testIDEIntegration() {
  console.log('🔌 Testing IDE Integration for AOMA Agent Mesh');
  console.log('=' .repeat(60));

  // Test 1: Verify MCP server can start
  console.log('1. Testing MCP Server Startup...');
  try {
    const serverProcess = spawn('pnpm', ['mcp:start'], {
      stdio: 'pipe',
      cwd: process.cwd()
    });

    let serverOutput = '';
    serverProcess.stdout.on('data', (data) => {
      serverOutput += data.toString();
    });

    // Wait for server to start
    await new Promise((resolve) => setTimeout(resolve, 5000));
    
    if (serverOutput.includes('AOMA Agent Mesh Server started')) {
      console.log('✅ MCP Server starts successfully');
    } else {
      console.log('❌ MCP Server failed to start');
      console.log('Output:', serverOutput);
    }

    serverProcess.kill();
  } catch (error) {
    console.log('❌ Error testing server startup:', error.message);
  }

  // Test 2: Verify Claude Desktop config
  console.log('\n2. Testing Claude Desktop Configuration...');
  try {
    const configPath = path.join(process.env.HOME!, 'Library/Application Support/Claude/claude_desktop_config.json');
    const configExists = await fs.access(configPath).then(() => true).catch(() => false);
    
    if (configExists) {
      const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
      if (config.mcpServers?.['aoma-agent-mesh']) {
        console.log('✅ Claude Desktop configuration found');
      } else {
        console.log('⚠️  Claude Desktop config exists but no AOMA Agent Mesh server configured');
      }
    } else {
      console.log('⚠️  Claude Desktop configuration not found');
      console.log('   Create:', configPath);
    }
  } catch (error) {
    console.log('❌ Error checking Claude Desktop config:', error.message);
  }

  // Test 3: Test tool availability
  console.log('\n3. Testing Tool Availability...');
  try {
    const { AgentServer } = await import('./src/agent-server.js');
    const server = new AgentServer();
    await server.initialize();
    
    const tools = server.getToolDefinitions();
    console.log(`✅ ${tools.length} tools available:`);
    tools.slice(0, 5).forEach(tool => {
      console.log(`   - ${tool.name}`);
    });
    if (tools.length > 5) {
      console.log(`   ... and ${tools.length - 5} more`);
    }
  } catch (error) {
    console.log('❌ Error testing tools:', error.message);
  }

  console.log('\n🎯 Integration Test Complete!');
  console.log('\nNext Steps:');
  console.log('1. Restart Claude Desktop to load the new MCP server');
  console.log('2. Try asking: "Can you search the AOMA knowledge base?"');
  console.log('3. Test: "Create a coordinator agent to analyze recent Jira tickets"');
}

testIDEIntegration().catch(console.error);
```

### 2. Run Integration Test

```bash
# Test the integration
pnpm mcp:test-integration

# Or run directly
tsx mcp-server/test-ide-integration.ts
```

## Usage Examples in Claude Desktop

Once configured, you can use these commands in Claude Desktop:

### 1. AOMA Knowledge Base Queries
```
Can you search the AOMA knowledge base for deployment procedures?
```

### 2. Jira Analysis
```
Analyze recent authentication-related Jira tickets and provide insights.
```

### 3. Multi-Agent Coordination
```
Create a coordinator agent to:
1. Search for performance issues in Jira
2. Analyze related code in the repository  
3. Generate a comprehensive test plan
```

### 4. Code Analysis
```
Use the enhanced Git agent to analyze the authentication module and suggest improvements.
```

## Troubleshooting

### Common Issues

1. **MCP Server Won't Start**
   - Check environment variables in config
   - Verify OpenAI API key is valid
   - Ensure Supabase credentials are correct

2. **Tools Not Available in IDE**
   - Restart the IDE after configuration
   - Check MCP server logs for errors
   - Verify file paths in configuration

3. **Permission Errors**
   - Ensure execute permissions on server files
   - Check file ownership and permissions
   - Verify environment variable access

### Debug Commands

```bash
# Check server health
pnpm mcp:health-check

# View server logs
pnpm mcp:logs

# Test specific tool
pnpm mcp:test-tool query_aoma_assistant
```

## Production Deployment

### 1. Build for Production

```bash
# Build the MCP server
pnpm mcp:build

# Test production build
pnpm mcp:start
```

### 2. Systemd Service (Linux)

Create `/etc/systemd/system/aoma-agent-mesh.service`:

```ini
[Unit]
Description=AOMA Agent Mesh MCP Server
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/path/to/mc-tk/mcp-server
ExecStart=/usr/bin/node dist/server.js
Restart=always
Environment=NODE_ENV=production
EnvironmentFile=/path/to/mc-tk/mcp-server/.env.production

[Install]
WantedBy=multi-user.target
```

The **AOMA Agent Mesh** is now ready for IDE integration! 🚀