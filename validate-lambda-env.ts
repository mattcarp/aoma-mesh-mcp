import { z } from 'zod';
import * as fs from 'fs';

// Lambda MCP required environment schema
const EnvSchema = z.object({
  OPENAI_API_KEY: z.string().min(20, 'OPENAI_API key must be at least 20 characters'),
  AOMA_ASSISTANT_ID: z.string().startsWith('asst_', 'AOMA_ASSISTANT_ID must start with "asst_"'),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20, 'SUPABASE_SERVICE_ROLE_KEY must be at least 20 characters'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20, 'NEXT_PUBLIC_SUPABASE_ANON_KEY must be at least 20 characters'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  MCP_SERVER_VERSION: z.string().default('2.0.0-lambda'),
  MAX_RETRIES: z.coerce.number().int().min(1).max(10).default(3),
  TIMEOUT_MS: z.coerce.number().int().min(5000).max(300000).default(30000),
  // Optional
  OPENAI_VECTOR_STORE_ID: z.string().startsWith('vs_', 'OPENAI_VECTOR_STORE_ID must start with "vs_"').optional(),
});

function parseEnvFile(path: string): Record<string, string> {
  const content = fs.readFileSync(path, 'utf-8');
  return Object.fromEntries(
    content
      .split('\n')
      .filter(line => line.trim() && !line.startsWith('#'))
      .map(line => {
        const [key, ...rest] = line.split('=');
        return [key.trim(), rest.join('=').trim()];
      })
  );
}

function main() {
  const envPath = '.env';
  if (!fs.existsSync(envPath)) {
    console.error('No .env file found in this directory.');
    process.exit(1);
  }
  const envVars = parseEnvFile(envPath);

  try {
    EnvSchema.parse(envVars);
    console.log('✅ .env file is valid for Lambda MCP deployment.');
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ .env validation failed:');
      for (const issue of error.issues) {
        console.error(`- ${issue.path.join('.')}: ${issue.message}`);
      }
    } else {
      console.error('Unknown error:', error);
    }
    process.exit(1);
  }
}

main();