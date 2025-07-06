# 🚀 AOMA Mesh MCP Server - Lambda Deployment Guide

**Transform dynamic ECS Fargate to stable Lambda Function URLs**

---

## 🎯 **Migration Overview**

### **Problem with ECS Fargate:**
- ❌ IP address changes on every redeploy
- ❌ Breaks third-party MCP client integrations
- ❌ Complex networking and higher costs
- ❌ Requires manual IP updates in client configs

### **Solution with AWS Lambda:**
- ✅ **Permanent HTTPS URLs that NEVER change**
- ✅ Cost-effective (pay-per-request)
- ✅ Auto-scaling with zero infrastructure management
- ✅ Built-in monitoring and logging
- ✅ Sub-second cold start performance

---

## 📋 **Prerequisites**

### **1. AWS Setup**
```bash
# Install AWS CLI (if not installed)
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure AWS credentials
aws configure
# Enter:
# - AWS Access Key ID
# - AWS Secret Access Key  
# - Default region (e.g., us-east-1)
# - Default output format (json)

# Verify credentials
aws sts get-caller-identity
```

### **2. Node.js and Dependencies**
```bash
# Verify Node.js 20+ is installed
node --version  # Should be v20.x.x or higher

# Install pnpm (if not installed)
npm install -g pnpm

# Install AWS CDK globally
npm install -g aws-cdk

# Verify CDK installation
cdk --version
```

### **3. Existing SSM Parameters**
The following parameters must exist in AWS Systems Manager Parameter Store:
- `/mcp-server/openai-api-key`
- `/mcp-server/aoma-assistant-id`
- `/mcp-server/next-public-supabase-url`
- `/mcp-server/supabase-service-role-key`
- `/mcp-server/next-public-supabase-anon-key`

*These were created during the ECS Fargate deployment and will be reused.*

---

## 🚀 **Deployment Steps**

### **Method 1: Automated Deployment (Recommended)**

```bash
# Navigate to MCP server directory
cd packages/mcp-server

# Run the automated deployment script
./deploy-lambda-sota.sh
```

**The script will:**
1. ✅ Verify AWS CLI and credentials
2. ✅ Check CDK installation and bootstrap
3. ✅ Validate existing SSM parameters
4. ✅ Build TypeScript to JavaScript
5. ✅ Install infrastructure dependencies
6. ✅ Deploy Lambda function with CDK
7. ✅ Create stable Function URLs
8. ✅ Test deployment health
9. ✅ Output stable endpoints

### **Method 2: Manual Step-by-Step**

```bash
# 1. Install dependencies
cd packages/mcp-server
pnpm install

# 2. Build the project
npm run build

# 3. Install infrastructure dependencies
cd infrastructure
npm install

# 4. Bootstrap CDK (first time only)
npx cdk bootstrap

# 5. Deploy the stack
npx cdk deploy --require-approval never

# 6. Get function URL from output
npx cdk list
```

---

## 🌐 **Deployment Outputs**

### **Stable Endpoints (NEVER CHANGE!):**

After successful deployment, you'll receive permanent URLs:

```
🎉 DEPLOYMENT SUCCESSFUL!

📋 Deployment Details:
Function Name: aoma-mesh-mcp-server
Function ARN: arn:aws:lambda:us-east-1:123456789:function:aoma-mesh-mcp-server

🌐 Stable Endpoints (NEVER CHANGE):
Main URL: https://abc123def456.lambda-url.us-east-1.on.aws/
Health Check: https://abc123def456.lambda-url.us-east-1.on.aws/health
MCP RPC: https://abc123def456.lambda-url.us-east-1.on.aws/rpc
```

### **Endpoint Reference:**

| Endpoint | Purpose | Example URL |
|----------|---------|-------------|
| **Main URL** | Function root | `https://abc123.lambda-url.us-east-1.on.aws/` |
| **Health Check** | Service health status | `https://abc123.lambda-url.us-east-1.on.aws/health` |
| **MCP RPC** | JSON-RPC API calls | `https://abc123.lambda-url.us-east-1.on.aws/rpc` |
| **Direct Tools** | Tool-specific endpoints | `https://abc123.lambda-url.us-east-1.on.aws/tools/{toolName}` |
| **Metrics** | Performance metrics | `https://abc123.lambda-url.us-east-1.on.aws/metrics` |

---

## 🧪 **Testing Deployment**

### **1. Health Check Test**
```bash
curl https://your-function-url.lambda-url.us-east-1.on.aws/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "services": {
    "openai": { "status": true, "latency": 156 },
    "supabase": { "status": true, "latency": 89 },
    "vectorStore": { "status": true, "latency": 203 }
  },
  "metrics": {
    "uptime": 45000,
    "totalRequests": 1,
    "successfulRequests": 1,
    "version": "2.0.0-lambda"
  }
}
```

### **2. MCP Tool Test**
```bash
curl -X POST https://your-function-url.lambda-url.us-east-1.on.aws/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "query_aoma_knowledge",
      "arguments": {
        "query": "What is AOMA?",
        "strategy": "focused"
      }
    }
  }'
```

### **3. Performance Test**
```bash
# Test cold start (first request)
time curl https://your-function-url.lambda-url.us-east-1.on.aws/health

# Test warm request (subsequent requests)
time curl https://your-function-url.lambda-url.us-east-1.on.aws/health
```

---

## 📊 **Performance Characteristics**

### **Cold Start Performance:**
- **Duration:** ~200ms (Node.js 20 runtime)
- **Memory:** 1024MB allocated
- **Timeout:** 30 seconds maximum
- **Concurrency:** 10 concurrent executions

