# 🚀 MC-TK AOMA Agent MCP Server Setup Instructions

## ✅ Status: Ready to Use with OpenAI API Key!

Your MCP server is fully configured and tested with 11 powerful development tools including 5 AOMA-specific capabilities.

## 📋 Quick Setup for Claude Desktop

### Step 1: Copy Configuration
```bash
# Copy the config to Claude Desktop
cp /Users/mcarpent/Documents/projects/mc-tk/mcp-server/claude-desktop-config.json ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

### Step 2: Restart Claude Desktop
- Completely quit Claude Desktop
- Restart the application
- Look for MCP connection indicator

### Step 3: Test Connection
In Claude Desktop, try:
```
What MCP tools do you have available?
```

You should see 11 tools including AOMA-specific ones!

## 🎮 Cool Examples to Try Immediately

### 🏛️ AOMA Government Operations Examples:

**1. Equipment Dashboard Analysis:**
```
Please analyze AOMA UI patterns for "equipment status dashboard" focusing on real-time updates and mobile optimization for field operators
```

**2. Critical System Test Generation:**
```
Please generate comprehensive Playwright tests for AOMA equipment monitoring at https://aoma.gov/equipment, including accessibility compliance and emergency alert testing
```

**3. Operational Knowledge Query:**
```
Please query AOMA knowledge for "equipment maintenance scheduling procedures" focusing on preventive maintenance and compliance documentation
```

**4. Performance Optimization:**
```
Please analyze AOMA performance for the operations dashboard and suggest optimizations for government network constraints and mobile field access
```

**5. Strategic Improvement Planning:**
```
Please suggest AOMA improvements for "workflow" area with high priority, including implementation details for reducing equipment downtime and improving operational efficiency
```

### 💻 General Development Magic:

**6. Intelligent Code Analysis:**
```
Please analyze code quality of my React component focusing on complexity, maintainability, and performance metrics for government compliance requirements
```

**7. Smart Development Planning:**
```
Please create a development plan for "implementing real-time WebSocket status updates for AOMA equipment monitoring" with 2-week timeline, moderate complexity, including security and testing requirements
```

**8. IDE Workflow Optimization:**
```
Please suggest Claude Code IDE improvements for my current AOMA development context, focusing on government security requirements and operational efficiency
```

## 🔧 Technical Details

**Tools Available:**
- 6 General development tools (code analysis, IDE optimization, project planning)
- 5 AOMA-specific tools (UI patterns, test generation, knowledge query, performance, improvements)

**Features:**
- OpenAI GPT-4 powered analysis
- Government compliance awareness
- AOMA operational context understanding
- Real-time development assistance
- Mission-critical system optimization

**Integration Ready:**
- LangGraph agent orchestration
- Supabase vector search capabilities
- Government security requirements
- Accessibility compliance (WCAG 2.1 AA)
- Mobile field operator optimization

## 🚨 Troubleshooting

**If tools don't appear:**
1. Check Claude Desktop config location: `~/Library/Application Support/Claude/claude_desktop_config.json`
2. Verify the file path is correct: `/Users/mcarpent/Documents/projects/mc-tk/mcp-server/dist/simple-index.js`
3. Restart Claude Desktop completely
4. Check for MCP connection indicator in the interface

**If tools error:**
1. Verify OpenAI API key is working
2. Check server logs in Terminal
3. Test server directly: `cd mcp-server && npm run test:server`

## 🎉 You're Ready!

Your AOMA-enhanced MCP server is fully operational and ready to supercharge your government operations development workflow!

**Next Level:** When you're ready, we can integrate with your full LangGraph agent ecosystem for even more sophisticated multi-agent workflows.

## 🌐 Optional: Enable SSE MCP Transport

To enable the SSE transport endpoint in the main server, add the following variables to your `.env.local` in the project root:

```
# Enable SSE transport endpoint alongside stdio/http
ENABLE_SSE_TRANSPORT=false

# Path where the SSE endpoint will be exposed in Express
SSE_ENDPOINT_PATH=/mcp/sse

# Comma-separated list of allowed origins specifically for SSE
# Example: https://studio.chat,https://myapp.local
SSE_CORS_ORIGINS=
```