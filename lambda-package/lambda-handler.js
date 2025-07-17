"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const aoma_mesh_server_lambda_js_1 = require("./aoma-mesh-server-lambda.js");
let server;
const handler = async (event, context) => {
    console.log('Lambda handler called with event:', JSON.stringify(event, null, 2));
    // Health check
    if (event.path === '/health' && event.httpMethod === 'GET') {
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
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
            server = new aoma_mesh_server_lambda_js_1.AOMAMeshServer();
            await server.initialize();
        }
        catch (error) {
            console.error('Failed to initialize AOMAMeshServer:', error);
            return {
                statusCode: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
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
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify(result)
            };
        }
        // Default response for other paths
        return {
            statusCode: 404,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                error: 'Not Found',
                message: `Path ${event.path} not found`
            })
        };
    }
    catch (error) {
        console.error('Error handling request:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                error: 'Internal Server Error',
                message: error instanceof Error ? error.message : 'Unknown error'
            })
        };
    }
};
exports.handler = handler;
