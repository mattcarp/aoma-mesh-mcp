# AWS Copilot Deployment Guide

This guide shows how to deploy the MCP server to AWS using AWS Copilot CLI - a much simpler alternative to manual Fargate configuration.

## Prerequisites

1. **AWS CLI configured** with appropriate permissions
2. **Docker** installed and running
3. **AWS Copilot CLI** installed

### Install AWS Copilot

```bash
# macOS
curl -Lo copilot https://github.com/aws/copilot-cli/releases/latest/download/copilot-darwin
chmod +x copilot && sudo mv copilot /usr/local/bin

# Linux
curl -Lo copilot https://github.com/aws/copilot-cli/releases/latest/download/copilot-linux
chmod +x copilot && sudo mv copilot /usr/local/bin

# Windows
curl -Lo copilot.exe https://github.com/aws/copilot-cli/releases/latest/download/copilot-windows.exe
```

## Quick Deployment

### 1. Initialize Copilot Application

```bash
cd packages/mcp-server
copilot app init mcp-server
```

### 2. Initialize Service

```bash
copilot svc init --name orchestrator --svc-type "Backend Service"
```

This creates the `copilot/orchestrator/manifest.yml` file with our configuration.

### 3. Set Up Secrets

Configure your environment variables as AWS Secrets Manager secrets:

```bash
# Required secrets
copilot secret init --name OPENAI_API_KEY
copilot secret init --name AOMA_ASSISTANT_ID
copilot secret init --name OPENAI_VECTOR_STORE_ID

# Optional Supabase secrets
copilot secret init --name NEXT_PUBLIC_SUPABASE_URL
copilot secret init --name SUPABASE_SERVICE_ROLE_KEY

# Optional LangChain secrets
copilot secret init --name LANGCHAIN_API_KEY
```

### 4. Deploy Environment

```bash
copilot env deploy --name prod
```

### 5. Deploy Service

```bash
copilot svc deploy --name orchestrator --env prod
```

## Configuration Details

### Service Manifest (`copilot/orchestrator/manifest.yml`)

The manifest configures:

- **Resource Allocation**: 512 CPU units, 1024 MB memory (scales to 1024 CPU, 2048 MB in production)
- **Auto-scaling**: 0-2 instances (0-4 in production) based on CPU/memory usage
- **Health Check**: `/health` endpoint
- **Environment Variables**: Production settings
- **Secrets**: Secure environment variable management

### Environment-Specific Settings

- **Development**: Minimal resources, can scale to 0
- **Production**: Higher resources, always maintains 1+ instance

## Monitoring & Management

### View Service Status

```bash
copilot svc show --name orchestrator
```

### View Logs

```bash
copilot svc logs --name orchestrator --env prod --follow
```

### Get Service URL

```bash
copilot svc show --name orchestrator --env prod
```

### Scale Service

Edit `copilot/orchestrator/manifest.yml` and redeploy:

```yaml
count:
  min: 1
  max: 5
  target_cpu: 60
  target_memory: 70
```

Then run:

```bash
copilot svc deploy --name orchestrator --env prod
```

## Cleanup

### Delete Service

```bash
copilot svc delete --name orchestrator --env prod
```

### Delete Environment

```bash
copilot env delete --name prod
```

### Delete Application

```bash
copilot app delete mcp-server
```

## Advantages of Copilot

1. **Simplified Configuration**: No need to manually configure ECS, ALB, VPC, etc.
2. **Built-in Best Practices**: Security, networking, and monitoring configured automatically
3. **Environment Management**: Easy staging/production environment separation
4. **Secrets Management**: Integrated AWS Secrets Manager support
5. **Auto-scaling**: Built-in CPU/memory-based scaling
6. **Logging**: CloudWatch integration out of the box
7. **Easy Updates**: Simple redeployment process

## Troubleshooting

### Check Service Health

```bash
copilot svc status --name orchestrator --env prod
```

### View CloudWatch Logs

```bash
copilot svc logs --name orchestrator --env prod --since 1h
```

### Debug Deployment Issues

```bash
copilot svc show --name orchestrator --env prod --resources
```

### Update Secrets

```bash
copilot secret init --name OPENAI_API_KEY --overwrite
```

## Cost Optimization

- **Development**: Set `min: 0` to scale to zero when not in use
- **Production**: Use appropriate CPU/memory limits based on actual usage
- **Monitoring**: Use CloudWatch metrics to optimize resource allocation

## Security Features

- **VPC Isolation**: Service runs in private subnets
- **Secrets Management**: Environment variables stored securely in AWS Secrets Manager
- **IAM Roles**: Least-privilege access automatically configured
- **HTTPS**: Load balancer with SSL termination
- **Security Groups**: Restrictive network access rules

*Voilà!* Your MCP server is now deployed with enterprise-grade infrastructure using just a few simple commands.