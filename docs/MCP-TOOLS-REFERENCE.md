# AOMA Mesh MCP Server - Tools Reference

## Server Status

**Production URL**: `https://luminous-dedication-production.up.railway.app`

**Current Version**: `2.7.0-railway_20251028-171408` (Oct 28 - OLD VERSION)

**Health Status**: ✅ Healthy
- OpenAI: ✅ Connected
- Supabase: ✅ Connected
- Vector Store: ✅ Connected
- Uptime: 18+ hours
- Average Response: 1,308ms
- Total Requests: 564
- Success Rate: 99.6%

## Available Tools (11 Total)

### 1. query_aoma_knowledge ⚡ PERFORMANCE FIX PENDING

**Description**: Query enterprise AOMA knowledge base using AI assistant

**Status**: 🟡 SLOW (31s) → Will be FAST (6-10s) after deployment

**Parameters**:
- `query` (string, required): Natural language query about AOMA systems
- `strategy` (enum, optional): Response strategy
  - `comprehensive`: Detailed analysis
  - `focused`: Specific answer (default)
  - `rapid`: Concise summary
- `context` (string, optional): Additional task context (max 1000 chars)
- `maxResults` (number, optional): Max knowledge results (1-20, default: 10)

**Example**:
```bash
curl -X POST https://luminous-dedication-production.up.railway.app/rpc \
  -H 'Content-Type: application/json' \
  -d '{
    "jsonrpc":"2.0",
    "id":"1",
    "method":"tools/call",
    "params":{
      "name":"query_aoma_knowledge",
      "arguments":{
        "query":"How do I submit assets?",
        "strategy":"rapid"
      }
    }
  }'
```

**Response Time**:
- Current (OLD): 31,144ms (31.1 seconds) ❌
- After fix: 6,000-10,000ms (6-10 seconds) ✅
- Cached: 2-7ms ⚡

---

### 2. search_jira_tickets

**Description**: Search enterprise Jira tickets using semantic vector search

**Parameters**:
- `query` (string, required): Natural language search query
- `projectKey` (string, optional): Jira project key (e.g., "ITSM")
- `status` (array, optional): Filter by status (e.g., ["Open", "In Progress"])
- `priority` (array, optional): Filter by priority (e.g., ["High", "Critical"])
- `maxResults` (number, optional): Max tickets (1-50, default: 15)
- `threshold` (number, optional): Similarity threshold (0-1, default: 0.6)

**Example**:
```bash
curl -X POST https://luminous-dedication-production.up.railway.app/rpc \
  -H 'Content-Type: application/json' \
  -d '{
    "jsonrpc":"2.0",
    "id":"2",
    "method":"tools/call",
    "params":{
      "name":"search_jira_tickets",
      "arguments":{
        "query":"authentication issues",
        "status":["Open","In Progress"],
        "priority":["High"],
        "maxResults":10
      }
    }
  }'
```

---

### 3. get_jira_ticket_count

**Description**: Get exact count of Jira tickets with optional filters

**Parameters**:
- `projectKey` (string, optional): Count tickets for specific project
- `status` (array, optional): Filter by statuses
- `priority` (array, optional): Filter by priorities

**Example**:
```bash
curl -X POST https://luminous-dedication-production.up.railway.app/rpc \
  -H 'Content-Type: application/json' \
  -d '{
    "jsonrpc":"2.0",
    "id":"3",
    "method":"tools/call",
    "params":{
      "name":"get_jira_ticket_count",
      "arguments":{
        "projectKey":"ITSM",
        "status":["Open"]
      }
    }
  }'
```

---

### 4. search_git_commits

**Description**: Search Git commit history using semantic vector search

**Parameters**:
- `query` (string, required): Natural language search query
- `repository` (array, optional): Filter by repos (e.g., ["mc-tk", "aoma-ui"])
- `author` (array, optional): Filter by commit authors
- `dateFrom` (string, optional): From date (ISO 8601)
- `dateTo` (string, optional): To date (ISO 8601)
- `filePattern` (string, optional): File path pattern (e.g., "*.ts", "auth/")
- `maxResults` (number, optional): Max commits (1-50, default: 15)
- `threshold` (number, optional): Similarity threshold (0-1, default: 0.6)

**Example**:
```bash
curl -X POST https://luminous-dedication-production.up.railway.app/rpc \
  -H 'Content-Type: application/json' \
  -d '{
    "jsonrpc":"2.0",
    "id":"4",
    "method":"tools/call",
    "params":{
      "name":"search_git_commits",
      "arguments":{
        "query":"authentication refactor",
        "filePattern":"auth/",
        "maxResults":10
      }
    }
  }'
```

---

### 5. search_code_files

**Description**: Search code files using semantic vector search

