# 📖 AWS Copilot Official Documentation Guide
## Based on AWS Labs MCP, AWS CLI, and Terraform ECS Best Practices

---

## 🎯 **OVERVIEW**

This guide consolidates **official AWS documentation** and **best practices** for deploying containerized applications using AWS Copilot CLI, specifically for MCP (Model Context Protocol) servers on AWS Fargate.

**Sources:**
- ✅ **AWS Labs MCP Servers** - `/awslabs/mcp` (Official AWS implementation)
- ✅ **AWS CLI Documentation** - `/aws/aws-cli` (Official AWS CLI)
- ✅ **Terraform AWS ECS** - `/terraform-aws-modules/terraform-aws-ecs` (Community standard)

---

## 🏗️ **AWS COPILOT ARCHITECTURE**

### **What is AWS Copilot?**
AWS Copilot is an open-source command line interface that makes it easy to build, release, and operate production-ready containerized applications on AWS App Runner, Amazon ECS, and AWS Fargate.

### **Core Concepts**
```bash
# Application: Top-level container for all services
copilot app init myapp

# Environment: Deployment target (dev, staging, prod)
copilot env init --name production

# Service: Your containerized application
copilot svc init --name api --svc-type "Backend Service"
```

### **Service Types**
- **Load Balanced Web Service** - Public HTTP/HTTPS endpoints
- **Backend Service** - Internal services (perfect for MCP servers)
- **Request-Driven Web Service** - AWS App Runner integration
- **Static Site** - S3 + CloudFront static hosting

---

## 📋 **MANIFEST CONFIGURATION DEEP DIVE**

### **Basic Structure (Based on AWS Documentation)**
```yaml
# Service identification
name: orchestrator
type: Backend Service

# Container configuration
image:
  build: './Dockerfile'

# Resource allocation
cpu: 1024      # CPU units (1024 = 1 vCPU)
memory: 2048   # Memory in MiB

# Auto-scaling configuration
count:
  min: 1         # Minimum instances
  max: 4         # Maximum instances
  target_cpu: 60 # Scale when CPU > 60%
  
# Environment variables
variables:
  NODE_ENV: production
  PORT: 3333

# Secrets from SSM Parameter Store
secrets:
  API_KEY: /myapp/api-key
```

### **Advanced Networking (From AWS ECS Best Practices)**
```yaml
# Network configuration for Fargate
network:
  vpc:
    enable_logs: true
    # Security: Use private subnets only
    placement: 'private'
    # Allow ingress only from VPC
    ingress:
      from_vpc: true

# Health check configuration
http:
  path: '/health'
  healthcheck:
    path: '/health'
    interval: 30s     # How often to check
    timeout: 5s       # Timeout per check
    retries: 3        # Retries before unhealthy
    start_period: 10s # Grace period for startup
```

### **Production Scaling (AWS Fargate Best Practices)**
```yaml
count:
  min: 2               # HA requires minimum 2 instances
  max: 10              # Scale for high demand
  cooldown:
    scale_out_cooldown: 30s   # Fast scale-out
    scale_in_cooldown: 300s   # Slow scale-in (avoid thrashing)
  target_cpu: 60            # Conservative CPU target
  target_memory: 70         # Conservative memory target

# Fargate platform version
platform_version: "1.4.0"  # Latest Fargate features
```

---

## 🔐 **SECRETS MANAGEMENT**

### **SSM Parameter Store (AWS Recommended)**
```bash
# Create secure parameters
aws ssm put-parameter \
  --name "/myapp/api-key" \
  --value "your-secret-value" \
  --type "SecureString" \
  --description "API key for myapp"

# Reference in manifest.yml
secrets:
  API_KEY: /myapp/api-key
  DB_PASSWORD: /myapp/database/password
```

### **Environment-Specific Secrets**
```yaml
# Development environment
environments:
  development:
    secrets:
      API_KEY: /myapp/dev/api-key
      
  # Production environment  
  production:
    secrets:
      API_KEY: /myapp/prod/api-key
```

---

## 🛡️ **SECURITY BEST PRACTICES**

