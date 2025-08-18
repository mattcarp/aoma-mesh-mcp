#!/bin/bash

# Test AOMA MCP Server with logging enabled
echo "Starting AOMA MCP Server with logging enabled..."
echo "Logs will be written to: /Users/matt/Documents/projects/aoma-mesh-mcp/logs/"
echo "----------------------------------------"

cd /Users/matt/Documents/projects/aoma-mesh-mcp

# Set environment variables
export NODE_ENV=development
export MCP_LOGGING=true
export LANGCHAIN_TRACING_V2=false  # Disable for now to avoid API key issues

# Load environment from .env file
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Run the server
echo "Starting server..."
npx tsx src/aoma-mesh-server.ts
