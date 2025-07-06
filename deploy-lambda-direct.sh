#!/bin/bash

# Direct Lambda Deployment Script (Simplified)
# Creates Lambda function with Function URLs using AWS CLI

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 Direct Lambda Deployment${NC}"
echo "================================"

# Function configuration
FUNCTION_NAME="aoma-mesh-mcp-server"
REGION="us-east-2"

# Step 1: Create IAM role for Lambda
echo -e "${BLUE}Step 1: Creating IAM role...${NC}"

# Create trust policy
cat > /tmp/trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create execution policy
cat > /tmp/execution-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:${REGION}:*:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameter",
        "ssm:GetParameters"
      ],
      "Resource": "arn:aws:ssm:${REGION}:*:parameter/mcp-server/*"
    }
  ]
}
EOF

# Create role (ignore if exists)
aws iam create-role \
  --role-name ${FUNCTION_NAME}-role \
  --assume-role-policy-document file:///tmp/trust-policy.json \
  --description "Lambda execution role for AOMA MCP Server" \
  2>/dev/null || echo "Role already exists"

# Attach basic execution policy
aws iam attach-role-policy \
  --role-name ${FUNCTION_NAME}-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole \
  2>/dev/null || echo "Policy already attached"

# Create and attach custom policy
aws iam put-role-policy \
  --role-name ${FUNCTION_NAME}-role \
  --policy-name ${FUNCTION_NAME}-policy \
  --policy-document file:///tmp/execution-policy.json \
  2>/dev/null || echo "Custom policy already exists"

# Get account ID and role ARN
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/${FUNCTION_NAME}-role"

echo -e "${GREEN}✅ IAM role created: ${ROLE_ARN}${NC}"

# Step 2: Create environment variables from SSM
echo -e "${BLUE}Step 2: Preparing environment variables...${NC}"

# Get values from SSM parameters
OPENAI_API_KEY=$(aws ssm get-parameter --name "/mcp-server/openai-api-key" --with-decryption --query Parameter.Value --output text)
AOMA_ASSISTANT_ID=$(aws ssm get-parameter --name "/mcp-server/aoma-assistant-id" --with-decryption --query Parameter.Value --output text)
OPENAI_VECTOR_STORE_ID=$(aws ssm get-parameter --name "/mcp-server/openai-vector-store-id" --with-decryption --query Parameter.Value --output text)
SUPABASE_URL=$(aws ssm get-parameter --name "/mcp-server/supabase-url" --with-decryption --query Parameter.Value --output text)
SUPABASE_SERVICE_KEY=$(aws ssm get-parameter --name "/mcp-server/supabase-service-role-key" --with-decryption --query Parameter.Value --output text)
SUPABASE_ANON_KEY=$(aws ssm get-parameter --name "/mcp-server/supabase-anon-key" --with-decryption --query Parameter.Value --output text)

echo -e "${GREEN}✅ Environment variables retrieved from SSM${NC}"

# Step 3: Create or update Lambda function
echo -e "${BLUE}Step 3: Creating Lambda function...${NC}"

# Wait for role to be ready
sleep 10

# Check if function exists
if aws lambda get-function --function-name $FUNCTION_NAME >/dev/null 2>&1; then
    echo "Function exists, updating code..."
    aws lambda update-function-code \
      --function-name $FUNCTION_NAME \
      --zip-file fileb://lambda-deployment.zip
    
    echo "Updating configuration..."
    aws lambda update-function-configuration \
      --function-name $FUNCTION_NAME \
      --environment Variables="{
        NODE_ENV=production,
        LOG_LEVEL=info,
        MCP_SERVER_VERSION=2.0.0-lambda,
        MAX_RETRIES=3,
        TIMEOUT_MS=30000,
        OPENAI_API_KEY=$OPENAI_API_KEY,
        AOMA_ASSISTANT_ID=$AOMA_ASSISTANT_ID,
        OPENAI_VECTOR_STORE_ID=$OPENAI_VECTOR_STORE_ID,
        NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_KEY,
        NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
      }" \
      --timeout 30 \
      --memory-size 1024
