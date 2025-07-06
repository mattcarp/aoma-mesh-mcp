#!/bin/bash

# MC-TK Agent MCP Server Installation Script

set -e

echo "🚀 Installing MC-TK Agent MCP Server..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building MCP server..."
npm run build

# Check if build was successful
if [ ! -f "dist/index.js" ]; then
    echo "❌ Build failed - dist/index.js not found"
    exit 1
fi

echo "✅ Build successful"

# Validate environment
echo "🔍 Validating environment..."

if [ -z "$OPENAI_API_KEY" ]; then
    echo "⚠️  Warning: OPENAI_API_KEY environment variable not set"
    echo "   You'll need to set this before running the server"
fi

# Check if we can access the parent project
if [ ! -f "../src/lib/agents/langgraph/agent-service.js" ] && [ ! -f "../src/lib/agents/langgraph/agent-service.ts" ]; then
    echo "⚠️  Warning: Cannot find MC-TK agent services"
    echo "   Make sure this is installed in the correct location relative to the main project"
fi

echo ""
echo "🎉 Installation complete!"
echo ""
echo "Next steps:"
echo "1. Set your environment variables:"
echo "   export OPENAI_API_KEY='sk-your-openai-key'"
echo ""
echo "2. Test the server:"
echo "   npm run dev"
echo ""
echo "3. Configure your MCP client:"
echo "   Use the configuration in claude-desktop-config.json"
echo ""
echo "4. For Claude Desktop, add this to your configuration:"
echo '   {
     "servers": {
       "mc-tk-agents": {
         "command": "node",
         "args": ["'$(pwd)'/dist/index.js"],
         "env": {
           "OPENAI_API_KEY": "sk-your-key-here"
         }
       }
     }
   }'
echo ""