#!/bin/bash
export PATH="/Users/matt/.n/bin:$PATH"
cd /Users/matt/Documents/projects/aoma-mesh-mcp
exec npx tsx src/enhanced-aoma-mesh-server.ts
