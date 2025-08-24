import { test, expect } from '@playwright/test'

// Smoke test: server is up and /health responds with 200 and minimal JSON shape.
// This does not assert full "healthy" status, only that the endpoint is reachable
// and returns a well-formed payload.

test.describe('smoke: health endpoint', () => {
  test('GET /health returns 200 and minimal shape', async ({ request }) => {
    const res = await request.get('/health')
    expect(res.status(), 'HTTP status').toBe(200)

    const json = await res.json()
    expect(typeof json).toBe('object')
    expect(typeof json.status).toBe('string')
    expect(typeof json.timestamp).toBe('string')

    // Optional fields we expect to exist but not assert contents strictly
    expect(json).toHaveProperty('metrics')
    expect(json).toHaveProperty('services')
  })
})
