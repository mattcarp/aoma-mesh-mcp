#!/usr/bin/env node
/**
 * AWS Lambda Handler for AOMA Mesh MCP Server
 * 
 * Converts the existing HTTP Express server to work as a Lambda function
 * with Function URLs for stable endpoint deployment.
 * 
 * @version 2.0.0-lambda
 * @author MC-TK Development Team
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from './types/aws-lambda.js';
import { AOMAMeshServer } from './aoma-mesh-server-lambda.js';

// Singleton instance to reuse across Lambda invocations (warm container)
let serverInstance: AOMAMeshServer | null = null;
let isInitialized = false;

/**
 * AWS Lambda handler function
 */
export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('🔥 Lambda invocation:', {
    requestId: context.awsRequestId,
    event: JSON.stringify(event, null, 2),
    coldStart: !isInitialized,
  });

  try {
    // Initialize server instance (reused across warm invocations)
    if (!serverInstance) {
      console.log('🌱 Cold start: Initializing AOMA Mesh MCP Server...');
      serverInstance = new AOMAMeshServer();
      await serverInstance.initialize();
      isInitialized = true;
      console.log('✅ Server initialized successfully');
    }

    // Handle different HTTP methods and paths
    const response = await handleRequest(event, serverInstance);
    
    // Update metrics
    serverInstance.updateInvocationMetrics(Date.now() - context.getRemainingTimeInMillis());
    
    return response;

  } catch (error) {
    console.error('❌ Lambda handler error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId: context.awsRequestId,
      }),
    };
  }
};

/**
 * Handle different HTTP requests
 */
async function handleRequest(
  event: any, // Lambda Function URL event format
  server: AOMAMeshServer
): Promise<APIGatewayProxyResult> {
  // Lambda Function URL uses a different event format than API Gateway
  const httpMethod = event.requestContext?.http?.method || event.httpMethod;
  const path = event.rawPath || event.path;
  const { body, headers } = event;
  const queryStringParameters = event.queryStringParameters;

  // CORS preflight
  if (httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      },
      body: '',
    };
  }

  // Route to appropriate handler
  if (path === '/health' && httpMethod === 'GET') {
    return handleHealthCheck(server);
  }

  if (path === '/rpc' && httpMethod === 'POST') {
    return handleMCPCall(server, body);
  }

  if (path.startsWith('/tools/') && httpMethod === 'POST') {
    const toolName = path.replace('/tools/', '');
    return handleToolCall(server, toolName, body);
  }

  if (path === '/metrics' && httpMethod === 'GET') {
    return handleMetrics(server);
  }

  // 404 for unknown paths
  return {
    statusCode: 404,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      error: 'Not found',
      path,
      method: httpMethod,
    }),
  };
}

/**
 * Handle health check requests
 */
async function handleHealthCheck(server: AOMAMeshServer): Promise<APIGatewayProxyResult> {
  try {
    const health = await server.getHealthStatus();
    
    return {
      statusCode: health.status === 'healthy' ? 200 : 503,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(health),
    };
  } catch (error) {
    return {
      statusCode: 503,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        status: 'error',
        error: error instanceof Error ? error.message : 'Health check failed',
      }),
    };
  }
}

/**
 * Handle MCP RPC calls
 */
async function handleMCPCall(
  server: AOMAMeshServer,
  body: string | null
): Promise<APIGatewayProxyResult> {
  try {
    if (!body) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Request body required',
        }),
      };
    }

    const request = JSON.parse(body);
    const result = await server.handleMCPRequest(request);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(result),
    };
  } catch (error) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Invalid request',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
}

/**
 * Handle direct tool calls
 */
async function handleToolCall(
  server: AOMAMeshServer,
  toolName: string,
  body: string | null
): Promise<APIGatewayProxyResult> {
  try {
    if (!body) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Request body required for tool calls',
        }),
      };
    }

    const args = JSON.parse(body);
    const result = await server.callTool(toolName, args);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(result),
    };
  } catch (error) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Tool call failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        tool: toolName,
      }),
    };
  }
}

/**
 * Handle metrics requests
 */
async function handleMetrics(server: AOMAMeshServer): Promise<APIGatewayProxyResult> {
  try {
    const metrics = await server.getMetrics();
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(metrics),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Failed to get metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
}