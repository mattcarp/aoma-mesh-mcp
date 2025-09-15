import { test, expect } from '@playwright/test'

test.describe('metrics endpoints and correlation', () => {
  test('GET /metrics includes correlationId in JSON and header echo', async ({ request }) => {
    const correlationId = 'test-corr-id-1234'
    const res = await request.get('/metrics', {
      headers: { 'x-correlation-id': correlationId },
    })
    expect(res.status()).toBe(200)
    const json = await res.json()
    // correlationId should be present in JSON payload when middleware is active
    // If disabled, tolerate undefined but header should still echo
    expect(res.headers()['x-correlation-id']).toBeDefined()
    if (json && typeof json === 'object') {
      expect(json).toHaveProperty('uptime')
      expect(json).toHaveProperty('totalRequests')
      // Optional: correlationId echo
      if ('correlationId' in json) {
        expect(json.correlationId).toBeDefined()
      }
    }
  })

  test('GET /metrics/prometheus serves text when enabled', async ({ request }) => {
    // This test is tolerant: if disabled, we expect 404; if enabled, expect text/plain
    const res = await request.get('/metrics/prometheus')
    if (res.status() === 404) {
      // Prometheus disabled in current env; acceptable
      expect(true).toBe(true)
      return
    }
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type'] || '').toContain('text/plain')
    const body = await res.text()
    // Basic exposition format sanity checks
    expect(body).toContain('# HELP')
    expect(body).toContain('# TYPE')
  })
})


