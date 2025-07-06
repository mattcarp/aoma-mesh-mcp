#!/usr/bin/env node
/**
 * Standalone AOMA MCP Server Entry Point
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { StandaloneAOMAServer } from './standalone-aoma-server.js';

const server = new Server(
  {
    name: '@mc-tk/standalone-aoma-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  }
);

// Initialize the standalone AOMA server
const aomaServer = new StandaloneAOMAServer();

// Set up request handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: aomaServer.getToolDefinitions()
  };
});

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: aomaServer.getResourceTemplates()
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  return await aomaServer.callTool(request.params.name, request.params.arguments || {});
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  return await aomaServer.readResource(request.params.uri);
});

// Start the server
async function main() {
  try {
    await aomaServer.initialize();
    
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    console.error('🚀 Standalone AOMA MCP Server with real infrastructure running on stdio');
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Server error:', error);
  process.exit(1);
});