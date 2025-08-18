#!/bin/bash
# Silent MCP startup script - no output to stdout
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" >/dev/null 2>&1
nvm use 22.18.0 >/dev/null 2>&1
cd /Users/matt/Documents/projects/aoma-mesh-mcp
exec npx tsx src/aoma-mesh-server.ts
