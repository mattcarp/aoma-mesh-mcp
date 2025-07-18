import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';

/**
 * AWS CDK Stack for AOMA Mesh MCP Server Lambda Deployment
 */
export class AOMAMeshMCPStack extends cdk.Stack {
  public readonly lambdaFunction: lambda.Function;
  public readonly functionUrl: lambda.FunctionUrl;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Lambda execution role with necessary permissions
    const lambdaRole = new iam.Role(this, 'AOMAMeshMCPLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Execution role for AOMA Mesh MCP Server Lambda',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
      inlinePolicies: {
        SSMParameterAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'ssm:GetParameter',
                'ssm:GetParameters',
                'ssm:GetParametersByPath',
              ],
              resources: [
                `arn:aws:ssm:${this.region}:${this.account}:parameter/mcp-server/*`,
              ],
            }),
          ],
        }),
        CloudWatchLogs: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents',
                'logs:DescribeLogGroups',
                'logs:DescribeLogStreams',
              ],
              resources: [
                `arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/aoma-mesh-mcp-*`,
              ],
            }),
          ],
        }),
      },
    });

    // Lambda function with Web Adapter
    this.lambdaFunction = new lambda.Function(this, 'AOMAMeshMCPFunction', {
      functionName: 'aoma-mesh-mcp-server',
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.X86_64,
      handler: 'lambda-handler.handler',
      code: lambda.Code.fromAsset('../dist'),
      role: lambdaRole,
      timeout: Duration.seconds(30),
      memorySize: 1024,

      environment: {
        NODE_ENV: 'production',
        LOG_LEVEL: 'info',
        MCP_SERVER_VERSION: '2.0.0-lambda',
        MAX_RETRIES: '3',
        TIMEOUT_MS: '30000'
      },
      description: 'AOMA Mesh MCP Server - Lambda deployment with stable Function URLs',
      logRetention: logs.RetentionDays.THIRTY_DAYS,
    });

    // Function URL for stable HTTPS endpoint
    this.functionUrl = new lambda.FunctionUrl(this, 'AOMAMeshMCPFunctionUrl', {
      function: this.lambdaFunction,
      authType: lambda.FunctionUrlAuthType.NONE, // Open for MCP clients
      cors: {
        allowCredentials: false,
        allowedHeaders: ['Content-Type', 'Authorization'],
        allowedMethods: [lambda.HttpMethod.GET, lambda.HttpMethod.POST],
        allowedOrigins: ['*'], // Open for development; restrict in production
        maxAge: Duration.hours(1),
      },
      invokeMode: lambda.InvokeMode.BUFFERED, // Use RESPONSE_STREAM for large responses if needed
    });

    // CloudWatch Log Group with proper retention
    const logGroup = new logs.LogGroup(this, 'AOMAMeshMCPLogGroup', {
      logGroupName: `/aws/lambda/${this.lambdaFunction.functionName}`,
      retention: logs.RetentionDays.THIRTY_DAYS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // CloudWatch Alarms for monitoring
    const errorAlarm = new cloudwatch.Alarm(this, 'AOMAMeshMCPErrorAlarm', {
      metric: this.lambdaFunction.metricErrors({
        period: Duration.minutes(5),
        statistic: 'Sum',
      }),
      threshold: 5,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'AOMA Mesh MCP Server Lambda errors',
    });

    const durationAlarm = new cloudwatch.Alarm(this, 'AOMAMeshMCPDurationAlarm', {
      metric: this.lambdaFunction.metricDuration({
        period: Duration.minutes(5),
        statistic: 'Average',
      }),
      threshold: 25000, // 25 seconds (5 seconds before timeout)
      evaluationPeriods: 3,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'AOMA Mesh MCP Server Lambda high duration',
    });

    // SSM Parameters mapping (environment variable name -> SSM parameter path)
    const ssmParameters = {
      'OPENAI_API_KEY': '/mcp-server/openai-api-key',
      'AOMA_ASSISTANT_ID': '/mcp-server/aoma-assistant-id', 
      'OPENAI_VECTOR_STORE_ID': '/mcp-server/openai-vector-store-id',
      'NEXT_PUBLIC_SUPABASE_URL': '/mcp-server/supabase-url',
      'SUPABASE_SERVICE_ROLE_KEY': '/mcp-server/supabase-service-role-key',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY': '/mcp-server/supabase-anon-key',
    };

    // Add SSM parameter paths as environment variables for runtime lookup
    Object.entries(ssmParameters).forEach(([envVarName, ssmPath]) => {
      // Store the parameter path, not the value (to avoid CloudFormation SecureString issues)
      this.lambdaFunction.addEnvironment(
        `${envVarName}_SSM_PATH`,
        ssmPath
      );
    });

    // Outputs for external reference
    new cdk.CfnOutput(this, 'LambdaFunctionName', {
      value: this.lambdaFunction.functionName,
      description: 'AOMA Mesh MCP Server Lambda Function Name',
      exportName: 'AOMAMeshMCPLambdaFunctionName',
    });

    new cdk.CfnOutput(this, 'LambdaFunctionArn', {
      value: this.lambdaFunction.functionArn,
      description: 'AOMA Mesh MCP Server Lambda Function ARN',
      exportName: 'AOMAMeshMCPLambdaFunctionArn',
    });

    new cdk.CfnOutput(this, 'FunctionUrl', {
      value: this.functionUrl.url,
      description: 'AOMA Mesh MCP Server Stable Function URL',
      exportName: 'AOMAMeshMCPFunctionUrl',
    });

    new cdk.CfnOutput(this, 'HealthCheckUrl', {
      value: `${this.functionUrl.url}health`,
      description: 'AOMA Mesh MCP Server Health Check URL',
      exportName: 'AOMAMeshMCPHealthCheckUrl',
    });

    new cdk.CfnOutput(this, 'MCPEndpointUrl', {
      value: `${this.functionUrl.url}rpc`,
      description: 'AOMA Mesh MCP Server RPC Endpoint URL',
      exportName: 'AOMAMeshMCPEndpointUrl',
    });

    // Tags for resource management
    cdk.Tags.of(this).add('Project', 'MC-TK');
    cdk.Tags.of(this).add('Service', 'MCP-Server');
    cdk.Tags.of(this).add('Environment', 'Production');
    cdk.Tags.of(this).add('DeploymentType', 'Lambda');
    cdk.Tags.of(this).add('Version', '2.0.0-lambda');
  }
}