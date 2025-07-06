/**
 * AWS Lambda type definitions for MCP Server
 */

export interface APIGatewayProxyEvent {
  httpMethod: string;
  path: string;
  queryStringParameters: { [name: string]: string } | null;
  headers: { [name: string]: string };
  body: string | null;
  isBase64Encoded: boolean;
  requestContext: {
    requestId: string;
    stage: string;
    httpMethod: string;
    resourcePath: string;
  };
}

export interface APIGatewayProxyResult {
  statusCode: number;
  headers?: { [header: string]: string };
  body: string;
  isBase64Encoded?: boolean;
}

export interface Context {
  callbackWaitsForEmptyEventLoop: boolean;
  functionName: string;
  functionVersion: string;
  invokedFunctionArn: string;
  memoryLimitInMB: string;
  awsRequestId: string;
  logGroupName: string;
  logStreamName: string;
  getRemainingTimeInMillis(): number;
}