else
    echo "Creating new function..."
    aws lambda create-function \
      --function-name $FUNCTION_NAME \
      --runtime nodejs20.x \
      --role $ROLE_ARN \
      --handler lambda-handler.handler \
      --zip-file fileb://lambda-deployment.zip \
      --timeout 30 \
      --memory-size 1024 \
      --environment Variables="{
        NODE_ENV=production,
        LOG_LEVEL=info,
        MCP_SERVER_VERSION=2.0.0-lambda,
        MAX_RETRIES=3,
        TIMEOUT_MS=30000,
        OPENAI_API_KEY=$OPENAI_API_KEY,
        AOMA_ASSISTANT_ID=$AOMA_ASSISTANT_ID,
        OPENAI_VECTOR_STORE_ID=$OPENAI_VECTOR_STORE_ID,
        NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_KEY,
        NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
      }" \
      --description "AOMA Mesh MCP Server - Lambda deployment with stable Function URLs"
fi

echo -e "${GREEN}✅ Lambda function created/updated${NC}"

# Step 4: Create Function URL
echo -e "${BLUE}Step 4: Creating Function URL...${NC}"

# Delete existing Function URL if it exists
aws lambda delete-function-url-config --function-name $FUNCTION_NAME 2>/dev/null || true

# Create new Function URL
FUNCTION_URL=$(aws lambda create-function-url-config \
  --function-name $FUNCTION_NAME \
  --auth-type NONE \
  --cors "AllowCredentials=false,AllowHeaders=Content-Type,AllowMethods=GET,AllowMethods=POST,AllowMethods=OPTIONS,AllowOrigins=*,MaxAge=3600" \
  --query FunctionUrl --output text)

echo -e "${GREEN}✅ Function URL created: ${FUNCTION_URL}${NC}"

# Step 5: Test the deployment
echo -e "${BLUE}Step 5: Testing deployment...${NC}"

# Wait for function to be ready
sleep 5

# Test health endpoint
echo "Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s -w "%{http_code}" "${FUNCTION_URL}health" -o /tmp/health_response.json)

if [ "$HEALTH_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ Health check passed!${NC}"
    echo "Response: $(cat /tmp/health_response.json)"
else
    echo -e "${RED}⚠️  Health check returned status: $HEALTH_RESPONSE${NC}"
fi

# Clean up temp files
rm -f /tmp/trust-policy.json /tmp/execution-policy.json /tmp/health_response.json

# Step 6: Output final information
echo ""
echo -e "${BLUE}🎉 DEPLOYMENT COMPLETE!${NC}"
echo "=================================="
echo ""
echo -e "${GREEN}📋 Lambda Function Details:${NC}"
echo "Function Name: $FUNCTION_NAME"
echo "Region: $REGION"
echo "Runtime: Node.js 20.x"
echo ""
echo -e "${GREEN}🌐 Stable Endpoints (NEVER CHANGE):${NC}"
echo "Main URL: $FUNCTION_URL"
echo "Health Check: ${FUNCTION_URL}health"
echo "MCP RPC: ${FUNCTION_URL}rpc"
echo "Tools: ${FUNCTION_URL}tools/{toolName}"
echo "Metrics: ${FUNCTION_URL}metrics"
echo ""

# Save endpoints to file
cat > ../lambda-endpoints.txt << EOF
# AOMA Mesh MCP Server - Lambda Endpoints
# Deployed: $(date)
# These URLs are stable and will NEVER change!

Function URL: $FUNCTION_URL
Health Check: ${FUNCTION_URL}health
MCP RPC Endpoint: ${FUNCTION_URL}rpc
Tools Endpoint: ${FUNCTION_URL}tools/{toolName}
Metrics: ${FUNCTION_URL}metrics

Function Name: $FUNCTION_NAME
Function ARN: arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${FUNCTION_NAME}
AWS Region: $REGION
AWS Account: $ACCOUNT_ID
EOF

echo -e "${GREEN}✅ Endpoints saved to lambda-endpoints.txt${NC}"
echo ""
echo -e "${BLUE}🚀 Your MCP server is now live with stable, permanent endpoints!${NC}"