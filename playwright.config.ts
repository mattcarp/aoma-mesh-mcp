import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'

// Load local env first if present, then fallback to .env
dotenv.config({ path: '.env.local' })
dotenv.config()

// Fixed test port so Playwright can wait on URL reliably
const TEST_HTTP_PORT = process.env.HTTP_PORT || '3337'
const TEST_BASE_URL = `http://localhost:${TEST_HTTP_PORT}`

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  retries: process.env.CI ? 1 : 0,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  use: { baseURL: TEST_BASE_URL, trace: 'retain-on-failure' },
  reporter: [['list'], ['html', { open: 'never' }]],
  projects: [
    { name: 'health', testDir: 'e2e', testMatch: /health(\.smoke)?\.spec\.ts/ },
    { name: 'auth', testDir: 'e2e', testMatch: /auth\.spec\.ts/ },
    { name: 'http', testDir: 'e2e', testMatch: /http-endpoints\.spec\.ts/ },
    { name: 'tools', testDir: 'e2e', testMatch: /tools\.spec\.ts/ },
    { name: 'sse', testDir: 'e2e', testMatch: /sse-transport\.spec\.ts/ },
    { name: 'metrics', testDir: 'e2e', testMatch: /(metrics|prometheus-metrics)\.spec\.ts/ },
    { name: 'taskmaster', testDir: 'e2e', testMatch: /taskmaster-integration\.spec\.ts/ },
  ],
  webServer: {
    command: 'node -r ts-node/register/transpile-only src/aoma-mesh-server.ts',
    url: `${TEST_BASE_URL}/health`,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
    env: {
      ...process.env,
      PORT: String(TEST_HTTP_PORT),
      HTTP_PORT: String(TEST_HTTP_PORT),
      NODE_ENV: process.env.NODE_ENV || 'test',
      LOG_LEVEL: process.env.LOG_LEVEL || 'error',
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || 'sk-test-e2e',
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'supabase-test-key',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'supabase-anon-test',
      ENABLE_PROMETHEUS: process.env.ENABLE_PROMETHEUS || 'false',
      ENABLE_SSE_TRANSPORT: process.env.ENABLE_SSE_TRANSPORT || 'false',
    },
  },
})
