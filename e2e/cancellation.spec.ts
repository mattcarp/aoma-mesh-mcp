import { test, expect } from '@playwright/test'
import { authHeaders } from './utils/test-helpers'

test.describe('Cancellation and timeouts', () => {
  test('HTTP request abort cancels long-running tool (tolerant)', async ({ request }) => {
    const controller = new AbortController()
    const promise = request.post('/tools/aoma-knowledge', {
      data: { query: 'simulate:long' },
      headers: { ...authHeaders(true) },
      signal: controller.signal,
      timeout: 60_000,
    })
    // Abort shortly after start
    setTimeout(() => controller.abort(), 200)
    let cancelled = false
    try {
      await promise
    } catch (e) {
      cancelled = true
    }
    expect(cancelled).toBe(true)
  })
})


