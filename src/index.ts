#!/usr/bin/env node

/**
 * MC-TK Agent MCP Server
 * 
 * This server exposes the LangGraph agents from the MC-TK application 
 * through the Model Context Protocol (MCP), enabling external development 
 * tools to interact with the sophisticated agent ecosystem.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';

import { AgentServer } from './agent-server.js';
import { setupEnvironment } from './utils/environment.js';
import { streamingTransport } from './streaming/transport.js';

// Load environment variables
dotenv.config({ path: '../.env.local' });
dotenv.config({ path: '../.env' });

async function main() {
  // Setup environment and validate required variables
  await setupEnvironment();

  const server = new Server(
    {
      name: 'mc-tk-agent-server',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    }
  );

  // Initialize the agent server
  const agentServer = new AgentServer();
  await agentServer.initialize();

  // Register tool handlers
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: agentServer.getToolDefinitions(),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    // Check if this is a streaming operation
    const operation = streamingTransport.getOperation(name);
    if (operation) {
      // Execute as streaming operation
      return await streamingTransport.executeStreamingTool(name, args || {});
    }
    
    // Execute as regular operation
    return await agentServer.callTool(name, args || {});
  });

  // Register resource handlers
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: agentServer.getResourceDefinitions(),
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    return await agentServer.readResource(uri);
  });

  // Setup stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('MC-TK Agent MCP Server running on stdio');
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.error('Shutting down MC-TK Agent MCP Server...');
  process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}