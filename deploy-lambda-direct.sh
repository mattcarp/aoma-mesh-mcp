#!/bin/bash

# Direct Lambda deployment without CDK (works with any Node version)
# This script updates the Lambda function code directly

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Direct Lambda Deployment${NC}"
echo "================================"

# Configuration
FUNCTION_NAME="aoma-mesh-mcp-server"
REGION="us-east-2"
DIST_DIR="dist"
ZIP_FILE="lambda-deployment-direct.zip"

# Step 1: Build the project
echo -e "${BLUE}Building project...${NC}"
npm run build

# Step 2: Ensure ES module support
echo -e "${BLUE}Adding ES module configuration...${NC}"
echo '{"type": "module"}' > "$DIST_DIR/package.json"

# Step 3: Create deployment package
echo -e "${BLUE}Creating deployment package...${NC}"
cd "$DIST_DIR"
zip -r "../$ZIP_FILE" . -x "*.map" "*.d.ts"
cd ..

# Step 4: Update Lambda function code
echo -e "${BLUE}Updating Lambda function...${NC}"
aws lambda update-function-code \
    --function-name "$FUNCTION_NAME" \
    --zip-file "fileb://$ZIP_FILE" \
    --region "$REGION"

# Step 5: Wait for update to complete
echo -e "${BLUE}Waiting for update to complete...${NC}"
sleep 5

# Step 6: Get function URL
echo -e "${BLUE}Getting function details...${NC}"
FUNCTION_URL=$(aws lambda get-function-url-config \
    --function-name "$FUNCTION_NAME" \
    --region "$REGION" \
    --query 'FunctionUrl' \
    --output text)

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo -e "${GREEN}Function URL: $FUNCTION_URL${NC}"
echo -e "${GREEN}Health Check: ${FUNCTION_URL}health${NC}"
echo -e "${GREEN}RPC Endpoint: ${FUNCTION_URL}rpc${NC}"

# Step 7: Test the deployment
echo -e "${BLUE}Testing health endpoint...${NC}"
curl -s "${FUNCTION_URL}health" | jq . || echo -e "${YELLOW}Health check failed${NC}"

# Clean up
rm -f "$ZIP_FILE"
