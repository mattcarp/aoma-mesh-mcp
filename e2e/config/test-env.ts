import dotenv from 'dotenv'

// Load .env.local first for developer overrides, then .env
dotenv.config({ path: '.env.local' })
dotenv.config()

export type EnvRequirement = {
  key: string
  requiredFor?: Array<'auth' | 'tools' | 'sse' | 'metrics' | 'http' | 'taskmaster'>
  description?: string
}

export const ENVIRONMENT_MATRIX: EnvRequirement[] = [
  { key: 'OPENAI_API_KEY', requiredFor: ['tools', 'auth'] },
  { key: 'AOMA_ASSISTANT_ID', requiredFor: ['tools'] },
  { key: 'NEXT_PUBLIC_SUPABASE_URL', requiredFor: ['http', 'tools'] },
  { key: 'SUPABASE_SERVICE_ROLE_KEY', requiredFor: ['http', 'tools'] },
  { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', requiredFor: ['http', 'tools'] },
  { key: 'ENABLE_PROMETHEUS', requiredFor: ['metrics'] },
  { key: 'ENABLE_SSE_TRANSPORT', requiredFor: ['sse'] },
  { key: 'MCP_SERVER_API_KEY', requiredFor: ['auth', 'tools', 'sse', 'http'] },
]

export function hasEnv(key: string): boolean {
  return !!process.env[key] && String(process.env[key]).trim() !== ''
}

export function missingFor(tag: EnvRequirement['requiredFor'][number]): string[] {
  return ENVIRONMENT_MATRIX.filter((r) => r.requiredFor?.includes(tag)).map((r) => r.key).filter((k) => !hasEnv(k))
}


