import { test, expect } from '@playwright/test'

// Required env vars for a "healthy" server. If missing, skip to avoid false negatives.
const requiredEnvKeys = [
  'OPENAI_API_KEY',
  'AOMA_ASSISTANT_ID',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
]

function getMissingEnvKeys(): string[] {
  return requiredEnvKeys.filter((k) => !process.env[k] || String(process.env[k]).trim() === '')
}

// Ensure we only run when env is configured properly
const missing = getMissingEnvKeys()
if (missing.length) {
  // Top-level skip marks all tests in this file as skipped
  test.skip(true, `Missing required env vars: ${missing.join(', ')}`)
}

// E2E: verify GET /health returns 200 and expected JSON structure
// and that the server reports overall "healthy" when env is correctly configured.
// If you see this fail with 'degraded' or 'unhealthy', verify your .env/.env.local.
// Also ensure the network can reach OpenAI and Supabase from this machine/CI runner.

// Validate shape helper
function isHealthStatus(o: any): o is {
  status: string
  services: {
    openai: { status: boolean; latency?: number; error?: string }
    supabase: { status: boolean; latency?: number; error?: string }
    vectorStore: { status: boolean; error?: string }
  }
  metrics: Record<string, any>
  timestamp: string
} {
  return (
    o &&
    typeof o === 'object' &&
    typeof o.status === 'string' &&
    o.services && typeof o.services === 'object' &&
    'openai' in o.services && 'supabase' in o.services && 'vectorStore' in o.services &&
    typeof o.services.openai?.status === 'boolean' &&
    typeof o.services.supabase?.status === 'boolean' &&
    typeof o.services.vectorStore?.status === 'boolean' &&
    o.metrics && typeof o.metrics === 'object' &&
    typeof o.timestamp === 'string'
  )
}

test.describe('health endpoint', () => {
  test('GET /health returns 200 and healthy JSON', async ({ request }) => {
    const res = await request.get('/health')
    expect(res.status(), 'HTTP status').toBe(200)
    const json = await res.json()
    expect(isHealthStatus(json), 'JSON matches HealthStatus schema').toBe(true)

    // Expect fully healthy when env is correct and services reachable
    expect(json.status).toBe('healthy')

    // Sanity check critical services individually
    expect(json.services.openai.status).toBe(true)
    expect(json.services.supabase.status).toBe(true)

    // Vector store is optional; when configured, it should be healthy too
    if (process.env.OPENAI_VECTOR_STORE_ID) {
      expect(json.services.vectorStore.status).toBe(true)
    }

    // Basic metrics validations
    expect(typeof json.metrics.totalRequests).toBe('number')
    expect(typeof json.metrics.uptime).toBe('number')
    expect(typeof json.metrics.version).toBe('string')
    expect(typeof json.timestamp).toBe('string')
  })
})
