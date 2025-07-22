// Simple Lambda handler for AOMA Mesh MCP Server
// This is a simplified version that works without TypeScript compilation issues

const https = require('https');
const http = require('http');

// Simple health check function
async function healthCheck() {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0-lambda-simple',
    services: {
      lambda: { status: true },
      environment: { status: true }
    }
  };
}

// Simple tool execution
async function executeTool(toolName, args) {
  switch (toolName) {
    case 'get_system_health':
      return await healthCheck();
    
    case 'query_aoma_knowledge':
      return {
        message: 'AOMA knowledge query received',
        query: args.query || 'No query provided',
        status: 'processed'
      };
    
    case 'search_jira_tickets':
      return {
        message: 'Jira search received',
        query: args.query || 'No query provided',
        results: [],
        totalResults: 0
      };
    
    default:
      return {
        error: `Tool '${toolName}' not implemented in simple handler`,
        availableTools: ['get_system_health', 'query_aoma_knowledge', 'search_jira_tickets']
      };
  }
}

// Lambda handler
exports.handler = async (event, context) => {
  console.log('Lambda invocation:', JSON.stringify(event, null, 2));
  
  try {
    // Handle different types of requests
    if (event.httpMethod) {
      // HTTP request (API Gateway or Function URL)
      const path = event.path || event.rawPath || '/';
      const method = event.httpMethod || event.requestContext?.http?.method || 'GET';
      
      if (path === '/health' || path === '/') {
        const health = await healthCheck();
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify(health)
        };
      }
      
      if (path === '/rpc' && method === 'POST') {
        let body;
        try {
          body = JSON.parse(event.body || '{}');
        } catch (e) {
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Invalid JSON in request body' })
          };
        }
        
        if (body.method === 'tools/call') {
          const toolName = body.params?.name;
          const args = body.params?.arguments || {};
          
          const result = await executeTool(toolName, args);
          
          return {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: body.id || 1,
              result: {
                content: [{
                  type: 'text',
                  text: JSON.stringify(result)
                }]
              }
            })
          };
        }
        
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Unsupported RPC method' })
        };
      }
      
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Not found' })
      };
    }
    
    // Direct invocation
    const health = await healthCheck();
    return {
      statusCode: 200,
      body: health
    };
    
  } catch (error) {
    console.error('Lambda error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};
