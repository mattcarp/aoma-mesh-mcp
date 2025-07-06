#!/bin/bash

# AWS Fargate Deployment Script for MCP Agent Server
# This script automates the deployment of the MCP server to AWS Fargate

set -e  # Exit on any error

# Configuration variables (customize these for your environment)
AWS_REGION="${AWS_REGION:-us-east-1}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-}"
ECR_REPOSITORY_NAME="mcp-agent-server"
CLUSTER_NAME="mcp-cluster"
SERVICE_NAME="mcp-agent-server"
TASK_DEFINITION_FAMILY="mcp-agent-server"
VPC_ID="${VPC_ID:-}"
SUBNET_IDS="${SUBNET_IDS:-}"  # Comma-separated list
SECURITY_GROUP_ID="${SECURITY_GROUP_ID:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install it first."
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        log_error "jq is not installed. Please install it first."
        exit 1
    fi
    
    log_success "All prerequisites are installed"
}

# Get AWS account ID if not provided
get_aws_account_id() {
    if [ -z "$AWS_ACCOUNT_ID" ]; then
        log_info "Getting AWS account ID..."
        AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
        log_info "AWS Account ID: $AWS_ACCOUNT_ID"
    fi
}

# Create ECR repository if it doesn't exist
create_ecr_repository() {
    log_info "Checking if ECR repository exists..."
    
    if ! aws ecr describe-repositories --repository-names $ECR_REPOSITORY_NAME --region $AWS_REGION &> /dev/null; then
        log_info "Creating ECR repository: $ECR_REPOSITORY_NAME"
        aws ecr create-repository \
            --repository-name $ECR_REPOSITORY_NAME \
            --region $AWS_REGION \
            --image-scanning-configuration scanOnPush=true \
            --encryption-configuration encryptionType=AES256
        log_success "ECR repository created"
    else
        log_info "ECR repository already exists"
    fi
}

# Build and push Docker image
build_and_push_image() {
    log_info "Building Docker image..."
    
    # Get ECR login token
    aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
    
    # Build the image
    docker build -t $ECR_REPOSITORY_NAME .
    
    # Tag the image
    docker tag $ECR_REPOSITORY_NAME:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY_NAME:latest
    
    # Push the image
    log_info "Pushing image to ECR..."
    docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY_NAME:latest
    
    log_success "Image pushed to ECR"
}

# Create ECS cluster if it doesn't exist
create_ecs_cluster() {
    log_info "Checking if ECS cluster exists..."
    
    if ! aws ecs describe-clusters --clusters $CLUSTER_NAME --region $AWS_REGION --query 'clusters[0].status' --output text | grep -q ACTIVE; then
        log_info "Creating ECS cluster: $CLUSTER_NAME"
        aws ecs create-cluster \
            --cluster-name $CLUSTER_NAME \
            --capacity-providers FARGATE \
            --default-capacity-provider-strategy capacityProvider=FARGATE,weight=1 \
            --region $AWS_REGION
        log_success "ECS cluster created"
    else
        log_info "ECS cluster already exists"
    fi
}

# Create CloudWatch log group
create_log_group() {
    log_info "Creating CloudWatch log group..."
    
    if ! aws logs describe-log-groups --log-group-name-prefix "/ecs/mcp-agent-server" --region $AWS_REGION --query 'logGroups[0].logGroupName' --output text | grep -q "/ecs/mcp-agent-server"; then
        aws logs create-log-group \
            --log-group-name "/ecs/mcp-agent-server" \
            --region $AWS_REGION
        log_success "CloudWatch log group created"
    else
        log_info "CloudWatch log group already exists"
    fi
}

# Update task definition with current image URI
update_task_definition() {
    log_info "Updating task definition..."
    
    # Replace placeholders in task definition
    sed "s/ACCOUNT_ID/$AWS_ACCOUNT_ID/g; s/REGION/$AWS_REGION/g" aws-fargate-task-definition.json > task-definition-updated.json
    
    # Register the task definition
    aws ecs register-task-definition \
        --cli-input-json file://task-definition-updated.json \
        --region $AWS_REGION
    
    # Clean up temporary file
    rm task-definition-updated.json
    
    log_success "Task definition registered"
}