**Parameters**:
- `query` (string, required): Natural language search query
- `repository` (array, optional): Filter by repositories
- `language` (array, optional): Filter by language (e.g., ["TypeScript", "JavaScript"])
- `fileExtension` (array, optional): Filter by extension (e.g., ["ts", "js"])
- `maxResults` (number, optional): Max files (1-50, default: 15)
- `threshold` (number, optional): Similarity threshold (0-1, default: 0.6)

**Example**:
```bash
curl -X POST https://luminous-dedication-production.up.railway.app/rpc \
  -H 'Content-Type: application/json' \
  -d '{
    "jsonrpc":"2.0",
    "id":"5",
    "method":"tools/call",
    "params":{
      "name":"search_code_files",
      "arguments":{
        "query":"JWT token validation",
        "language":["TypeScript"],
        "maxResults":5
      }
    }
  }'
```

---

### 6. search_outlook_emails

**Description**: Search corporate Outlook emails using semantic vector search

**Parameters**:
- `query` (string, required): Natural language search query
- `dateFrom` (string, optional): From date (ISO 8601)
- `dateTo` (string, optional): To date (ISO 8601)
- `fromEmail` (array, optional): Filter by sender addresses
- `toEmail` (array, optional): Filter by recipient addresses
- `subject` (string, optional): Subject line keywords
- `hasAttachments` (boolean, optional): Filter by attachments
- `priority` (array, optional): Filter by priority (High, Normal, Low)
- `maxResults` (number, optional): Max emails (1-50, default: 15)
- `threshold` (number, optional): Similarity threshold (0-1, default: 0.6)

**Example**:
```bash
curl -X POST https://luminous-dedication-production.up.railway.app/rpc \
  -H 'Content-Type: application/json' \
  -d '{
    "jsonrpc":"2.0",
    "id":"6",
    "method":"tools/call",
    "params":{
      "name":"search_outlook_emails",
      "arguments":{
        "query":"deployment schedule",
        "priority":["High"],
        "hasAttachments":true,
        "maxResults":10
      }
    }
  }'
```

---

### 7. analyze_development_context

**Description**: Analyze current development context and provide intelligent recommendations

**Parameters**:
- `currentTask` (string, required): Description of development task
- `codeContext` (string, optional): Code, errors, or technical details (max 5000 chars)
- `systemArea` (enum, optional): Primary system area
  - `frontend`, `backend`, `database`, `infrastructure`, `integration`, `testing`
- `urgency` (enum, optional): Task urgency
  - `low`, `medium` (default), `high`, `critical`

**Example**:
```bash
curl -X POST https://luminous-dedication-production.up.railway.app/rpc \
  -H 'Content-Type: application/json' \
  -d '{
    "jsonrpc":"2.0",
    "id":"7",
    "method":"tools/call",
    "params":{
      "name":"analyze_development_context",
      "arguments":{
        "currentTask":"Implement JWT refresh token rotation",
        "systemArea":"backend",
        "urgency":"high"
      }
    }
  }'
```

---

### 8. get_system_health

**Description**: Get comprehensive health status of AOMA Mesh server

**Parameters**:
- `includeMetrics` (boolean, optional): Include performance metrics (default: true)
- `includeDiagnostics` (boolean, optional): Include service diagnostics (default: false)

**Example**:
```bash
curl -X POST https://luminous-dedication-production.up.railway.app/rpc \
  -H 'Content-Type: application/json' \
  -d '{
    "jsonrpc":"2.0",
    "id":"8",
    "method":"tools/call",
    "params":{
      "name":"get_system_health",
      "arguments":{
        "includeMetrics":true,
        "includeDiagnostics":true
      }
    }
  }'
```

**Response**:
```json
{
  "status": "healthy",
  "services": {
    "openai": {"status": true},
    "supabase": {"status": true},
    "vectorStore": {"status": true}
  },
  "metrics": {
    "uptime": 65382470,
    "totalRequests": 564,
    "successfulRequests": 562,
    "failedRequests": 1,
    "averageResponseTime": 1308.72,
    "version": "2.7.0-railway_20251028-171408"
  }
}
```

---

### 9. get_server_capabilities

**Description**: Get complete list of server capabilities and version info

**Parameters**:
- `includeExamples` (boolean, optional): Include usage examples (default: false)

**Example**:
```bash
curl -X POST https://luminous-dedication-production.up.railway.app/rpc \
  -H 'Content-Type: application/json' \
  -d '{
    "jsonrpc":"2.0",
    "id":"9",
    "method":"tools/call",
    "params":{
      "name":"get_server_capabilities",
      "arguments":{
        "includeExamples":true
      }
    }
  }'
```

---

### 10. swarm_analyze_cross_vector 🚀

**Description**: 2025 LangGraph Swarm - Advanced multi-agent cross-vector analysis

**Parameters**:
- `query` (string, required): Complex query requiring multiple agents
- `primaryAgent` (enum, optional): Initial agent (default: synthesis_coordinator)
  - `code_specialist`, `jira_analyst`, `aoma_researcher`, `synthesis_coordinator`
