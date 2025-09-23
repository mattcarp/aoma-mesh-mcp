import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

/**
 * Environment Configuration & Validation
 * 
 * Centralized environment variable validation with comprehensive error messages.
 * Supports multiple .env file locations for flexible deployment scenarios.
 */

// Environment validation schema with comprehensive error messages
export const EnvSchema = z.object({
  OPENAI_API_KEY: z.string().min(20, 'OpenAI API key must be at least 20 characters'),
  AOMA_ASSISTANT_ID: z.string().startsWith('asst_', 'Invalid AOMA Assistant ID format'),
  OPENAI_VECTOR_STORE_ID: z.string().startsWith('vs_', 'Invalid Vector Store ID format').optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20, 'Supabase service key required'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20, 'Supabase anonymous key required'),
  JIRA_BASE_URL: z.string().url('Invalid Jira base URL').optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  MCP_SERVER_VERSION: z.string().default('2.7.0'),
  MAX_RETRIES: z.coerce.number().int().min(1).max(10).default(3),
  TIMEOUT_MS: z.coerce.number().int().min(5000).max(300000).default(30000),
  HTTP_PORT: z.coerce.number().int().min(1024).max(65535).default(3333),
  // LangChain/LangSmith configuration
  LANGCHAIN_TRACING_V2: z.string().optional(),
  LANGCHAIN_API_KEY: z.string().optional(),
  LANGCHAIN_PROJECT: z.string().optional(),
  LANGCHAIN_ENDPOINT: z.string().url().optional(),
});

export type Environment = z.infer<typeof EnvSchema>;

/**
 * Find project root by looking for pnpm-workspace.yaml
 */
function findProjectRoot(startDir: string): string {
  let currentDir = startDir;
  while (currentDir !== path.parse(currentDir).root) {
    if (existsSync(path.join(currentDir, 'pnpm-workspace.yaml'))) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }
  
  console.warn("pnpm-workspace.yaml not found. Falling back to relative path for project root. This might be unreliable.");
  return path.resolve(startDir, '../../../');
}

/**
 * Load environment variables from multiple possible locations
 */
function loadEnvironmentFiles(): void {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const projectRoot = findProjectRoot(__dirname);

  // Load .env.local from the project root
  const envLocalPath = path.join(projectRoot, '.env.local');
  if (existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath });
  }

  // Load package-specific .env file
  const packageEnvPath = path.resolve(__dirname, '../../.env'); 
  if (existsSync(packageEnvPath)) {
    dotenv.config({ path: packageEnvPath });
  }
}

/**
 * Validate and load environment configuration with detailed error reporting
 */
export function validateAndLoadEnvironment(): Environment {
  try {
    // Load environment files first
    loadEnvironmentFiles();
    
    // Generate timestamp for version
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    const timestamp = `${year}${month}${day}-${hours}${minutes}${seconds}`;

    // Create versioned environment
    const envVars = { ...process.env };
    const baseVersion = envVars.MCP_SERVER_VERSION || 'unknown';
    envVars.MCP_SERVER_VERSION = `${baseVersion}_${timestamp}`;

    return EnvSchema.parse(envVars);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.issues.map(err =>
        `❌ ${err.path.join('.')}: ${err.message}`
      );
      
      console.error('Environment validation failed:', {
        errors,
        available: Object.keys(process.env).filter(k => 
          k.includes('OPENAI') || k.includes('SUPABASE') || k.includes('AOMA')
        )
      });
      
      throw new Error(`Environment validation failed:\n${errors.join('\n')}\n\nPlease ensure all required environment variables are set.`);
    }
    throw error;
  }
}