# Create or update ECS service
create_or_update_service() {
    log_info "Checking if ECS service exists..."
    
    if aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $AWS_REGION --query 'services[0].status' --output text | grep -q ACTIVE; then
        log_info "Updating existing ECS service..."
        aws ecs update-service \
            --cluster $CLUSTER_NAME \
            --service $SERVICE_NAME \
            --task-definition $TASK_DEFINITION_FAMILY \
            --region $AWS_REGION
        log_success "ECS service updated"
    else
        log_info "Creating new ECS service..."
        
        # Check if network configuration is provided
        if [ -z "$VPC_ID" ] || [ -z "$SUBNET_IDS" ] || [ -z "$SECURITY_GROUP_ID" ]; then
            log_error "Network configuration required for new service creation."
            log_error "Please set VPC_ID, SUBNET_IDS, and SECURITY_GROUP_ID environment variables."
            exit 1
        fi
        
        aws ecs create-service \
            --cluster $CLUSTER_NAME \
            --service-name $SERVICE_NAME \
            --task-definition $TASK_DEFINITION_FAMILY \
            --desired-count 1 \
            --launch-type FARGATE \
            --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_IDS],securityGroups=[$SECURITY_GROUP_ID],assignPublicIp=ENABLED}" \
            --region $AWS_REGION
        log_success "ECS service created"
    fi
}

# Wait for service to be stable
wait_for_service() {
    log_info "Waiting for service to become stable..."
    aws ecs wait services-stable \
        --cluster $CLUSTER_NAME \
        --services $SERVICE_NAME \
        --region $AWS_REGION
    log_success "Service is stable"
}

# Get service status
get_service_status() {
    log_info "Getting service status..."
    
    # Get service details
    SERVICE_INFO=$(aws ecs describe-services \
        --cluster $CLUSTER_NAME \
        --services $SERVICE_NAME \
        --region $AWS_REGION \
        --query 'services[0]')
    
    RUNNING_COUNT=$(echo $SERVICE_INFO | jq -r '.runningCount')
    DESIRED_COUNT=$(echo $SERVICE_INFO | jq -r '.desiredCount')
    
    log_info "Service Status:"
    log_info "  Running tasks: $RUNNING_COUNT"
    log_info "  Desired tasks: $DESIRED_COUNT"
    
    # Get task details
    TASK_ARNS=$(aws ecs list-tasks \
        --cluster $CLUSTER_NAME \
        --service-name $SERVICE_NAME \
        --region $AWS_REGION \
        --query 'taskArns' \
        --output text)
    
    if [ ! -z "$TASK_ARNS" ]; then
        log_info "Task details:"
        for TASK_ARN in $TASK_ARNS; do
            TASK_INFO=$(aws ecs describe-tasks \
                --cluster $CLUSTER_NAME \
                --tasks $TASK_ARN \
                --region $AWS_REGION \
                --query 'tasks[0]')
            
            TASK_STATUS=$(echo $TASK_INFO | jq -r '.lastStatus')
            HEALTH_STATUS=$(echo $TASK_INFO | jq -r '.healthStatus // "UNKNOWN"')
            
            log_info "  Task: $(basename $TASK_ARN)"
            log_info "    Status: $TASK_STATUS"
            log_info "    Health: $HEALTH_STATUS"
        done
    fi
}

# Main deployment function
main() {
    log_info "Starting AWS Fargate deployment for MCP Agent Server"
    log_info "Region: $AWS_REGION"
    
    check_prerequisites
    get_aws_account_id
    create_ecr_repository
    build_and_push_image
    create_ecs_cluster
    create_log_group
    update_task_definition
    create_or_update_service
    wait_for_service
    get_service_status
    
    log_success "Deployment completed successfully!"
    log_info "Your MCP Agent Server is now running on AWS Fargate"
    log_info "Monitor your service at: https://console.aws.amazon.com/ecs/home?region=$AWS_REGION#/clusters/$CLUSTER_NAME/services/$SERVICE_NAME/details"
}

# Help function
show_help() {
    echo "AWS Fargate Deployment Script for MCP Agent Server"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Environment Variables:"
    echo "  AWS_REGION          AWS region (default: us-east-1)"
    echo "  AWS_ACCOUNT_ID      AWS account ID (auto-detected if not set)"
    echo "  VPC_ID              VPC ID for new service creation"
    echo "  SUBNET_IDS          Comma-separated subnet IDs"
    echo "  SECURITY_GROUP_ID   Security group ID"
    echo ""
    echo "Options:"
    echo "  -h, --help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  # Basic deployment (will prompt for network config if creating new service)"
    echo "  $0"
    echo ""
    echo "  # Deployment with network configuration"
    echo "  VPC_ID=vpc-12345 SUBNET_IDS=subnet-123,subnet-456 SECURITY_GROUP_ID=sg-789 $0"
    echo ""
    echo "Prerequisites:"
    echo "  - AWS CLI configured with appropriate permissions"
    echo "  - Docker installed and running"
    echo "  - jq installed for JSON processing"
    echo "  - Environment variables configured in AWS Systems Manager Parameter Store"
}

# Parse command line arguments
case "${1:-}" in
    -h|--help)
        show_help
        exit 0
        ;;
    *)
        main
        ;;
esac