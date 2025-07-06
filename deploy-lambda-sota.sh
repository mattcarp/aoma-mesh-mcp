#!/bin/bash

# AOMA Mesh MCP Server - Lambda Deployment Script
# Version: 2.0.0-lambda
# Deploys MCP server to AWS Lambda with stable Function URLs

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR"
DIST_DIR="$PROJECT_DIR/dist"
LAMBDA_ZIP="$PROJECT_DIR/lambda-deployment.zip"
INFRA_DIR="$PROJECT_DIR/infrastructure"

echo -e "${BLUE}🚀 AOMA Mesh MCP Server - Lambda Deployment${NC}"
echo -e "${BLUE}================================================${NC}"
echo "Project Directory: $PROJECT_DIR"
echo "Infrastructure Directory: $INFRA_DIR"
echo ""

# Function to print status
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Step 1: Verify AWS CLI and credentials
echo -e "${BLUE}Step 1: Verifying AWS CLI and credentials...${NC}"
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI not found. Please install AWS CLI."
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    print_error "AWS credentials not configured. Run 'aws configure' first."
    exit 1
fi

AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=$(aws configure get region)
print_status "AWS Account: $AWS_ACCOUNT"
print_status "AWS Region: $AWS_REGION"

# Step 2: Verify CDK installation
echo -e "${BLUE}Step 2: Verifying AWS CDK installation...${NC}"
if ! command -v npx &> /dev/null; then
    print_error "npx not found. Please install Node.js and npm."
    exit 1
fi

# Install CDK if not present
if ! npx cdk --version &> /dev/null; then
    print_warning "CDK not found. Installing AWS CDK..."
    npm install -g aws-cdk
fi

CDK_VERSION=$(npx cdk --version)
print_status "CDK Version: $CDK_VERSION"

# Step 3: Bootstrap CDK (if needed)
echo -e "${BLUE}Step 3: CDK Bootstrap check...${NC}"
BOOTSTRAP_STACK="CDKToolkit"
if ! aws cloudformation describe-stacks --stack-name $BOOTSTRAP_STACK --region $AWS_REGION &> /dev/null; then
    print_warning "CDK not bootstrapped in this region. Bootstrapping..."
    npx cdk bootstrap aws://$AWS_ACCOUNT/$AWS_REGION
    print_status "CDK bootstrapped successfully"
else
    print_status "CDK already bootstrapped"
fi

# Step 4: Verify environment variables and SSM parameters
echo -e "${BLUE}Step 4: Verifying SSM parameters...${NC}"
REQUIRED_PARAMS=(
    "/mcp-server/openai-api-key"
    "/mcp-server/aoma-assistant-id"
    "/mcp-server/next-public-supabase-url"
    "/mcp-server/supabase-service-role-key"
    "/mcp-server/next-public-supabase-anon-key"
)

for param in "${REQUIRED_PARAMS[@]}"; do
    if aws ssm get-parameter --name "$param" --region $AWS_REGION &> /dev/null; then
        print_status "Parameter exists: $param"
    else
        print_error "Missing SSM parameter: $param"
        echo "Please create this parameter in AWS Systems Manager Parameter Store"
        echo "Example: aws ssm put-parameter --name '$param' --value 'your-value' --type SecureString"
        exit 1
    fi
done

# Step 5: Clean and build the project
echo -e "${BLUE}Step 5: Building MCP server for Lambda...${NC}"
cd "$PROJECT_DIR"

# Clean previous builds
print_status "Cleaning previous builds..."
rm -rf "$DIST_DIR"
rm -f "$LAMBDA_ZIP"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    pnpm install
fi

# Build TypeScript
print_status "Building TypeScript..."
npm run build

# Verify dist directory
if [ ! -d "$DIST_DIR" ]; then
    print_error "Build failed - dist directory not found"
    exit 1
fi

print_status "Build completed successfully"

# Step 6: Install infrastructure dependencies
echo -e "${BLUE}Step 6: Installing infrastructure dependencies...${NC}"
cd "$INFRA_DIR"

if [ ! -d "node_modules" ]; then
    print_status "Installing CDK dependencies..."
    npm install
fi

# Step 7: Deploy to AWS Lambda
echo -e "${BLUE}Step 7: Deploying to AWS Lambda...${NC}"
print_status "Starting CDK deployment..."

# Run CDK deployment
npx cdk deploy --require-approval never --outputs-file cdk-outputs.json

if [ $? -eq 0 ]; then
    print_status "CDK deployment completed successfully!"
else
    print_error "CDK deployment failed"
    exit 1
fi

# Step 8: Extract and display deployment information
echo -e "${BLUE}Step 8: Deployment Summary${NC}"
echo -e "${BLUE}========================${NC}"

if [ -f "cdk-outputs.json" ]; then
    # Parse CDK outputs
    FUNCTION_URL=$(cat cdk-outputs.json | grep -o '"FunctionUrl":"[^"]*' | cut -d'"' -f4 | head -1)
    FUNCTION_ARN=$(cat cdk-outputs.json | grep -o '"LambdaFunctionArn":"[^"]*' | cut -d'"' -f4 | head -1)
    FUNCTION_NAME=$(cat cdk-outputs.json | grep -o '"LambdaFunctionName":"[^"]*' | cut -d'"' -f4 | head -1)
    
    echo ""
    print_status "🎉 DEPLOYMENT SUCCESSFUL!"
    echo ""
    echo -e "${GREEN}📋 Deployment Details:${NC}"
    echo "Function Name: $FUNCTION_NAME"
    echo "Function ARN: $FUNCTION_ARN"
    echo ""
    echo -e "${GREEN}🌐 Stable Endpoints (NEVER CHANGE):${NC}"
    echo "Main URL: $FUNCTION_URL"
    echo "Health Check: ${FUNCTION_URL}health"
    echo "MCP RPC: ${FUNCTION_URL}rpc"
    echo ""
    
    # Save endpoints to file for easy reference
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
Function ARN: $FUNCTION_ARN
AWS Region: $AWS_REGION
AWS Account: $AWS_ACCOUNT
EOF
    
    print_status "Endpoints saved to lambda-endpoints.txt"
    
else
    print_warning "Could not parse CDK outputs. Check AWS Console for deployment details."
fi

# Step 9: Test the deployment
echo -e "${BLUE}Step 9: Testing deployment...${NC}"
if [ ! -z "$FUNCTION_URL" ]; then
    print_status "Testing health endpoint..."
    
    # Test health endpoint
    HEALTH_RESPONSE=$(curl -s -w "%{http_code}" "${FUNCTION_URL}health" -o /tmp/health_response.json)
    if [ "$HEALTH_RESPONSE" = "200" ]; then
        print_status "Health check passed!"
        echo "Response: $(cat /tmp/health_response.json)"
    else
        print_warning "Health check returned status: $HEALTH_RESPONSE"
    fi
    
    # Clean up
    rm -f /tmp/health_response.json
fi

# Step 10: Next steps
echo ""
echo -e "${BLUE}🎯 Next Steps:${NC}"
echo "1. Test MCP tools using the RPC endpoint"
echo "2. Update third-party client configurations with stable URLs"
echo "3. Monitor Lambda function in AWS CloudWatch"
echo "4. Update documentation with new endpoints"
echo ""
echo -e "${GREEN}✅ Lambda deployment completed successfully!${NC}"
echo "Your MCP server now has stable, permanent endpoints! 🎉"

cd "$PROJECT_DIR"