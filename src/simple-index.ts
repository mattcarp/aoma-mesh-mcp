#!/usr/bin/env node
/**
 * Simple MCP Server Entry Point
 * 
 * Uses a simplified server implementation to avoid complex build issues
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { RealAOMAServer } from './real-aoma-server.js';

const server = new Server(
  {
    name: '@mc-tk/real-aoma-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  }
);

// Initialize the real AOMA agent server
const agentServer = new RealAOMAServer();

// Set up request handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: agentServer.getToolDefinitions()
  };
});

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: agentServer.getResourceTemplates()
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  return await agentServer.callTool(request.params.name, request.params.arguments || {});
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  return await agentServer.readResource(request.params.uri);
});

// Start the server
async function main() {
  try {
    await agentServer.initialize();
    
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    console.error('Real AOMA MCP Server with LangGraph integration running on stdio');
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});