### **Task Role Configuration (From AWS Labs MCP)**
```yaml
# Allow Copilot to create appropriate IAM role
task_role: ""  # Copilot creates role automatically

# Enable ECS Exec for debugging (secure shell access)
exec: true
```

### **Container Security**
```dockerfile
# Use official base images
FROM node:20-alpine

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Use non-root user
USER nextjs

# Read-only filesystem (security hardening)
readonly_root_filesystem: true
```

### **Network Security (AWS VPC Best Practices)**
```yaml
network:
  vpc:
    placement: 'private'    # No direct internet access
    ingress:
      from_vpc: true       # Only VPC traffic allowed
```

---

## 📊 **MONITORING & OBSERVABILITY**

### **CloudWatch Logging (AWS Standard)**
```yaml
logging:
  enable_metadata: true    # Include ECS metadata
  config:
    awslogs-create-group: "true"
    awslogs-stream-prefix: "myapp"
    awslogs-region: "us-east-1"
```

### **Container Insights (AWS Recommendation)**
```yaml
# Enable Container Insights for advanced metrics
environments:
  production:
    enable_container_insights: true
```

### **Health Check Best Practices**
```yaml
http:
  healthcheck:
    path: '/health'
    interval: 30s          # Frequent enough to detect issues
    timeout: 5s            # Should be less than interval
    retries: 3             # Conservative retry count
    start_period: 10s      # Grace period for app startup
    success_codes: '200'   # Only 200 is healthy
```

---

## ⚡ **PERFORMANCE OPTIMIZATION**

### **Resource Allocation (AWS Fargate Sizing)**
```yaml
# Right-sizing based on workload
cpu: 1024     # Start with 1 vCPU
memory: 2048  # 2GB minimum for Node.js apps

# For high-throughput applications
cpu: 2048     # 2 vCPU
memory: 4096  # 4GB for better performance
```

### **Auto Scaling Configuration**
```yaml
count:
  # Target utilization recommendations:
  target_cpu: 60      # 60% CPU utilization
  target_memory: 70   # 70% memory utilization
  
  # Scaling behavior
  cooldown:
    scale_out_cooldown: 30s    # Responsive scaling up
    scale_in_cooldown: 300s    # Conservative scaling down
```

### **Environment Variables for Performance**
```yaml
variables:
  # Node.js optimizations
  NODE_OPTIONS: "--max-old-space-size=1536 --optimize-for-size"
  UV_THREADPOOL_SIZE: 16
  
  # Application-specific tuning
  CACHE_TTL: 300000
  CONNECTION_POOL_SIZE: 10
```

---

## 🚀 **DEPLOYMENT PATTERNS**

### **Blue-Green Deployment (AWS Copilot Default)**
```bash
# Deploy new version
copilot svc deploy --name myservice --env production

# Copilot automatically:
# 1. Creates new task definition
# 2. Starts new tasks
# 3. Waits for health checks
# 4. Updates load balancer
# 5. Drains old tasks
```

### **Rolling Updates Configuration**
```yaml
# Control deployment behavior
count:
  min: 2  # Always maintain minimum capacity

# AWS automatically ensures:
# - Zero downtime deployments
# - Health check validation
# - Automatic rollback on failures
```

### **Environment Promotion**
```bash
# Deploy to development first
copilot svc deploy --name myservice --env development

# Test and validate
copilot svc logs --name myservice --env development --follow

# Promote to production
copilot svc deploy --name myservice --env production
```

---

## 🔄 **CI/CD INTEGRATION**

### **GitHub Actions with Copilot**
```yaml
name: Deploy to AWS
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
          
      - name: Install Copilot
        run: |
          curl -Lo copilot https://github.com/aws/copilot-cli/releases/latest/download/copilot-linux
          chmod +x copilot && sudo mv copilot /usr/local/bin
          
      - name: Deploy service
        run: copilot svc deploy --name myservice --env production
```

### **AWS CodePipeline Integration**
```bash
# Initialize pipeline
copilot pipeline init

# Deploy pipeline
copilot pipeline update
```