### **Warm Request Performance:**
- **Duration:** ~5ms overhead + actual processing time
- **Typical MCP Query:** 2-8 seconds total (depending on complexity)
- **Health Check:** <100ms response time

### **Cost Analysis:**
- **Requests:** $0.0000002 per request
- **Duration:** $0.0000166667 per GB-second
- **Example:** 1,000 requests/month ≈ $0.50/month vs ECS Fargate $30+/month

---

## 🔧 **Configuration**

### **Environment Variables (Set via SSM):**
- `OPENAI_API_KEY` - OpenAI API access key
- `AOMA_ASSISTANT_ID` - AOMA assistant identifier  
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key

### **Lambda Configuration:**
- **Runtime:** Node.js 20.x
- **Architecture:** x86_64
- **Memory:** 1,024 MB
- **Timeout:** 30 seconds
- **Reserved Concurrency:** 10
- **Log Retention:** 30 days

---

## 📈 **Monitoring**

### **CloudWatch Metrics:**
- **Duration** - Function execution time
- **Errors** - Error count and rate
- **Invocations** - Total function calls
- **Throttles** - Concurrency throttling events

### **CloudWatch Alarms:**
- **Error Rate** - Triggers at >5 errors in 5 minutes
- **High Duration** - Triggers at >25 seconds average
- **Failed Invocations** - Immediate notification

### **Custom Metrics:**
- **MCP Request Count** - Total MCP API calls
- **Tool Usage** - Individual tool call statistics
- **Success Rate** - Successful vs failed requests
- **Response Times** - Per-tool performance metrics

---

## 🔄 **Updates and Maintenance**

### **Code Updates:**
```bash
# Make code changes, then redeploy
./deploy-lambda-sota.sh

# Or manual update
npm run build
cd infrastructure
npx cdk deploy
```

### **Environment Variable Updates:**
```bash
# Update SSM parameter
aws ssm put-parameter \
  --name "/mcp-server/openai-api-key" \
  --value "new-api-key" \
  --type "SecureString" \
  --overwrite

# Restart function (optional - will pick up on next cold start)
aws lambda update-function-code \
  --function-name aoma-mesh-mcp-server \
  --zip-file fileb://lambda-deployment.zip
```

### **Monitoring and Debugging:**
```bash
# View recent logs
aws logs tail /aws/lambda/aoma-mesh-mcp-server --follow

# Check function configuration
aws lambda get-function --function-name aoma-mesh-mcp-server

# View CloudWatch metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=aoma-mesh-mcp-server \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Average
```

---

## 🚨 **Troubleshooting**

### **Common Issues:**

#### **1. CDK Bootstrap Error**
```bash
# Error: "This stack uses assets, so the toolkit stack must be deployed"
npx cdk bootstrap aws://ACCOUNT-ID/REGION
```

#### **2. SSM Parameter Not Found**
```bash
# Error: "Parameter /mcp-server/xxx not found"
# Create missing parameter:
aws ssm put-parameter \
  --name "/mcp-server/parameter-name" \
  --value "parameter-value" \
  --type "SecureString"
```

#### **3. Lambda Function Cold Start Timeout**
```bash
# Check function logs:
aws logs tail /aws/lambda/aoma-mesh-mcp-server --since 1h

# Increase timeout if needed (in CDK stack):
timeout: Duration.seconds(60)
```

#### **4. CORS Issues**
```bash
# Verify CORS configuration in CDK stack
# Or test with curl:
curl -X OPTIONS https://your-function-url/rpc \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type"
```

#### **5. High Error Rate**
```bash
# Check CloudWatch error logs:
aws logs filter-log-events \
  --log-group-name /aws/lambda/aoma-mesh-mcp-server \
  --filter-pattern "ERROR"

# Common fixes:
# - Check SSM parameter values
# - Verify OpenAI API key validity
# - Test Supabase connection
```

---

## 🔐 **Security**

### **IAM Permissions:**
- ✅ Minimal permissions (SSM read-only, CloudWatch logs)
- ✅ No public S3 buckets or databases
- ✅ Encrypted environment variables via SSM
- ✅ VPC deployment optional (not required for this use case)

### **Function URL Security:**
- ⚠️ Currently set to public access (no authentication)
- 🔒 Consider adding custom authentication for production
- 🌐 CORS configured for specific headers and methods
- 📝 All requests logged to CloudWatch

### **Best Practices:**
- 🔄 Rotate API keys regularly
- 📊 Monitor usage patterns for anomalies  
- 🚨 Set up CloudWatch alarms for unusual activity
- 🔒 Consider API Gateway + Lambda for additional security layers

---

## 📚 **Additional Resources**

- [AWS Lambda Function URLs Documentation](https://docs.aws.amazon.com/lambda/latest/dg/lambda-urls.html)
- [AWS CDK TypeScript Reference](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda-readme.html)
- [Model Context Protocol Specification](https://spec.modelcontextprotocol.io/)
- [CloudWatch Lambda Monitoring](https://docs.aws.amazon.com/lambda/latest/dg/monitoring-functions.html)

---

## 🎉 **Migration Complete!**

Your AOMA Mesh MCP Server now runs on AWS Lambda with:
- ✅ **Stable, permanent HTTPS endpoints**
- ✅ **Cost-effective serverless architecture**  
- ✅ **Built-in monitoring and logging**
- ✅ **Auto-scaling performance**
- ✅ **Zero infrastructure management**

**The IP address problem is solved forever!** 🚀