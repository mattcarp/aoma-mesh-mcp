# AOMA Mesh MCP Server - Third-Party Integration Guide

## 🔗 Stable Production Endpoints

The AOMA Mesh MCP Server is deployed on AWS Lambda with **permanent, never-changing URLs**:

```
Primary URL: https://5so2f6gefeuoaywpuymjikix5e0rhqyo.lambda-url.us-east-2.on.aws
Health Check: https://5so2f6gefeuoaywpuymjikix5e0rhqyo.lambda-url.us-east-2.on.aws/health
MCP JSON-RPC: https://5so2f6gefeuoaywpuymjikix5e0rhqyo.lambda-url.us-east-2.on.aws/rpc
```

## 🚀 Quick Start

### 1. Health Check
```bash
curl https://5so2f6gefeuoaywpuymjikix5e0rhqyo.lambda-url.us-east-2.on.aws/health
```

### 2. List Available Tools
```bash
curl -X POST https://5so2f6gefeuoaywpuymjikix5e0rhqyo.lambda-url.us-east-2.on.aws/rpc \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/list"}'
```

### 3. Query AOMA Knowledge
```bash
curl -X POST https://5so2f6gefeuoaywpuymjikix5e0rhqyo.lambda-url.us-east-2.on.aws/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "query_aoma_knowledge",
      "arguments": {
        "query": "What is AOMA?",
        "strategy": "comprehensive"
      }
    }
  }'
```

## 🛠️ Available Tools

| Tool | Description | Required Arguments |
|------|-------------|-------------------|
| **query_aoma_knowledge** | Search AOMA knowledge base | `query`, `strategy` |
| **search_jira_tickets** | Search Jira tickets | `query`, `projectKey` (optional) |
| **get_system_health** | Get system health status | None |

## 💻 Integration Examples

### JavaScript/Node.js
```javascript
const MCP_SERVER_URL = 'https://5so2f6gefeuoaywpuymjikix5e0rhqyo.lambda-url.us-east-2.on.aws';

async function queryAOMA(question) {
  const response = await fetch(`${MCP_SERVER_URL}/rpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      method: 'tools/call',
      params: {
        name: 'query_aoma_knowledge',
        arguments: {
          query: question,
          strategy: 'comprehensive'
        }
      }
    })
  });
  
  const data = await response.json();
  return JSON.parse(data.result.content[0].text);
}

// Usage
const result = await queryAOMA('How do I export assets from AOMA?');
console.log(result.response);
```

### Python
```python
import requests
import json

MCP_SERVER_URL = 'https://5so2f6gefeuoaywpuymjikix5e0rhqyo.lambda-url.us-east-2.on.aws'

def query_aoma(question):
    response = requests.post(f'{MCP_SERVER_URL}/rpc', 
        headers={'Content-Type': 'application/json'},
        json={
            'method': 'tools/call',
            'params': {
                'name': 'query_aoma_knowledge',
                'arguments': {
                    'query': question,
                    'strategy': 'comprehensive'
                }
            }
        })
    
    data = response.json()
    return json.loads(data['result']['content'][0]['text'])

# Usage
result = query_aoma('What audio formats does AOMA support?')
print(result['response'])
```

### curl (Command Line)
```bash
# Quick AOMA query
curl -X POST https://5so2f6gefeuoaywpuymjikix5e0rhqyo.lambda-url.us-east-2.on.aws/rpc \
  -H "Content-Type: application/json" \
  -d '{"method":"tools/call","params":{"name":"query_aoma_knowledge","arguments":{"query":"AOMA export process","strategy":"quick"}}}' \
  | jq '.result.content[0].text' | jq -r 'fromjson.response'
```

## 📝 Query Strategies

| Strategy | Use Case | Response Speed |
|----------|----------|---------------|
| **quick** | Fast answers, basic info | ~1-2 seconds |
| **comprehensive** | Detailed responses with context | ~3-5 seconds |
| **focused** | Specific technical details | ~2-3 seconds |

## 🔧 Response Format

All tool calls return JSON with this structure:
```json
{
  "jsonrpc": "2.0",
  "result": {
    "content": [{
      "type": "text", 
      "text": "{\"query\":\"...\",\"response\":\"...\",\"metadata\":{...}}"
    }]
  }
}
```

The `text` field contains a JSON string with:
- `query`: Your original question
- `response`: The answer from AOMA knowledge base
- `metadata`: Additional context and timing info

## 🚨 Error Handling

```javascript
try {
  const response = await fetch(`${MCP_SERVER_URL}/rpc`, { /* ... */ });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  if (data.error) {
    throw new Error(`MCP Error: ${data.error.message}`);
  }
  
  return JSON.parse(data.result.content[0].text);
  
} catch (error) {
  console.error('AOMA MCP query failed:', error);
  return { error: error.message };
}
```

## 📊 Performance & Limits

- **Timeout**: 30 seconds per request
- **Concurrent requests**: No hard limit (AWS Lambda auto-scales)
- **Rate limiting**: None currently applied
- **Cold start**: ~600ms (only on first request after idle)
- **Warm requests**: ~50-100ms response time

## 🔐 Security Notes

- **Public access**: No authentication currently required
- **CORS**: Enabled for web applications
- **HTTPS only**: All endpoints use SSL/TLS
- **Production ready**: 99.95% uptime SLA

## 📞 Support

For integration issues or questions:
- Check the health endpoint first
- Review CloudWatch logs if you have AWS access
- Contact the development team with specific error messages

---

**🎯 Ready to integrate? Start with the health check and basic query examples above!**