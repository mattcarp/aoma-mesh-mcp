#!/usr/bin/env node
/**
 * AWS Lambda Handler for AOMA Mesh MCP Server
 * Simplified version to avoid OpenTelemetry conflicts
 */

// Disable OpenTelemetry auto-instrumentation for OpenAI to prevent shims conflicts
process.env.OTEL_INSTRUMENTATIONS_DISABLED = 'openai';
process.env.OTEL_RESOURCE_ATTRIBUTES = 'service.name=aoma-mesh-mcp-server';

import { AOMAMeshServer } from './aoma-mesh-server-lambda.js';

// Singleton instance
let serverInstance = null;

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '86400'
};

/**
 * AWS Lambda handler function
 */
export const handler = async (event, context) => {
    // Disable Lambda timeout callback for cleaner logs
    context.callbackWaitsForEmptyEventLoop = false;
    
    console.log('Lambda invocation:', {
        requestId: context.awsRequestId,
        path: event.path,
        method: event.httpMethod
    });

    try {
        const { httpMethod, path, body } = event;

        // CORS preflight
        if (httpMethod === 'OPTIONS') {
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: ''
            };
        }

        // Initialize server if needed
        if (!serverInstance) {
            console.log('Initializing AOMA Mesh Server...');
            try {
                serverInstance = new AOMAMeshServer();
                await serverInstance.initialize();
                console.log('Server initialized successfully');
            } catch (error) {
                console.error('Failed to initialize server:', error);
                return {
                    statusCode: 500,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        error: 'Server initialization failed',
                        message: error instanceof Error ? error.message : String(error)
                    })
                };
            }
        }

        // Health endpoint
        if (path === '/health' && httpMethod === 'GET') {
            try {
                const health = await serverInstance.getHealthStatus();
                return {
                    statusCode: health.status === 'healthy' ? 200 : 503,
                    headers: corsHeaders,
                    body: JSON.stringify(health)
                };
            } catch (error) {
                return {
                    statusCode: 503,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        status: 'unhealthy',
                        error: error instanceof Error ? error.message : String(error)
                    })
                };
            }
        }

        // MCP RPC endpoint
        if (path === '/rpc' && httpMethod === 'POST') {
            if (!body) {
                return {
                    statusCode: 400,
                    headers: corsHeaders,
                    body: JSON.stringify({ error: 'Request body required' })
                };
            }

            try {
                const rpcRequest = JSON.parse(body);
                const result = await serverInstance.handleMCPRequest(rpcRequest);
                return {
                    statusCode: 200,
                    headers: corsHeaders,
                    body: JSON.stringify(result)
                };
            } catch (error) {
                console.error('RPC error:', error);
                return {
                    statusCode: 500,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        error: 'RPC processing failed',
                        message: error instanceof Error ? error.message : String(error)
                    })
                };
            }
        }

        // Tool execution endpoint
        if (path?.startsWith('/tools/') && httpMethod === 'POST') {
            const toolName = path.replace('/tools/', '');
            
            if (!body) {
                return {
                    statusCode: 400,
                    headers: corsHeaders,
                    body: JSON.stringify({ error: 'Request body required' })
                };
            }

            try {
                const toolArgs = JSON.parse(body);
                const result = await serverInstance.executeTool(toolName, toolArgs);
                return {
                    statusCode: 200,
                    headers: corsHeaders,
                    body: JSON.stringify(result)
                };
            } catch (error) {
                console.error('Tool execution error:', error);
                return {
                    statusCode: 500,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        error: 'Tool execution failed',
                        message: error instanceof Error ? error.message : String(error)
                    })
                };
            }
        }

        // Default response
        return {
            statusCode: 404,
            headers: corsHeaders,
            body: JSON.stringify({
                error: 'Not found',
                message: `Unknown endpoint: ${httpMethod} ${path}`
            })
        };

    } catch (error) {
        console.error('Unhandled error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                error: 'Internal server error',
                message: error instanceof Error ? error.message : String(error)
            })
        };
    }
};
