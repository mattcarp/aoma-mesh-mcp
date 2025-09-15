import { test, expect } from '@playwright/test'
import { parsePrometheus } from './utils/test-helpers'

const PROM_ENABLED = String(process.env.ENABLE_PROMETHEUS || '').toLowerCase() === 'true'
if (!PROM_ENABLED) {
  test.skip(true, 'Prometheus disabled in environment')
}

test.describe('Prometheus metrics', () => {
  test('GET /metrics/prometheus returns exposition format', async ({ request }) => {
    const res = await request.get('/metrics/prometheus')
    expect(res.status()).toBe(200)
    const contentType = res.headers()['content-type'] || ''
    expect(contentType.includes('text/plain')).toBe(true)
    const text = await res.text()
    expect(text).toContain('# HELP')
    expect(text).toContain('# TYPE')
    const metrics = parsePrometheus(text)
    expect(Object.keys(metrics).length).toBeGreaterThan(0)
  })
})


