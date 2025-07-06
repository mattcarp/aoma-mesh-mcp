/**
 * Environment setup and validation utilities
 */

import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

/**
 * Required environment variables for the MCP server
 */
const REQUIRED_ENV_VARS = [
  'OPENAI_API_KEY',
] as const;

/**
 * Optional environment variables with defaults
 */
const OPTIONAL_ENV_VARS = {
  OPENAI_MODEL_NAME: 'gpt-4o',
  NEXT_PUBLIC_SUPABASE_URL: '',
  SUPABASE_SERVICE_ROLE_KEY: '',
  LANGCHAIN_TRACING_V2: 'false',
  LANGCHAIN_API_KEY: '',
} as const;

/**
 * Setup and validate the environment
 */
export async function setupEnvironment(): Promise<void> {
  // Check required environment variables
  const missingVars: string[] = [];
  
  for (const varName of REQUIRED_ENV_VARS) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }

  if (missingVars.length > 0) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      `Missing required environment variables: ${missingVars.join(', ')}`
    );
  }

  // Set defaults for optional variables
  for (const [varName, defaultValue] of Object.entries(OPTIONAL_ENV_VARS)) {
    if (!process.env[varName]) {
      process.env[varName] = defaultValue;
    }
  }

  // Validate OpenAI API key format
  const apiKey = process.env.OPENAI_API_KEY!;
  if (!apiKey.startsWith('sk-')) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      'Invalid OpenAI API key format. Expected key to start with "sk-"'
    );
  }

  console.error('Environment validated successfully');
}

/**
 * Get environment variable with type safety
 */
export function getEnvVar(name: string, defaultValue?: string): string {
  const value = process.env[name];
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new McpError(
      ErrorCode.InvalidRequest,
      `Environment variable ${name} is not set`
    );
  }
  return value;
}

/**
 * Check if we're in development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Check if tracing is enabled
 */
export function isTracingEnabled(): boolean {
  return process.env.LANGCHAIN_TRACING_V2 === 'true';
}