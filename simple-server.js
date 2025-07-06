#!/usr/bin/env node
/**
 * Simple MCP Server for Fargate Deployment
 * Provides basic MCP functionality without external dependencies
 */

import http from 'http';
const port = process.env.PORT || 3000;
const host = process.env.HOST || '0.0.0.0';

// Simple health check endpoint
const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  
  if (req.url === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'mcp-server',
      version: '2.0.0'
    }));
    return;
  }
  
  if (req.url === '/') {
    res.writeHead(200);
    res.end(JSON.stringify({
      message: 'MCP Server is running',
      endpoints: ['/health', '/'],
      timestamp: new Date().toISOString()
    }));
    return;
  }
  
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(port, host, () => {
  console.log(`MCP Server running at http://${host}:${port}`);
  console.log(`Health check available at http://${host}:${port}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});