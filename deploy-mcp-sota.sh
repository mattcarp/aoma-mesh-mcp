#!/bin/bash

# 🚀 SOTA MCP Server Deployment to AWS Fargate via Copilot
# Updated for MCP Server 2.0.0_SOTA with NO FALLBACK policy
# Follows AWS best practices from Context7 MCP documentation

set -e

echo "🚀 DEPLOYING AOMA MESH MCP SERVER 2.0.0_SOTA"
echo "=============================================="

# Validate environment
if ! command -v copilot &> /dev/null; then
    echo "❌ AWS Copilot CLI not found. Please install it first:"
    echo "   curl -Lo copilot https://github.com/aws/copilot-cli/releases/latest/download/copilot-linux"
    echo "   chmod +x copilot && sudo mv copilot /usr/local/bin"
    exit 1
fi

if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured. Please run 'aws configure'"
    exit 1
fi

# Set deployment variables
export APP_NAME="mcp-server"
export SERVICE_NAME="orchestrator"
export ENVIRONMENT="prod"
export AWS_REGION="us-east-2"

echo "📋 DEPLOYMENT CONFIGURATION"
echo "   App: $APP_NAME"
echo "   Service: $SERVICE_NAME" 
echo "   Environment: $ENVIRONMENT"
echo "   Region: $AWS_REGION"
echo ""

# Check if this is initial setup or update
if [ ! -f "copilot/.workspace" ]; then
    echo "🏗️  INITIAL SETUP - Creating Copilot application..."
    
    # Initialize Copilot application
    copilot app init "$APP_NAME" --domain "tk.mattcarpenter.com"
    
    # Create environment
    copilot env init --name "$ENVIRONMENT"
    copilot env deploy --name "$ENVIRONMENT"
    
else
    echo "🔄 UPDATE DEPLOYMENT - Using existing Copilot configuration..."
fi

echo "🔐 VALIDATING SSM PARAMETERS..."

# List of required SSM parameters (from memory)
REQUIRED_PARAMS=(
    "/mcp-server/openai-api-key"
    "/mcp-server/aoma-assistant-id"
    "/mcp-server/openai-vector-store-id"
    "/mcp-server/supabase-url"
    "/mcp-server/supabase-service-role-key"
    "/mcp-server/langchain-api-key"
)

# Validate all required parameters exist
for param in "${REQUIRED_PARAMS[@]}"; do
    if aws ssm get-parameter --name "$param" --region "$AWS_REGION" &> /dev/null; then
        echo "   ✅ $param - Found"
    else
        echo "   ❌ $param - Missing"
        echo "      Creating from .env.local..."
        
        # Extract value from .env.local and create parameter
        case "$param" in
            *"openai-api-key")
                value=$(grep OPENAI_API_KEY ../../.env.local | cut -d'=' -f2)
                ;;
            *"aoma-assistant-id")
                value=$(grep AOMA_ASSISTANT_ID ../../.env.local | cut -d'=' -f2)
                ;;
            *"openai-vector-store-id")
                value=$(grep OPENAI_VECTOR_STORE_ID ../../.env.local | cut -d'=' -f2)
                ;;
            *"supabase-url")
                value=$(grep NEXT_PUBLIC_SUPABASE_URL ../../.env.local | cut -d'=' -f2)
                ;;
            *"supabase-service-role-key")
                value=$(grep SUPABASE_SERVICE_ROLE_KEY ../../.env.local | cut -d'=' -f2)
                ;;
            *"langchain-api-key")
                value=$(grep LANGCHAIN_API_KEY ../../.env.local | cut -d'=' -f2)
                ;;
        esac
        
        if [ -n "$value" ]; then
            aws ssm put-parameter \
                --name "$param" \
                --value "$value" \
                --type "SecureString" \
                --region "$AWS_REGION" \
                --overwrite
            echo "      ✅ Created $param"
        else
            echo "      ❌ Could not find value for $param in .env.local"
            exit 1
        fi
    fi
done

echo ""
echo "🏗️  BUILDING AND DEPLOYING..."

# Validate Copilot workspace and application
if [ ! -f "copilot/.workspace" ]; then
    echo "❌ No Copilot workspace found. Run 'copilot app init' first."
    exit 1
fi

# Build and deploy with AWS best practices
echo "   📦 Building Docker image..."
echo "   🚀 Deploying to AWS Fargate..."

copilot svc deploy \
    --name "$SERVICE_NAME" \
    --env "$ENVIRONMENT" \
    --resource-tags Project=AOMA-Mesh,Version=2.0.0_SOTA,Environment=Production,CreatedBy=AWS-Copilot

# Get deployment status
echo ""
echo "📊 DEPLOYMENT STATUS"
copilot svc status --name "$SERVICE_NAME" --env "$ENVIRONMENT"

# Get service endpoint
ENDPOINT=$(copilot svc show --name "$SERVICE_NAME" --env "$ENVIRONMENT" --json | jq -r '.routes[0].url // empty')

if [ -n "$ENDPOINT" ]; then
    echo ""
    echo "🎉 DEPLOYMENT SUCCESSFUL!"
    echo "   MCP Server Endpoint: $ENDPOINT"
    echo "   Health Check: $ENDPOINT/health"
    echo "   JSON-RPC Endpoint: $ENDPOINT/rpc"
    echo ""
    
    # Test the deployment
    echo "🧪 TESTING DEPLOYMENT..."
    
    # Health check
    if curl -f -s "$ENDPOINT/health" > /dev/null; then
        echo "   ✅ Health check passed"
    else
        echo "   ❌ Health check failed"
    fi
    
    # Test MCP RPC endpoint
    if curl -f -s -X POST "$ENDPOINT/rpc" \
        -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","method":"tools/list","id":1}' > /dev/null; then
        echo "   ✅ MCP RPC endpoint responding"
    else
        echo "   ❌ MCP RPC endpoint not responding"
    fi
    
else
    echo "❌ Could not determine service endpoint"
    exit 1
fi

echo ""
echo "📋 NEXT STEPS:"
echo "   1. Update frontend MCP_SERVER_URL to: $ENDPOINT"
echo "   2. Test AOMA queries: 'What is AOMA?'"
echo "   3. Test JIRA search functionality"
echo "   4. Verify NO FALLBACK policy working"
echo ""
echo "🚀 SOTA MCP Server deployment complete!"