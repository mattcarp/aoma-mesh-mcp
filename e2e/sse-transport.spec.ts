import { test, expect } from '@playwright/test'
import { authHeaders, createCorrelationId } from './utils/test-helpers'
import { missingFor } from './config/test-env'

const SSE_ENABLED = String(process.env.ENABLE_SSE_TRANSPORT || '').toLowerCase() === 'true'
if (!SSE_ENABLED) {
  test.skip(true, 'SSE transport disabled in environment')
}

const missing = missingFor('sse')
if (missing.length) {
  test.skip(true, `Missing required env for SSE tests: ${missing.join(', ')}`)
}

test.describe('SSE MCP transport', () => {
  test('connects to /mcp/sse with auth and receives stream headers', async ({ request }) => {
    const controller = new AbortController()
    const auth = authHeaders(true)
    const hasAuth = Object.keys(auth).length > 0
    
    try {
      const res = await request.get('/mcp/sse', {
        headers: { ...auth, 'x-correlation-id': createCorrelationId(), accept: 'text/event-stream' },
        timeout: 10_000,
      })
      
      const expectedStatuses = hasAuth ? [200, 204] : [200, 204, 401, 403]
      expect(expectedStatuses).toContain(res.status())
      
      if (res.status() === 200 || res.status() === 204) {
        const ct = res.headers()['content-type'] || ''
        expect(ct.includes('text/event-stream')).toBe(true)
      }
    } finally {
      controller.abort()
    }
  })
})


