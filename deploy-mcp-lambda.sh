#!/bin/bash

# 🚀 Lambda Deployment Script for AOMA Mesh MCP Server
# Deploys the MCP server to AWS Lambda using AWS CDK

set -e

echo "🚀 DEPLOYING AOMA MESH MCP SERVER TO AWS LAMBDA"
echo "==============================================="

# 1. Build Lambda package
echo "📦 Building Lambda package..."
pnpm install
pnpm run build

# Package Lambda code (assumes lambda-package/ is up to date)
cd lambda-package
pnpm install --prod
zip -r ../lambda-deployment.zip ./*
cd ..

# 2. Deploy CDK stack
echo "🏗️  Deploying AWS CDK stack..."
cd infrastructure
pnpm install
npx cdk deploy --require-approval never

# 3. Output Lambda Function URL and health check endpoint
echo ""
echo "📊 DEPLOYMENT OUTPUTS"
npx cdk output

echo ""
echo "✅ Lambda deployment complete! See above for Function URL and health check endpoint."