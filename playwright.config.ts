import { defineConfig } from '@playwright/test'
import dotenv from 'dotenv'

// Load local env first if present, then fallback to .env
dotenv.config({ path: '.env.local' })
dotenv.config()

// Fixed test port so Playwright can wait on URL reliably
const TEST_HTTP_PORT = process.env.HTTP_PORT || '3337'
const TEST_BASE_URL = `http://localhost:${TEST_HTTP_PORT}`

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: {
    timeout: 15_000,
  },
  use: {
    baseURL: TEST_BASE_URL,
  },
  webServer: {
    command: 'pnpm run dev',
    url: `${TEST_BASE_URL}/health`,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    env: {
      ...process.env,
      // Ensure server binds to our fixed test port regardless of which var it reads
      PORT: String(TEST_HTTP_PORT),
      HTTP_PORT: String(TEST_HTTP_PORT),
      NODE_ENV: process.env.NODE_ENV || 'test',
      LOG_LEVEL: process.env.LOG_LEVEL || 'error',
    },
  },
})
