#!/bin/bash

# Complete Lambda deployment with dependencies
# This script creates a full deployment package including all dependencies

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Complete Lambda Package Deployment${NC}"
echo "======================================="

# Configuration
FUNCTION_NAME="aoma-mesh-mcp-server"
REGION="us-east-2"
DIST_DIR="dist"
LAMBDA_DIR="lambda-package"
ZIP_FILE="lambda-deployment-full.zip"

# Step 1: Clean previous builds
echo -e "${BLUE}Cleaning previous builds...${NC}"
rm -rf "$LAMBDA_DIR" "$ZIP_FILE"

# Step 2: Build the project
echo -e "${BLUE}Building project...${NC}"
npm run build

# Step 3: Create Lambda package directory
echo -e "${BLUE}Creating Lambda package...${NC}"
mkdir -p "$LAMBDA_DIR"

# Step 4: Copy built files
echo -e "${BLUE}Copying built files...${NC}"
cp -r "$DIST_DIR"/* "$LAMBDA_DIR/"

# Step 5: Create package.json for Lambda
echo -e "${BLUE}Creating Lambda package.json...${NC}"
cat > "$LAMBDA_DIR/package.json" << EOF
{
  "type": "module",
  "dependencies": {
    "@aws-sdk/client-ssm": "^3.716.0",
    "@modelcontextprotocol/sdk": "^1.0.2",
    "@supabase/supabase-js": "^2.39.0",
    "openai": "^4.20.1",
    "zod": "^3.24.2"
  }
}
EOF

# Step 6: Install production dependencies
echo -e "${BLUE}Installing production dependencies...${NC}"
cd "$LAMBDA_DIR"
npm install --production --no-save

# Step 7: Create deployment package
echo -e "${BLUE}Creating deployment ZIP...${NC}"
zip -rq "../$ZIP_FILE" . 

# Get size
cd ..
ZIP_SIZE=$(du -h "$ZIP_FILE" | cut -f1)
echo -e "${GREEN}Package size: $ZIP_SIZE${NC}"

# Step 8: Update Lambda function
echo -e "${BLUE}Uploading to Lambda...${NC}"
aws lambda update-function-code \
    --function-name "$FUNCTION_NAME" \
    --zip-file "fileb://$ZIP_FILE" \
    --region "$REGION" \
    --no-cli-pager

# Step 9: Wait for update
echo -e "${BLUE}Waiting for Lambda update...${NC}"
aws lambda wait function-updated \
    --function-name "$FUNCTION_NAME" \
    --region "$REGION"

# Step 10: Get function URL
FUNCTION_URL=$(aws lambda get-function-url-config \
    --function-name "$FUNCTION_NAME" \
    --region "$REGION" \
    --query 'FunctionUrl' \
    --output text)

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo -e "${GREEN}Function URL: $FUNCTION_URL${NC}"
echo -e "${GREEN}Health Check: ${FUNCTION_URL}health${NC}"
echo -e "${GREEN}RPC Endpoint: ${FUNCTION_URL}rpc${NC}"

# Step 11: Test deployment
echo -e "${BLUE}Testing health endpoint...${NC}"
sleep 3
RESPONSE=$(curl -s -w "\nSTATUS:%{http_code}" "${FUNCTION_URL}health")
STATUS=$(echo "$RESPONSE" | grep "STATUS:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | grep -v "STATUS:")

if [ "$STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Health check passed!${NC}"
    echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
else
    echo -e "${RED}❌ Health check failed (HTTP $STATUS)${NC}"
    echo "$BODY"
fi

# Clean up
rm -rf "$LAMBDA_DIR"
