import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { AOMAMeshServer } from './aoma-mesh-server-lambda.js';

let server: AOMAMeshServer;

// Complete CORS headers for all responses
const getCorsHeaders = () => ({
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400'
});

export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
  console.log('Lambda handler called with event:', JSON.stringify(event, null, 2));

  // Handle CORS preflight requests (OPTIONS)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: getCorsHeaders(),
      body: ''
    };
  }

  // Health check
  if (event.path === '/health' && event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers: getCorsHeaders(),
      body: JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '2.0.0-lambda'
      })
    };
  }

  // Initialize server if not already done
  if (!server) {
    try {
      server = new AOMAMeshServer();
      await server.initialize();
    } catch (error) {
      console.error('Failed to initialize AOMAMeshServer:', error);
      return {
        statusCode: 500,
        headers: getCorsHeaders(),
        body: JSON.stringify({
          error: 'Failed to initialize server',
          message: error instanceof Error ? error.message : 'Unknown error'
        })
      };
    }
  }

  try {
    // Handle RPC requests
    if (event.path === '/rpc' && event.httpMethod === 'POST') {
      const requestBody = JSON.parse(event.body || '{}');
      
      // Handle the RPC call using existing server
      const result = await server.handleMCPRequest(requestBody);
      
      return {
        statusCode: 200,
        headers: getCorsHeaders(),
        body: JSON.stringify(result)
      };
    }

    // Default response for other paths
    return {
      statusCode: 404,
      headers: getCorsHeaders(),
      body: JSON.stringify({
        error: 'Not Found',
        message: `Path ${event.path} not found`
      })
    };

  } catch (error) {
    console.error('Error handling request:', error);
    return {
      statusCode: 500,
      headers: getCorsHeaders(),
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
