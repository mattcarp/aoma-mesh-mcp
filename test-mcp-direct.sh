#!/bin/bash

echo "🚀 Direct Supabase MCP Test"
echo "Using your working command..."
echo ""

# Kill any existing processes on the port
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Start the MCP server in background and capture output
echo "Starting MCP server..."
SUPABASE_ACCESS_TOKEN=sbp_1a8f4f86627299d3d432b3061f405bec8d2c8370 \
SUPABASE_PROJECT_REF=kfxetwuuzljhybfgmpuc \
npx -y @supabase/mcp-server-supabase@latest > mcp_output.log 2>&1 &

MCP_PID=$!
echo "MCP Server started with PID: $MCP_PID"

# Wait a moment for server to start
sleep 3

# Test with a simple tools list request
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | nc -w 5 localhost 3000 2>/dev/null || echo "Direct connection failed"

# Show what the server is outputting
echo ""
echo "📋 MCP Server Output:"
head -20 mcp_output.log 2>/dev/null || echo "No output captured yet"

# Cleanup
kill $MCP_PID 2>/dev/null
echo ""
echo "✅ Test complete - check mcp_output.log for details"
