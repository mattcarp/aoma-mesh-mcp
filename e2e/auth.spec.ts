import { test, expect } from '@playwright/test'
import { authHeaders, createCorrelationId, expectSecurityHeaders } from './utils/test-helpers'
import { missingFor } from './config/test-env'

const REQUIRED = ['auth' as const]
const missing = missingFor('auth')
if (missing.length) {
  test.skip(true, `Missing required env for auth tests: ${missing.join(', ')}`)
}

test.describe('authentication and security', () => {
  test('protects sensitive endpoints with API key', async ({ request }) => {
    const correlationId = createCorrelationId()

    // Without key → expect 401/403
    const unauth = await request.post('/rpc', { data: { method: 'ping' }, headers: { 'x-correlation-id': correlationId } })
    expect([401, 403]).toContain(unauth.status())

    // With invalid key → expect 401/403
    const invalid = await request.post('/rpc', { data: { method: 'ping' }, headers: { ...authHeaders(false), 'x-correlation-id': correlationId } })
    expect([401, 403]).toContain(invalid.status())

    // With valid key → expect 200 or method error JSON
    const valid = await request.post('/rpc', { data: { method: 'ping' }, headers: { ...authHeaders(true), 'x-correlation-id': correlationId } })
    expect([200, 400, 422]).toContain(valid.status())
    expect(valid.headers()['x-correlation-id']).toBeDefined()
    expectSecurityHeaders(valid.headers())
  })

  test('CORS preflight responds with appropriate headers', async ({ request }) => {
    const origin = process.env.E2E_TEST_ORIGIN || 'https://example.com'
    const res = await request.fetch('/rpc', {
      method: 'OPTIONS',
      headers: {
        'access-control-request-method': 'POST',
        origin,
      },
    })
    expect([200, 204]).toContain(res.status())
    const allowOrigin = res.headers()['access-control-allow-origin']
    // If CORS is configured with a whitelist, expect the origin echoed; else, '*' is acceptable
    if (allowOrigin) {
      expect(['*', origin]).toContain(allowOrigin)
    }
  })

  test('helmet headers applied when enabled', async ({ request }) => {
    const res = await request.get('/health', { headers: { ...authHeaders(true), 'x-correlation-id': createCorrelationId() } })
    expect(res.status()).toBe(200)
    expectSecurityHeaders(res.headers())
  })

  test('rate limiting behavior under burst load (tolerant)', async ({ request }) => {
    // Only assert when rate limit is enabled
    if (String(process.env.ENABLE_RATE_LIMIT || '').toLowerCase() !== 'true') {
      test.skip(true, 'Rate limit disabled in environment')
    }
    const headers = { ...authHeaders(true) }
    let limited = false
    for (let i = 0; i < 50; i++) {
      const res = await request.get('/health', { headers })
      if (res.status() === 429) {
        limited = true
        break
      }
    }
    expect(limited).toBe(true)
  })

  test('SSE endpoint requires auth when enabled', async ({ request }) => {
    if (String(process.env.ENABLE_SSE_TRANSPORT || '').toLowerCase() !== 'true') {
      test.skip(true, 'SSE transport disabled')
    }
    
    const controller1 = new AbortController()
    const controller2 = new AbortController()
    
    try {
      const noKey = await request.get('/mcp/sse', {
        headers: { accept: 'text/event-stream' }
      })
      expect([401, 403]).toContain(noKey.status())

      const ok = await request.get('/mcp/sse', { 
        headers: { ...authHeaders(true), accept: 'text/event-stream' }
      })
      // SSE may stream; we just validate it is not immediately unauthorized
      expect([200, 204]).toContain(ok.status())
    } finally {
      controller1.abort()
      controller2.abort()
    }
  })
})


