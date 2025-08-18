#!/bin/bash

echo "=== MCP Diagnostic Tool ==="
echo "Date: $(date)"
echo ""

# Check if node and npm are available
echo "1. Checking Node environment:"
which node && node --version || echo "Node not found in PATH"
which npm && npm --version || echo "npm not found in PATH"
which npx && npx --version || echo "npx not found in PATH"
echo ""

# Check NVM setup
echo "2. Checking NVM setup:"
if [ -s "$HOME/.nvm/nvm.sh" ]; then
    source "$HOME/.nvm/nvm.sh"
    nvm current
else
    echo "NVM not found"
fi
echo ""

# Check network connectivity
echo "3. Testing network connectivity:"
ping -c 1 api.openai.com > /dev/null 2>&1 && echo "✓ OpenAI API reachable" || echo "✗ Cannot reach OpenAI API"
ping -c 1 supabase.co > /dev/null 2>&1 && echo "✓ Supabase reachable" || echo "✗ Cannot reach Supabase"
echo ""

# Check if typescript and tsx are available
echo "4. Checking TypeScript tools:"
npx tsx --version 2>/dev/null || echo "tsx not available"
echo ""

# Check if the server file exists
echo "5. Checking server file:"
if [ -f "/Users/matt/Documents/projects/aoma-mesh-mcp/src/aoma-mesh-server.ts" ]; then
    echo "✓ Server file exists"
    echo "File size: $(wc -c < /Users/matt/Documents/projects/aoma-mesh-mcp/src/aoma-mesh-server.ts) bytes"
else
    echo "✗ Server file not found"
fi
echo ""

# Check Claude app processes
echo "6. Checking Claude-related processes:"
ps aux | grep -i claude | grep -v grep | head -5
echo ""

# Check port availability
echo "7. Checking common MCP ports:"
lsof -i :3000 2>/dev/null && echo "Port 3000 in use" || echo "Port 3000 available"
lsof -i :8080 2>/dev/null && echo "Port 8080 in use" || echo "Port 8080 available"
echo ""

echo "=== End Diagnostic ==="
