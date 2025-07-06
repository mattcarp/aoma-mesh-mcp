#!/usr/bin/env node
/**
 * AWS CDK App for AOMA Mesh MCP Server Lambda Deployment
 * 
 * Creates stable Lambda Function URLs for production MCP server deployment
 * to replace the dynamic IP ECS Fargate setup.
 * 
 * @version 2.0.0-lambda
 */

import * as cdk from 'aws-cdk-lib';
import { AOMAMeshMCPStack } from './aoma-mesh-mcp-stack.js';

const app = new cdk.App();

// Production deployment stack
new AOMAMeshMCPStack(app, 'AOMAMeshMCPLambdaStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  description: 'AOMA Mesh MCP Server on Lambda with Function URLs (Production)',
  tags: {
    Project: 'MC-TK',
    Service: 'MCP-Server',
    Environment: 'Production',
    DeploymentType: 'Lambda',
    Version: '2.0.0-lambda',
  },
});

app.synth();