---

## 🧪 **TESTING STRATEGIES**

### **Local Testing**
```bash
# Build and test locally
docker build -t myapp .
docker run -p 3000:3000 myapp

# Test health endpoint
curl http://localhost:3000/health
```

### **Integration Testing**
```bash
# Deploy to development environment
copilot svc deploy --name myservice --env development

# Run integration tests
npm run test:integration

# Check service logs
copilot svc logs --name myservice --env development
```

### **Load Testing (AWS Recommendations)**
```bash
# Use AWS Load Testing solution
# Or tools like Artillery, k6, Apache Bench

# Monitor during load test
copilot svc logs --name myservice --env production --follow
```

---

## 🚨 **TROUBLESHOOTING GUIDE**

### **Common Issues & Solutions**

**1. Service Not Starting**
```bash
# Check service status
copilot svc status --name myservice --env production

# View detailed logs
copilot svc logs --name myservice --env production

# Check task definition
aws ecs describe-task-definition --task-definition myapp-production-myservice
```

**2. Health Check Failures**
```bash
# Test health endpoint directly
curl https://your-service-url/health

# Check container logs for errors
copilot svc logs --name myservice --env production --start-time 5m
```

**3. Auto Scaling Issues**
```bash
# Check CloudWatch metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=myservice
```

**4. Permission Issues**
```bash
# Check task role permissions
aws iam get-role --role-name task-myapp-production-myservice-TaskRole

# View CloudTrail for access denied errors
aws logs filter-log-events \
  --log-group-name /aws/cloudtrail \
  --filter-pattern "ERROR Denied"
```

---

## 📚 **OFFICIAL DOCUMENTATION LINKS**

### **Primary Resources**
- **AWS Copilot CLI:** https://aws.github.io/copilot-cli/
- **AWS Fargate:** https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate.html
- **Amazon ECS:** https://docs.aws.amazon.com/AmazonECS/latest/developerguide/

### **Best Practices Guides**
- **ECS Best Practices:** https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/
- **Fargate Best Practices:** https://aws.amazon.com/blogs/containers/
- **AWS Well-Architected:** https://aws.amazon.com/architecture/well-architected/

### **Security Resources**
- **ECS Security:** https://docs.aws.amazon.com/AmazonECS/latest/developerguide/security.html
- **IAM Best Practices:** https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html

---

## 🎯 **QUICK REFERENCE COMMANDS**

### **Essential Copilot Commands**
```bash
# Application lifecycle
copilot app init myapp
copilot app ls
copilot app delete myapp

# Environment management
copilot env init --name production
copilot env deploy --name production
copilot env status --name production

# Service management
copilot svc init --name api --svc-type "Backend Service"
copilot svc deploy --name api --env production
copilot svc status --name api --env production
copilot svc logs --name api --env production --follow

# Pipeline management
copilot pipeline init
copilot pipeline update
copilot pipeline status
```

### **AWS CLI Helpers**
```bash
# View ECS services
aws ecs list-services --cluster myapp-production-Cluster

# Check task health
aws ecs describe-services --cluster myapp-production-Cluster --services myservice

# View CloudWatch logs
aws logs describe-log-groups --log-group-name-prefix "/copilot/myapp"
```

---

## 💡 **KEY TAKEAWAYS**

### **✅ DO:**
- Use Backend Service type for internal APIs
- Configure health checks with appropriate timeouts
- Use private subnets for enhanced security
- Enable Container Insights for monitoring
- Follow principle of least privilege for IAM roles
- Use SSM Parameter Store for secrets
- Test in development before production deployment

### **❌ DON'T:**
- Hardcode secrets in environment variables
- Skip health check configuration
- Use excessive CPU/memory allocations
- Deploy directly to production without testing
- Ignore CloudWatch logs and metrics
- Set aggressive auto-scaling targets
- Expose services publicly without load balancer

---

**🎉 You now have the complete AWS Copilot deployment guide based on official AWS documentation!**

This guide follows AWS best practices and is based on real implementations from AWS Labs MCP servers, ensuring production-ready deployments.