- `contextStrategy` (enum, optional): Context sharing strategy (default: selective_handoff)
  - `isolated`, `shared`, `selective_handoff`
- `maxAgentHops` (number, optional): Max agent handoffs (1-10, default: 5)
- `enableMemoryPersistence` (boolean, optional): Cross-session memory (default: false)

**Example**:
```bash
curl -X POST https://luminous-dedication-production.up.railway.app/rpc \
  -H 'Content-Type: application/json' \
  -d '{
    "jsonrpc":"2.0",
    "id":"10",
    "method":"tools/call",
    "params":{
      "name":"swarm_analyze_cross_vector",
      "arguments":{
        "query":"Analyze authentication issues across code, Jira tickets, and AOMA docs",
        "primaryAgent":"synthesis_coordinator",
        "maxAgentHops":5
      }
    }
  }'
```

---

### 11. swarm_agent_handoff 🔄

**Description**: 2025 Command Pattern - Manual agent handoff with state transfer

**Parameters**:
- `targetAgent` (enum, required): Agent to hand off to
  - `code_specialist`, `jira_analyst`, `aoma_researcher`, `synthesis_coordinator`
- `handoffContext` (string, optional): Context for receiving agent (max 2000 chars)

**Example**:
```bash
curl -X POST https://luminous-dedication-production.up.railway.app/rpc \
  -H 'Content-Type: application/json' \
  -d '{
    "jsonrpc":"2.0",
    "id":"11",
    "method":"tools/call",
    "params":{
      "name":"swarm_agent_handoff",
      "arguments":{
        "targetAgent":"code_specialist",
        "handoffContext":"Found auth issue in Jira ITSM-1234, need code analysis"
      }
    }
  }'
```

---

## Testing

### Quick Health Check
```bash
curl -s https://luminous-dedication-production.up.railway.app/health | jq '.status, .version'
```

### Test Query (Simple)
```bash
curl -X POST https://luminous-dedication-production.up.railway.app/rpc \
  -H 'Content-Type: application/json' \
  -d '{
    "jsonrpc":"2.0",
    "id":"test",
    "method":"tools/call",
    "params":{
      "name":"query_aoma_knowledge",
      "arguments":{"query":"What is AOMA?","strategy":"rapid"}
    }
  }' | jq '.result.response'
```

### Performance Test
```bash
time curl -X POST https://luminous-dedication-production.up.railway.app/rpc \
  -H 'Content-Type: application/json' \
  -d '{
    "jsonrpc":"2.0",
    "id":"perf",
    "method":"tools/call",
    "params":{
      "name":"query_aoma_knowledge",
      "arguments":{"query":"How do I submit assets?","strategy":"rapid"}
    }
  }' | jq '.result.metadata.performance'
```

---

## Deployment Status

### Current Version (OLD)
- Version: `2.7.0-railway_20251028-171408`
- Deployed: October 28, 2025
- Uptime: 18+ hours
- Performance: ❌ SLOW (31s for complex queries)

### New Version (PENDING DEPLOYMENT)
- Commits: `0770b0f`, `fdddfb2`
- Performance Fix: OpenAI Assistants API → Direct Vector Search + Chat Completions
- Expected Performance: ✅ FAST (6-10s for complex queries)
- Expected Improvement: 5-10x faster (83-93% reduction)

### Deployment Commands

Check status:
```bash
cd /Users/mcarpent/Documents/projects/aoma-mesh-mcp
./scripts/check-deployment.sh
```

Manual deploy:
1. Go to https://railway.app
2. Select `aoma-mesh-mcp` project
3. Click "Deployments" → "Deploy"

---

## Error Handling

### Common Errors

**"Invalid method"**: Only `tools/call` is supported via HTTP
- Fix: Use `"method":"tools/call"` not `"method":"tools/list"`

**Timeout**: Query took longer than 25s
- Current: Happens frequently with complex queries (OLD version)
- After fix: Should be rare (NEW version)

**"Query cannot be empty"**: Missing required `query` parameter
- Fix: Always provide `query` in arguments

---

## Integration Examples

### SIAM Integration (Current)

File: `/app/api/aoma/route.ts`

```typescript
const response = await fetch(`${RAILWAY_URL}/rpc`, {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'query_aoma_knowledge',
      arguments: {query, strategy}
    }
  })
});
```

### Claude Desktop Integration

File: `~/.claude/mcp.json`

```json
{
  "mcpServers": {
    "aoma-mesh": {
      "command": "curl",
      "args": [
        "-X", "POST",
        "https://luminous-dedication-production.up.railway.app/rpc",
        "-H", "Content-Type: application/json",
        "-d", "@-"
      ]
    }
  }
}
```

---

**Last Updated**: 2025-10-29 11:30 UTC
**Status**: ⏳ Performance fix deployed to GitHub, waiting for Railway deployment
**Next**: Manual Railway deployment required
